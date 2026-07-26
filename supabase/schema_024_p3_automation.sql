-- P3 Automation — Playwright Local Runner orchestration.
-- Run after schema_020 (CI/CD) and schema_022 (P2 security hardening).
--
-- Model: browsers NEVER run on the central self-hosted server. A local runner
-- (separate CLI/agent installed on the tester/on-prem machine that can reach the
-- app under test) connects OUTBOUND using a runner token, PULLS queued jobs,
-- executes Playwright locally, then REPORTS results + artifact metadata back.
-- The central server only stores script mappings, enqueues jobs, and records
-- results into the normal Test Run / Test Result tables.
--
-- Tokens are accepted only at RPC boundaries and stored as SHA-256 hashes,
-- matching the CI/CD pipeline convention.

create extension if not exists pgcrypto;

-- Registered local runners. A runner belongs to one project and advertises the
-- capabilities (labels) it can execute, e.g. {chromium, staging, vpn-internal}.
create table if not exists automation_runners (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  name text not null,
  labels text[] not null default '{}',
  token_prefix text not null,
  token_hash text not null,
  active boolean not null default true,
  last_seen_at timestamptz,
  created_by uuid not null references profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint automation_runners_name_not_blank check (length(trim(name)) between 1 and 120),
  constraint automation_runners_token_prefix check (token_prefix ~ '^tm_[a-zA-Z0-9]{8}$')
);
create index if not exists idx_automation_runners_project on automation_runners(project_id, active);
create unique index if not exists idx_automation_runners_token_hash on automation_runners(token_hash);

-- Mapping Test Case <-> automation script. We store a REFERENCE (path/spec id),
-- never the executable script body — the runner resolves and runs it locally.
create table if not exists automation_scripts (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  test_case_id uuid not null references test_cases(id) on delete cascade,
  script_ref text not null,
  runner_labels text[] not null default '{}',
  created_by uuid not null references profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint automation_scripts_ref_not_blank check (length(trim(script_ref)) between 1 and 500),
  unique (test_case_id)
);
create index if not exists idx_automation_scripts_project on automation_scripts(project_id);
create index if not exists idx_automation_scripts_case on automation_scripts(test_case_id);

-- Automation jobs are the unit of execution pulled by runners. Each job belongs
-- to a Test Run (the session) and targets one Test Case; its result lands in the
-- corresponding test_results row. Artifacts hold metadata/URLs only.
create table if not exists automation_jobs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  test_run_id uuid not null references test_runs(id) on delete cascade,
  test_case_id uuid not null references test_cases(id) on delete cascade,
  script_ref text not null,
  required_labels text[] not null default '{}',
  status text not null default 'queued' check (status in ('queued', 'running', 'passed', 'failed', 'canceled')),
  attempt integer not null default 0,
  max_attempts integer not null default 1,
  runner_id uuid references automation_runners(id) on delete set null,
  artifacts jsonb not null default '[]',
  error_message text,
  queued_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz,
  created_by uuid not null references profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint automation_jobs_max_attempts check (max_attempts between 1 and 10)
);
create index if not exists idx_automation_jobs_project on automation_jobs(project_id, status);
create index if not exists idx_automation_jobs_run on automation_jobs(test_run_id);
create index if not exists idx_automation_jobs_queue on automation_jobs(status, queued_at) where status = 'queued';

drop trigger if exists trg_automation_runners_updated_at on automation_runners;
create trigger trg_automation_runners_updated_at before update on automation_runners
  for each row execute function set_updated_at();
drop trigger if exists trg_automation_scripts_updated_at on automation_scripts;
create trigger trg_automation_scripts_updated_at before update on automation_scripts
  for each row execute function set_updated_at();
drop trigger if exists trg_automation_jobs_updated_at on automation_jobs;
create trigger trg_automation_jobs_updated_at before update on automation_jobs
  for each row execute function set_updated_at();

-- Keep script mapping consistent: the mapped Test Case must belong to project_id.
create or replace function validate_automation_script_case()
returns trigger as $$
begin
  if not exists (select 1 from test_cases where id = new.test_case_id and project_id = new.project_id) then
    raise exception 'CASE_PROJECT_MISMATCH';
  end if;
  return new;
end; $$ language plpgsql security definer set search_path = public;
drop trigger if exists trg_automation_script_case on automation_scripts;
create trigger trg_automation_script_case before insert or update of project_id, test_case_id on automation_scripts
  for each row execute function validate_automation_script_case();

-- Trigger helper is an implementation detail, not a public RPC (matches the
-- hardening convention in schema_022 for write_audit_log/etc.).
revoke execute on function public.validate_automation_script_case() from public, anon, authenticated;

