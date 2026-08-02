-- CONN-08: expiring project-scoped Connect tokens and observable usage.
-- Run after schema_086_dist03_runner_version_compatibility.sql.

alter table api_tokens add column if not exists expires_at timestamptz;
alter table api_tokens add column if not exists last_used_at timestamptz;

update api_tokens
set expires_at = created_at + interval '30 days'
where expires_at is null;

alter table api_tokens alter column expires_at set default (now() + interval '30 days');
alter table api_tokens alter column expires_at set not null;
alter table api_tokens drop constraint if exists api_tokens_expiry_after_creation;
alter table api_tokens add constraint api_tokens_expiry_after_creation check (expires_at > created_at);

create or replace function create_api_token(p_project_id uuid, p_name text, p_scopes text[] default array['read:project']::text[])
returns jsonb as $$
declare v_token text; v_id uuid; v_prefix text; v_expires_at timestamptz := now() + interval '30 days';
begin
  if not is_project_manager(p_project_id) then raise exception 'forbidden'; end if;
  if p_name is null or char_length(trim(p_name)) = 0 then raise exception 'token name is required'; end if;
  if p_scopes is null or cardinality(p_scopes) = 0 then raise exception 'at least one scope is required'; end if;
  v_token := 'tm_' || encode(gen_random_bytes(32), 'hex');
  v_prefix := left(v_token, 12);
  insert into api_tokens(project_id, name, token_prefix, token_hash, scopes, expires_at, created_by)
  values (p_project_id, trim(p_name), v_prefix, encode(extensions.digest(v_token, 'sha256'), 'hex'), p_scopes, v_expires_at, auth.uid())
  returning id into v_id;
  perform integration_audit('token_created', p_project_id, v_id,
    jsonb_build_object('name', trim(p_name), 'prefix', v_prefix, 'scopes', p_scopes, 'expires_at', v_expires_at));
  return jsonb_build_object('id', v_id, 'name', trim(p_name), 'token', v_token,
    'token_prefix', v_prefix, 'scopes', p_scopes, 'expires_at', v_expires_at,
    'last_used_at', null, 'created_at', now());
end;
$$ language plpgsql security definer set search_path = public, extensions;

create or replace function mcp_api_token_has_project(p_token text, p_project_id uuid)
returns boolean as $$
  select exists (
    select 1 from api_tokens t
    where t.token_hash = encode(extensions.digest(coalesce(p_token, ''), 'sha256'), 'hex')
      and t.project_id = p_project_id
      and t.revoked_at is null
      and t.expires_at > now()
  );
$$ language sql stable security definer set search_path = public, extensions;

create or replace function mcp_begin_tool_call(
  p_token text, p_project_id uuid, p_tool_name text,
  p_limit integer default 120, p_window_seconds integer default 60
)
returns table(audit_id uuid, allowed boolean)
as $$
declare v_token api_tokens%rowtype; v_window timestamptz; v_count integer; v_audit_id uuid; v_allowed boolean;
begin
  if p_token is null or p_token !~ '^tm_[0-9a-f]{64}$'
    or p_tool_name is null or p_tool_name !~ '^testmanager\.[a-z0-9_]+\.[a-z0-9_]+$'
    or p_limit < 1 or p_limit > 10000 or p_window_seconds < 1 or p_window_seconds > 86400 then
    raise exception 'invalid MCP governance request';
  end if;
  select t.* into v_token from api_tokens t
  where t.token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex')
    and t.project_id = p_project_id and t.revoked_at is null and t.expires_at > now();
  if v_token.id is null then raise exception 'invalid MCP credentials'; end if;
  update api_tokens set last_used_at = clock_timestamp(), updated_at = clock_timestamp() where id = v_token.id;
  v_window := to_timestamp(floor(extract(epoch from clock_timestamp()) / p_window_seconds) * p_window_seconds);
  insert into mcp_tool_rate_limits(token_id, tool_name, window_started_at, request_count)
  values (v_token.id, p_tool_name, v_window, 1)
  on conflict (token_id, tool_name, window_started_at)
  do update set request_count = mcp_tool_rate_limits.request_count + 1 returning request_count into v_count;
  v_allowed := v_count <= p_limit;
  insert into ai_audit_events(project_id, tool_name, status, created_by, latency_ms, completed_at)
  values (p_project_id, p_tool_name, case when v_allowed then 'started' else 'rate_limited' end,
    v_token.created_by, case when v_allowed then null else 0 end, case when v_allowed then null else clock_timestamp() end)
  returning id into v_audit_id;
  delete from mcp_tool_rate_limits where token_id = v_token.id and tool_name = p_tool_name and window_started_at < v_window;
  return query select v_audit_id, v_allowed;
