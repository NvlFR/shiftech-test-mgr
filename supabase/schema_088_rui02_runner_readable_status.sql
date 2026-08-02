-- RUI-02: runtime metadata used by the readable runner status cards.
-- Run manually after schema_087_conn08_connect_token_security.sql.
alter table local_agent_heartbeats add column if not exists os text;
alter table local_agent_heartbeats add column if not exists started_at timestamptz;

create or replace function heartbeat_local_agent(p_token text, p_payload jsonb)
returns jsonb as $$
declare
  v_runner automation_runners; v_api_token api_tokens; v_kind text; v_id uuid; v_project_id uuid;
  v_process text := p_payload->>'process'; v_server_version constant text := '0.1.0';
  v_minimum_runner_version constant text := '0.1.0'; v_runtime jsonb := coalesce(p_payload->'runtime', '{}'::jsonb);
begin
  if p_payload->>'agent' <> 'testmanager-agent'
    or coalesce(p_payload->>'version', '') !~ '^[0-9]+\.[0-9]+\.[0-9]+([+-][0-9A-Za-z.-]+)?$'
    or v_process not in ('runner', 'mcp') or jsonb_typeof(p_payload->'capabilities') <> 'array'
    or (v_runtime <> '{}'::jsonb and (nullif(trim(v_runtime->>'os'), '') is null or (v_runtime->>'startedAt')::timestamptz is null))
  then raise exception 'INVALID_AGENT_HEARTBEAT'; end if;
  select * into v_runner from automation_runners where active and token_hash = encode(extensions.digest(coalesce(p_token, ''), 'sha256'), 'hex');
  if found then v_kind := 'runner'; v_id := v_runner.id; v_project_id := v_runner.project_id;
    update automation_runners set last_seen_at = now() where id = v_runner.id;
  else
    select * into v_api_token from api_tokens where revoked_at is null and expires_at > now() and token_hash = encode(extensions.digest(coalesce(p_token, ''), 'sha256'), 'hex');
    if not found then raise exception 'INVALID_AGENT_TOKEN'; end if;
    v_kind := 'api_token'; v_id := v_api_token.id; v_project_id := v_api_token.project_id;
    update api_tokens set last_used_at = clock_timestamp(), updated_at = clock_timestamp() where id = v_api_token.id;
  end if;
  insert into local_agent_heartbeats (credential_kind,credential_id,project_id,process,agent,version,capabilities,os,started_at,last_seen_at)
  values (v_kind,v_id,v_project_id,v_process,p_payload->>'agent',p_payload->>'version',p_payload->'capabilities',nullif(trim(v_runtime->>'os'),''),(v_runtime->>'startedAt')::timestamptz,now())
  on conflict (credential_kind,credential_id,process) do update set agent=excluded.agent,version=excluded.version,capabilities=excluded.capabilities,
    os=coalesce(excluded.os,local_agent_heartbeats.os),started_at=coalesce(excluded.started_at,local_agent_heartbeats.started_at),last_seen_at=excluded.last_seen_at;
  return jsonb_build_object('agent_id',v_id,'agent','testmanager-agent','active',true,'last_seen_at',now(),'server_version',v_server_version,'minimum_supported_runner_version',v_minimum_runner_version);
end; $$ language plpgsql security definer set search_path = public, extensions;
revoke all on function heartbeat_local_agent(text,jsonb) from public;
grant execute on function heartbeat_local_agent(text,jsonb) to anon, authenticated;