alter table automation_runners enable row level security;
alter table automation_scripts enable row level security;
alter table automation_jobs enable row level security;

-- Runners: project members read; managers manage. Token hash is never selected
-- by the client repository (column list excludes it).
drop policy if exists "project access - automation runners select" on automation_runners;
create policy "project access - automation runners select" on automation_runners for select
  using (has_project_access(project_id));
drop policy if exists "project managers - automation runners insert" on automation_runners;
create policy "project managers - automation runners insert" on automation_runners for insert
  with check (can_edit_project_content(project_id) and created_by = auth.uid());
drop policy if exists "project managers - automation runners update" on automation_runners;
create policy "project managers - automation runners update" on automation_runners for update
  using (can_edit_project_content(project_id)) with check (can_edit_project_content(project_id));
drop policy if exists "project managers - automation runners delete" on automation_runners;
create policy "project managers - automation runners delete" on automation_runners for delete
  using (can_delete_project_content(project_id));

-- Script mappings: read by members, managed by editors.
drop policy if exists "project access - automation scripts select" on automation_scripts;
create policy "project access - automation scripts select" on automation_scripts for select
  using (has_project_access(project_id));
drop policy if exists "project editors - automation scripts insert" on automation_scripts;
create policy "project editors - automation scripts insert" on automation_scripts for insert
  with check (can_edit_project_content(project_id) and created_by = auth.uid());
drop policy if exists "project editors - automation scripts update" on automation_scripts;
create policy "project editors - automation scripts update" on automation_scripts for update
  using (can_edit_project_content(project_id)) with check (can_edit_project_content(project_id));
drop policy if exists "project editors - automation scripts delete" on automation_scripts;
create policy "project editors - automation scripts delete" on automation_scripts for delete
  using (can_edit_project_content(project_id));

-- Jobs: read-only for clients. All writes go through the RPCs below so runner
-- token auth, queue claiming, and result recording stay server-controlled.
drop policy if exists "project access - automation jobs select" on automation_jobs;
create policy "project access - automation jobs select" on automation_jobs for select
  using (has_project_access(project_id));

-- Authenticated manager creates a runner and receives the plaintext token once.
create or replace function create_automation_runner(
  p_project_id uuid,
  p_name text,
  p_labels text[],
  p_token text,
  p_created_by uuid default auth.uid()
) returns jsonb as $$
declare v_runner automation_runners;
begin
  if p_created_by is null or p_created_by <> auth.uid() then raise exception 'AUTH_REQUIRED'; end if;
  if not can_edit_project_content(p_project_id) then raise exception 'FORBIDDEN'; end if;
  if length(trim(coalesce(p_name, ''))) not between 1 and 120 then raise exception 'INVALID_NAME'; end if;
  if length(coalesce(p_token, '')) < 32 then raise exception 'INVALID_TOKEN'; end if;
  insert into automation_runners(project_id, name, labels, token_prefix, token_hash, created_by)
  values (p_project_id, trim(p_name), coalesce(p_labels, '{}'), left(p_token, 11), encode(digest(p_token, 'sha256'), 'hex'), p_created_by)
  returning * into v_runner;
  perform integration_audit('automation_runner_created', v_runner.project_id, v_runner.id, jsonb_build_object('name', v_runner.name, 'labels', v_runner.labels, 'token_prefix', v_runner.token_prefix));
  return jsonb_build_object('runner', to_jsonb(v_runner) - 'token_hash', 'token', p_token);
end; $$ language plpgsql security definer set search_path = public;

create or replace function rotate_automation_runner_token(p_runner_id uuid, p_token text)
returns jsonb as $$
declare v_runner automation_runners;
begin
  if length(coalesce(p_token, '')) < 32 then raise exception 'INVALID_TOKEN'; end if;
  update automation_runners set token_prefix = left(p_token, 11), token_hash = encode(digest(p_token, 'sha256'), 'hex'), active = true
  where id = p_runner_id and can_edit_project_content(project_id)
  returning * into v_runner;
  if not found then raise exception 'NOT_FOUND_OR_FORBIDDEN'; end if;
  perform integration_audit('automation_runner_token_rotated', v_runner.project_id, v_runner.id, jsonb_build_object('token_prefix', v_runner.token_prefix));
  return jsonb_build_object('runner', to_jsonb(v_runner) - 'token_hash', 'token', p_token);
end; $$ language plpgsql security definer set search_path = public;

