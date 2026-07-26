-- AI Integration security and audit metadata. Run after schema_022_p2_security_hardening.sql.
-- This migration intentionally stores metadata and hashes only; never store prompts,
-- provider responses, API keys, auth tokens, or raw project documents here.

create or replace function is_admin()
returns boolean as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and role = 'admin' and deleted_at is null
  );
$$ language sql security definer set search_path = public stable;

create or replace function is_approved()
returns boolean as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and role in ('user', 'admin') and deleted_at is null
  );
$$ language sql security definer set search_path = public stable;

create or replace function has_project_access(p_project_id uuid)
returns boolean as $$
  select is_approved() and (
    is_admin() or exists (
      select 1 from project_members
      where project_id = p_project_id and user_id = auth.uid()
    )
  );
$$ language sql security definer set search_path = public stable;

create or replace function is_project_manager(p_project_id uuid)
returns boolean as $$
  select is_approved() and (
    is_admin() or exists (
      select 1 from project_members
      where project_id = p_project_id and user_id = auth.uid() and role = 'manager'
    )
  );
$$ language sql security definer set search_path = public stable;

create table if not exists ai_audit_events (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  action text not null check (action in ('generate_test_cases', 'test_run_analysis', 'issue_draft', 'duplicate_issue_detection', 'assistant_search', 'approve_draft')),
  provider text not null,
  model text not null,
  prompt_version text not null,
  status text not null check (status in ('started', 'completed', 'failed', 'rate_limited')),
  created_by uuid references profiles(id) on delete set null,
  target_type text,
  target_id uuid,
  request_hash text not null,
  error_code text,
  latency_ms integer,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists idx_ai_audit_events_project_created
  on ai_audit_events(project_id, created_at desc);
create index if not exists idx_ai_audit_events_request_hash
  on ai_audit_events(request_hash);

alter table ai_audit_events enable row level security;
drop policy if exists "project members - ai audit select" on ai_audit_events;
create policy "project members - ai audit select" on ai_audit_events
  for select using (has_project_access(project_id));
drop policy if exists "approved users - ai audit insert" on ai_audit_events;
create policy "approved users - ai audit insert" on ai_audit_events
  for insert with check (has_project_access(project_id) and created_by = auth.uid());
drop policy if exists "users update own ai audit" on ai_audit_events;
create policy "users update own ai audit" on ai_audit_events
  for update using (has_project_access(project_id) and created_by = auth.uid())
  with check (has_project_access(project_id) and created_by = auth.uid());

create table if not exists ai_rate_limits (
  user_id uuid not null references profiles(id) on delete cascade,
  project_id uuid not null references projects(id) on delete cascade,
  action text not null,
  window_started_at timestamptz not null,
  request_count integer not null default 0 check (request_count >= 0),
  primary key (user_id, project_id, action, window_started_at)
);

alter table ai_rate_limits enable row level security;
drop policy if exists "users read own ai rate limits" on ai_rate_limits;
create policy "users read own ai rate limits" on ai_rate_limits
  for select using (user_id = auth.uid() and has_project_access(project_id));

create or replace function consume_ai_rate_limit(
  p_project_id uuid,
  p_action text,
  p_limit integer default 20,
  p_window_seconds integer default 60
)
returns boolean as $$
declare
  v_user_id uuid := auth.uid();
  v_window timestamptz := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  v_count integer;
begin
  if v_user_id is null or not has_project_access(p_project_id) then
    return false;
  end if;
  delete from ai_rate_limits
    where user_id = v_user_id and project_id = p_project_id and action = p_action
      and window_started_at < v_window;
  insert into ai_rate_limits(user_id, project_id, action, window_started_at, request_count)
    values (v_user_id, p_project_id, p_action, v_window, 1)
    on conflict (user_id, project_id, action, window_started_at)
    do update set request_count = ai_rate_limits.request_count + 1
    returning request_count into v_count;
  return v_count <= greatest(1, least(p_limit, 1000));
end;
$$ language plpgsql security definer set search_path = public;

revoke all on function consume_ai_rate_limit(uuid, text, integer, integer) from public, anon;
grant execute on function consume_ai_rate_limit(uuid, text, integer, integer) to authenticated;

revoke all on table ai_rate_limits from anon;
grant select on table ai_rate_limits to authenticated;