end;
$$ language plpgsql security definer set search_path = public, extensions;

revoke all on function create_api_token(uuid, text, text[]) from public, anon;
grant execute on function create_api_token(uuid, text, text[]) to authenticated;
revoke all on function mcp_api_token_has_project(text, uuid) from public;
grant execute on function mcp_api_token_has_project(text, uuid) to anon;
revoke all on function mcp_begin_tool_call(text, uuid, text, integer, integer) from public;
grant execute on function mcp_begin_tool_call(text, uuid, text, integer, integer) to anon;

comment on column api_tokens.expires_at is 'Hard expiry for project-scoped API credentials.';
comment on column api_tokens.last_used_at is 'Most recent governed MCP tool call; never contains the raw token.';

-- Keep the unified local-agent heartbeat from accepting expired API tokens and
-- count a successful heartbeat as token usage. Runner credentials are unchanged.
create or replace function heartbeat_local_agent(p_token text, p_payload jsonb)
returns jsonb as $$
declare
  v_runner automation_runners; v_api_token api_tokens; v_kind text; v_id uuid; v_project_id uuid;
  v_process text := p_payload->>'process'; v_server_version constant text := '0.1.0';
  v_minimum_runner_version constant text := '0.1.0';
begin
  if p_payload->>'agent' <> 'testmanager-agent'
    or coalesce(p_payload->>'version', '') !~ '^[0-9]+\.[0-9]+\.[0-9]+([+-][0-9A-Za-z.-]+)?$'
    or v_process not in ('runner', 'mcp') or jsonb_typeof(p_payload->'capabilities') <> 'array'
  then raise exception 'INVALID_AGENT_HEARTBEAT'; end if;
  select * into v_runner from automation_runners
  where active and token_hash = encode(extensions.digest(coalesce(p_token, ''), 'sha256'), 'hex');
  if found then
    v_kind := 'runner'; v_id := v_runner.id; v_project_id := v_runner.project_id;
    update automation_runners set last_seen_at = now() where id = v_runner.id;
  else
    select * into v_api_token from api_tokens
    where revoked_at is null and expires_at > now()
      and token_hash = encode(extensions.digest(coalesce(p_token, ''), 'sha256'), 'hex');
    if not found then raise exception 'INVALID_AGENT_TOKEN'; end if;
    v_kind := 'api_token'; v_id := v_api_token.id; v_project_id := v_api_token.project_id;
    update api_tokens set last_used_at = clock_timestamp(), updated_at = clock_timestamp() where id = v_api_token.id;
  end if;
  insert into local_agent_heartbeats (credential_kind, credential_id, project_id, process, agent, version, capabilities, last_seen_at)
  values (v_kind, v_id, v_project_id, v_process, p_payload->>'agent', p_payload->>'version', p_payload->'capabilities', now())
  on conflict (credential_kind, credential_id, process) do update set
    agent = excluded.agent, version = excluded.version, capabilities = excluded.capabilities, last_seen_at = excluded.last_seen_at;
  return jsonb_build_object('agent_id', v_id, 'agent', 'testmanager-agent', 'active', true,
    'last_seen_at', now(), 'server_version', v_server_version,
    'minimum_supported_runner_version', v_minimum_runner_version);
end; $$ language plpgsql security definer set search_path = public, extensions;

revoke all on function heartbeat_local_agent(text, jsonb) from public;
grant execute on function heartbeat_local_agent(text, jsonb) to anon, authenticated;