-- Enqueue automation for a test plan: create the Test Run session, seed
-- test_results for every plan case, and create one queued job per plan case that
-- has a script mapping. Cases without a script stay not_run for manual testing.
create or replace function enqueue_automation_jobs(
  p_project_id uuid,
  p_test_plan_id uuid,
  p_name text default null,
  p_environment_id uuid default null,
  p_max_attempts integer default 1,
  p_created_by uuid default auth.uid()
) returns jsonb as $$
declare
  v_run test_runs;
  v_job_count integer := 0;
  v_max integer := coalesce(p_max_attempts, 1);
begin
  if p_created_by is null or p_created_by <> auth.uid() then raise exception 'AUTH_REQUIRED'; end if;
  if not can_edit_project_content(p_project_id) then raise exception 'FORBIDDEN'; end if;
  if p_test_plan_id is null or (select project_id from test_plans where id = p_test_plan_id) <> p_project_id then raise exception 'PLAN_PROJECT_MISMATCH'; end if;
  if v_max not between 1 and 10 then raise exception 'INVALID_MAX_ATTEMPTS'; end if;

  insert into test_runs(test_plan_id, name, ci_provider, environment_id)
  values (p_test_plan_id, coalesce(nullif(trim(p_name), ''), 'Automation run'), 'automation', p_environment_id)
  returning * into v_run;

  insert into test_results(test_run_id, test_case_id)
  select v_run.id, tpc.test_case_id from test_plan_cases tpc where tpc.test_plan_id = p_test_plan_id;

  insert into automation_jobs(project_id, test_run_id, test_case_id, script_ref, required_labels, max_attempts, created_by)
  select p_project_id, v_run.id, s.test_case_id, s.script_ref, s.runner_labels, v_max, p_created_by
  from automation_scripts s
  join test_plan_cases tpc on tpc.test_case_id = s.test_case_id and tpc.test_plan_id = p_test_plan_id
  where s.project_id = p_project_id;
  get diagnostics v_job_count = row_count;

  perform integration_audit('automation_jobs_enqueued', p_project_id, v_run.id, jsonb_build_object('test_plan_id', p_test_plan_id, 'job_count', v_job_count));
  return jsonb_build_object('run_id', v_run.id, 'run_code', v_run.code, 'job_count', v_job_count);
end; $$ language plpgsql security definer set search_path = public;

