-- P2 API tokens and webhooks. Run after schema_017_p1_rpc_hardening.sql.
-- Secrets are write-only: only SHA-256 hashes are persisted. HTTP delivery is
-- intentionally delegated to a Supabase Edge Function/worker with an external
-- secret store; the browser never receives a webhook secret after creation.

create extension if not exists pgcrypto;

create table if not exists api_tokens (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 100),
  token_prefix text not null check (char_length(token_prefix) between 6 and 20),
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  scopes text[] not null default array['read:project']::text[],
  revoked_at timestamptz,
  created_by uuid not null references profiles(id) on delete restrict default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_api_tokens_project_active on api_tokens(project_id, created_at desc) where revoked_at is null;

create table if not exists webhooks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 100),
  url text not null check (url ~* '^https://'),
  secret_hash text not null check (secret_hash ~ '^[0-9a-f]{64}$'),
  events text[] not null check (cardinality(events) > 0),
  is_active boolean not null default true,
  max_retries integer not null default 5 check (max_retries between 0 and 10),
  created_by uuid not null references profiles(id) on delete restrict default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_webhooks_project_active on webhooks(project_id, is_active);

create table if not exists webhook_deliveries (
  id uuid primary key default gen_random_uuid(),
  webhook_id uuid not null references webhooks(id) on delete cascade,
  project_id uuid not null references projects(id) on delete cascade,
  event text not null check (event in ('test_run.created', 'test_run.updated', 'test_result.updated', 'issue.created', 'issue.updated')),
  resource_id uuid not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending', 'delivered', 'retrying', 'failed')),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  next_attempt_at timestamptz not null default now(),
  response_status integer,
  response_body text check (response_body is null or char_length(response_body) <= 2000),
  delivered_at timestamptz,
  last_error text check (last_error is null or char_length(last_error) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_webhook_deliveries_queue on webhook_deliveries(status, next_attempt_at) where status in ('pending', 'retrying');
create index if not exists idx_webhook_deliveries_project on webhook_deliveries(project_id, created_at desc);

create table if not exists api_token_rate_limits (
  token_hash text primary key references api_tokens(token_hash) on delete cascade,
  window_started_at timestamptz not null default date_trunc('minute', now()),
  request_count integer not null default 0 check (request_count >= 0),
  updated_at timestamptz not null default now()
);

alter table api_tokens enable row level security;
alter table webhooks enable row level security;
alter table webhook_deliveries enable row level security;
alter table api_token_rate_limits enable row level security;

create policy "project managers - api tokens select" on api_tokens for select using (is_project_manager(project_id));
create policy "project managers - webhooks select" on webhooks for select using (is_project_manager(project_id));
create policy "project managers - webhooks update" on webhooks for update using (is_project_manager(project_id)) with check (is_project_manager(project_id));
create policy "project managers - webhook deliveries select" on webhook_deliveries for select using (is_project_manager(project_id));

create or replace function integration_audit(p_action text, p_project_id uuid, p_record_id uuid, p_new_data jsonb default null)
returns void as $$
begin
  insert into audit_logs(table_name, record_id, action, changed_by, new_data)
  values ('p2_integrations.' || p_action, p_record_id, 'created', auth.uid(),
    jsonb_build_object('project_id', p_project_id) || coalesce(p_new_data, '{}'::jsonb));
end;
$$ language plpgsql security definer set search_path = public;

create or replace function create_api_token(p_project_id uuid, p_name text, p_scopes text[] default array['read:project']::text[])
returns jsonb as $$
declare v_token text; v_id uuid; v_prefix text;
begin
  if not is_project_manager(p_project_id) then raise exception 'forbidden'; end if;
  if p_name is null or char_length(trim(p_name)) = 0 then raise exception 'token name is required'; end if;
  if p_scopes is null or cardinality(p_scopes) = 0 then raise exception 'at least one scope is required'; end if;
  v_token := 'tm_' || encode(gen_random_bytes(32), 'hex');
  v_prefix := left(v_token, 12);
  insert into api_tokens(project_id, name, token_prefix, token_hash, scopes, created_by)
  values (p_project_id, trim(p_name), v_prefix, encode(digest(v_token, 'sha256'), 'hex'), p_scopes, auth.uid())
  returning id into v_id;
  perform integration_audit('token_created', p_project_id, v_id, jsonb_build_object('name', trim(p_name), 'prefix', v_prefix, 'scopes', p_scopes));
  return jsonb_build_object('id', v_id, 'name', trim(p_name), 'token', v_token, 'token_prefix', v_prefix, 'scopes', p_scopes, 'created_at', now());
end;
$$ language plpgsql security definer set search_path = public;

create or replace function revoke_api_token(p_token_id uuid)
returns void as $$
declare v_project uuid;
begin
  select project_id into v_project from api_tokens where id = p_token_id;
  if v_project is null or not is_project_manager(v_project) then raise exception 'forbidden'; end if;
  update api_tokens set revoked_at = coalesce(revoked_at, now()), updated_at = now() where id = p_token_id;
  perform integration_audit('token_revoked', v_project, p_token_id);
end;
$$ language plpgsql security definer set search_path = public;

create or replace function create_webhook(p_project_id uuid, p_name text, p_url text, p_events text[], p_max_retries integer default 5)
returns jsonb as $$
declare v_secret text; v_id uuid;
begin
  if not is_project_manager(p_project_id) then raise exception 'forbidden'; end if;
  if p_name is null or char_length(trim(p_name)) = 0 then raise exception 'webhook name is required'; end if;
  if p_url is null or p_url !~* '^https://' then raise exception 'webhook URL must use HTTPS'; end if;
  if p_events is null or cardinality(p_events) = 0 then raise exception 'at least one event is required'; end if;
  if p_max_retries < 0 or p_max_retries > 10 then raise exception 'invalid retry count'; end if;
  v_secret := 'whsec_' || encode(gen_random_bytes(32), 'hex');
  insert into webhooks(project_id, name, url, secret_hash, events, max_retries, created_by)
  values (p_project_id, trim(p_name), trim(p_url), encode(digest(v_secret, 'sha256'), 'hex'), p_events, p_max_retries, auth.uid())
  returning id into v_id;
  perform integration_audit('webhook_created', p_project_id, v_id, jsonb_build_object('name', trim(p_name), 'url', trim(p_url), 'events', p_events));
  return jsonb_build_object('id', v_id, 'name', trim(p_name), 'url', trim(p_url), 'events', p_events, 'secret', v_secret, 'is_active', true, 'max_retries', p_max_retries, 'created_at', now());
end;
$$ language plpgsql security definer set search_path = public;

create or replace function enqueue_webhook_deliveries(p_project_id uuid, p_event text, p_resource_id uuid, p_payload jsonb)
returns void as $$
begin
  insert into webhook_deliveries(webhook_id, project_id, event, resource_id, payload)
  select id, project_id, p_event, p_resource_id, coalesce(p_payload, '{}'::jsonb)
  from webhooks where project_id = p_project_id and is_active and p_event = any(events);
end;
$$ language plpgsql security definer set search_path = public;

create or replace function consume_api_token_rate_limit(p_token_hash text, p_limit integer default 120)
returns boolean as $$
declare v_count integer;
begin
  insert into api_token_rate_limits(token_hash, request_count) values (p_token_hash, 1)
  on conflict (token_hash) do update set
    window_started_at = case when api_token_rate_limits.window_started_at < date_trunc('minute', now()) then date_trunc('minute', now()) else api_token_rate_limits.window_started_at end,
    request_count = case when api_token_rate_limits.window_started_at < date_trunc('minute', now()) then 1 else api_token_rate_limits.request_count + 1 end,
    updated_at = now()
  returning request_count into v_count;
  return v_count <= greatest(p_limit, 1);
end;
$$ language plpgsql security definer set search_path = public;

-- Event queue only; an Edge Function/worker claims pending rows and performs HTTPS
-- delivery with bounded exponential backoff. No secret or authorization header is
-- included in payloads or delivery logs.
create or replace function queue_test_run_webhook() returns trigger as $$
declare v_project uuid;
begin select project_id into v_project from test_plans where id = new.test_plan_id; perform enqueue_webhook_deliveries(v_project, case when tg_op = 'INSERT' then 'test_run.created' else 'test_run.updated' end, new.id, to_jsonb(new)); return new; end;
$$ language plpgsql security definer set search_path = public;
create or replace function queue_test_result_webhook() returns trigger as $$
declare v_project uuid;
begin select tp.project_id into v_project from test_runs tr join test_plans tp on tp.id = tr.test_plan_id where tr.id = new.test_run_id; perform enqueue_webhook_deliveries(v_project, 'test_result.updated', new.id, to_jsonb(new)); return new; end;
$$ language plpgsql security definer set search_path = public;
create or replace function queue_issue_webhook() returns trigger as $$
declare v_project uuid;
begin select tp.project_id into v_project from test_results r join test_runs tr on tr.id = r.test_run_id join test_plans tp on tp.id = tr.test_plan_id where r.id = new.test_result_id; perform enqueue_webhook_deliveries(v_project, case when tg_op = 'INSERT' then 'issue.created' else 'issue.updated' end, new.id, to_jsonb(new)); return new; end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists trg_p2_webhook_test_run on test_runs;
create trigger trg_p2_webhook_test_run after insert or update on test_runs for each row execute function queue_test_run_webhook();
drop trigger if exists trg_p2_webhook_test_result on test_results;
create trigger trg_p2_webhook_test_result after insert or update on test_results for each row execute function queue_test_result_webhook();
drop trigger if exists trg_p2_webhook_issue on issues;
create trigger trg_p2_webhook_issue after insert or update on issues for each row execute function queue_issue_webhook();

revoke all on function create_api_token(uuid, text, text[]) from public, anon;
revoke all on function revoke_api_token(uuid) from public, anon;
revoke all on function create_webhook(uuid, text, text, text[], integer) from public, anon;
revoke all on function enqueue_webhook_deliveries(uuid, text, uuid, jsonb) from public, anon;
revoke all on function consume_api_token_rate_limit(text, integer) from public, anon;
grant execute on function create_api_token(uuid, text, text[]) to authenticated;
grant execute on function revoke_api_token(uuid) to authenticated;
grant execute on function create_webhook(uuid, text, text, text[], integer) to authenticated;