-- Runner pulls the next matching queued job (labels must be a subset of the
-- runner's advertised labels). SKIP LOCKED lets multiple runners poll safely.
create or replace function poll_automation_job(p_token text)
returns jsonb as $$
declare
  v_runner automation_runners;
  v_job automation_jobs;
  v_case test_cases;
begin
  select * into v_runner from automation_runners where active and token_hash = encode(digest(coalesce(p_token, ''), 'sha256'), 'hex');
  if not found then raise exception 'INVALID_RUNNER_TOKEN'; end if;
  update automation_runners set last_seen_at = now() where id = v_runner.id;

  select * into v_job from automation_jobs
  where project_id = v_runner.project_id and status = 'queued' and required_labels <@ v_runner.labels
  order by queued_at asc
  for update skip locked
  limit 1;
  if not found then return jsonb_build_object('job', null); end if;

  update automation_jobs set status = 'running', runner_id = v_runner.id, attempt = attempt + 1, started_at = now()
  where id = v_job.id returning * into v_job;
  select * into v_case from test_cases where id = v_job.test_case_id;

  return jsonb_build_object('job', jsonb_build_object(
    'id', v_job.id, 'test_run_id', v_job.test_run_id, 'test_case_id', v_job.test_case_id,
    'test_case_code', v_case.code, 'test_case_title', v_case.title, 'script_ref', v_job.script_ref,
    'attempt', v_job.attempt, 'max_attempts', v_job.max_attempts));
end; $$ language plpgsql security definer set search_path = public;

-- Runner reports the outcome. Result maps into the test_results row; artifacts
-- (screenshot/video/trace/log metadata) are stored on the job. A failed job with
-- attempts remaining is requeued when p_retry is true.
create or replace function report_automation_job(p_token text, p_job_id uuid, p_payload jsonb)
returns jsonb as $$
declare
  v_runner automation_runners;
  v_job automation_jobs;
  v_result_status text;
  v_final_status text;
  v_requeue boolean := false;
begin
  select * into v_runner from automation_runners where active and token_hash = encode(digest(coalesce(p_token, ''), 'sha256'), 'hex');
  if not found then raise exception 'INVALID_RUNNER_TOKEN'; end if;
  update automation_runners set last_seen_at = now() where id = v_runner.id;

  select * into v_job from automation_jobs where id = p_job_id for update;
  if not found or v_job.runner_id <> v_runner.id or v_job.status <> 'running' then raise exception 'JOB_NOT_CLAIMED_BY_RUNNER'; end if;
  if jsonb_typeof(p_payload) <> 'object' then raise exception 'INVALID_PAYLOAD'; end if;
  if (p_payload->>'result') not in ('pass', 'fail', 'blocked', 'skip') then raise exception 'INVALID_RESULT'; end if;
  v_result_status := p_payload->>'result';

  if v_result_status <> 'pass' and coalesce((p_payload->>'retry')::boolean, false) and v_job.attempt < v_job.max_attempts then
    v_requeue := true;
  end if;

  if v_requeue then
    update automation_jobs set status = 'queued', runner_id = null, started_at = null,
      artifacts = coalesce(p_payload->'artifacts', '[]'::jsonb), error_message = nullif(trim(p_payload->>'error_message'), '')
    where id = v_job.id;
    return jsonb_build_object('job_id', v_job.id, 'status', 'queued', 'requeued', true, 'attempt', v_job.attempt, 'max_attempts', v_job.max_attempts);
  end if;

  v_final_status := case when v_result_status = 'pass' then 'passed' else 'failed' end;
  update automation_jobs set status = v_final_status, finished_at = now(),
    artifacts = coalesce(p_payload->'artifacts', '[]'::jsonb), error_message = nullif(trim(p_payload->>'error_message'), '')
  where id = v_job.id;

  update test_results set status = v_result_status, executed_at = now(),
    notes = nullif(trim(p_payload->>'notes'), '')
  where test_run_id = v_job.test_run_id and test_case_id = v_job.test_case_id;

  perform integration_audit('automation_job_reported', v_job.project_id, v_job.id, jsonb_build_object('result', v_result_status, 'status', v_final_status, 'attempt', v_job.attempt));
  return jsonb_build_object('job_id', v_job.id, 'status', v_final_status, 'requeued', false, 'result', v_result_status);
end; $$ language plpgsql security definer set search_path = public;

-- Lightweight heartbeat so the runner list can show online/offline in the UI.
create or replace function heartbeat_automation_runner(p_token text)
returns jsonb as $$
declare v_runner automation_runners;
begin
  update automation_runners set last_seen_at = now()
  where active and token_hash = encode(digest(coalesce(p_token, ''), 'sha256'), 'hex')
  returning * into v_runner;
  if not found then raise exception 'INVALID_RUNNER_TOKEN'; end if;
  return jsonb_build_object('runner_id', v_runner.id, 'active', v_runner.active, 'last_seen_at', v_runner.last_seen_at);
end; $$ language plpgsql security definer set search_path = public;

-- Cancel a still-queued job (authenticated manager, RLS-guarded via the guard).
create or replace function cancel_automation_job(p_job_id uuid)
returns jsonb as $$
declare v_job automation_jobs;
begin
  update automation_jobs set status = 'canceled', finished_at = now()
  where id = p_job_id and status = 'queued' and can_edit_project_content(project_id)
  returning * into v_job;
  if not found then raise exception 'NOT_FOUND_OR_NOT_QUEUED'; end if;
  perform integration_audit('automation_job_canceled', v_job.project_id, v_job.id, '{}'::jsonb);
  return jsonb_build_object('job_id', v_job.id, 'status', v_job.status);
end; $$ language plpgsql security definer set search_path = public;

-- Client RPCs (manager only) run as authenticated; runner RPCs are token-based
-- and therefore reachable by anon like the CI/CD ingest endpoint.
revoke all on function create_automation_runner(uuid, text, text[], text, uuid) from public, anon;
grant execute on function create_automation_runner(uuid, text, text[], text, uuid) to authenticated;
revoke all on function rotate_automation_runner_token(uuid, text) from public, anon;
grant execute on function rotate_automation_runner_token(uuid, text) to authenticated;
revoke all on function enqueue_automation_jobs(uuid, uuid, text, uuid, integer, uuid) from public, anon;
grant execute on function enqueue_automation_jobs(uuid, uuid, text, uuid, integer, uuid) to authenticated;
revoke all on function cancel_automation_job(uuid) from public, anon;
grant execute on function cancel_automation_job(uuid) to authenticated;
revoke all on function poll_automation_job(text) from public;
grant execute on function poll_automation_job(text) to anon, authenticated;
revoke all on function report_automation_job(text, uuid, jsonb) from public;
grant execute on function report_automation_job(text, uuid, jsonb) to anon, authenticated;
revoke all on function heartbeat_automation_runner(text) from public;
grant execute on function heartbeat_automation_runner(text) to anon, authenticated;
