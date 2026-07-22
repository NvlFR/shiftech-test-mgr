-- P2 CI/CD integration. Run after project roles and P2 audit schema.
-- Tokens are accepted only at RPC boundaries and are stored as SHA-256 hashes.

create extension if not exists pgcrypto;

alter table test_runs add column if not exists pipeline_id uuid;
alter table test_runs add column if not exists branch text;
alter table test_runs add column if not exists commit_sha text;
alter table test_runs add column if not exists build_number text;
alter table test_runs add column if not exists ci_provider text;
alter table test_runs add column if not exists external_run_id text;

create table if not exists cicd_pipelines (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  test_plan_id uuid not null references test_plans(id) on delete cascade,
  name text not null,
  provider text not null check (provider in ('github_actions', 'gitlab_ci', 'jenkins', 'runner_internal', 'generic')),
  token_prefix text not null,
  token_hash text not null,
  active boolean not null default true,
  last_used_at timestamptz,
  created_by uuid not null references profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cicd_pipelines_name_not_blank check (length(trim(name)) between 1 and 120),
  constraint cicd_pipelines_token_prefix check (token_prefix ~ '^tm_[a-zA-Z0-9]{8}$'),
  constraint cicd_pipelines_project_plan check (project_id is not null)
);

create index if not exists idx_cicd_pipelines_project on cicd_pipelines(project_id, active);
create index if not exists idx_cicd_pipelines_plan on cicd_pipelines(test_plan_id);
create unique index if not exists idx_cicd_pipelines_token_hash on cicd_pipelines(token_hash);

alter table test_runs
  drop constraint if exists test_runs_pipeline_project_fk;
alter table test_runs
  add constraint test_runs_pipeline_project_fk foreign key (pipeline_id) references cicd_pipelines(id) on delete set null;
create index if not exists idx_test_runs_pipeline on test_runs(pipeline_id, started_at desc);
create index if not exists idx_test_runs_commit on test_runs(commit_sha);

create table if not exists cicd_ingest_attempts (
  id bigint generated always as identity primary key,
  pipeline_id uuid references cicd_pipelines(id) on delete set null,
  requested_at timestamptz not null default now(),
  succeeded boolean not null default false,
  error_code text
);
create index if not exists idx_cicd_ingest_attempts_rate on cicd_ingest_attempts(pipeline_id, requested_at desc);

drop trigger if exists trg_cicd_pipelines_updated_at on cicd_pipelines;
create trigger trg_cicd_pipelines_updated_at before update on cicd_pipelines
  for each row execute function set_updated_at();

create or replace function validate_cicd_pipeline_plan()
returns trigger as $$
begin
  if not exists (select 1 from test_plans where id = new.test_plan_id and project_id = new.project_id) then
    raise exception 'PLAN_PROJECT_MISMATCH';
  end if;
  return new;
end; $$ language plpgsql security definer set search_path = public;
drop trigger if exists trg_cicd_pipeline_plan on cicd_pipelines;
create trigger trg_cicd_pipeline_plan before insert or update of project_id, test_plan_id on cicd_pipelines
  for each row execute function validate_cicd_pipeline_plan();

alter table cicd_pipelines enable row level security;
alter table cicd_ingest_attempts enable row level security;

drop policy if exists "project access - cicd pipelines select" on cicd_pipelines;
create policy "project access - cicd pipelines select" on cicd_pipelines for select
  using (has_project_access(project_id));
drop policy if exists "project managers - cicd pipelines insert" on cicd_pipelines;
create policy "project managers - cicd pipelines insert" on cicd_pipelines for insert
  with check (can_edit_project_content(project_id) and created_by = auth.uid());
drop policy if exists "project managers - cicd pipelines update" on cicd_pipelines;
create policy "project managers - cicd pipelines update" on cicd_pipelines for update
  using (can_edit_project_content(project_id)) with check (can_edit_project_content(project_id));
drop policy if exists "project managers - cicd pipelines delete" on cicd_pipelines;
create policy "project managers - cicd pipelines delete" on cicd_pipelines for delete
  using (can_delete_project_content(project_id));

-- No direct client policy is granted for ingest attempts. Only the RPC below may write it.
create policy "project managers - cicd attempts select" on cicd_ingest_attempts for select
  using (is_admin() or exists (
    select 1 from cicd_pipelines p where p.id = pipeline_id and has_project_access(p.project_id)
  ));

create or replace function create_cicd_pipeline(
  p_project_id uuid,
  p_test_plan_id uuid,
  p_name text,
  p_provider text,
  p_token text,
  p_created_by uuid default auth.uid()
) returns jsonb as $$
declare v_pipeline cicd_pipelines;
begin
  if p_created_by is null or p_created_by <> auth.uid() then raise exception 'AUTH_REQUIRED'; end if;
  if not can_edit_project_content(p_project_id) then raise exception 'FORBIDDEN'; end if;
  if p_test_plan_id is null or (select project_id from test_plans where id = p_test_plan_id) <> p_project_id then raise exception 'PLAN_PROJECT_MISMATCH'; end if;
  if length(trim(coalesce(p_name, ''))) not between 1 and 120 then raise exception 'INVALID_NAME'; end if;
  if p_provider not in ('github_actions', 'gitlab_ci', 'jenkins', 'runner_internal', 'generic') then raise exception 'INVALID_PROVIDER'; end if;
  if length(coalesce(p_token, '')) < 32 then raise exception 'INVALID_TOKEN'; end if;
  insert into cicd_pipelines(project_id, test_plan_id, name, provider, token_prefix, token_hash, created_by)
  values (p_project_id, p_test_plan_id, trim(p_name), p_provider, left(p_token, 11), encode(digest(p_token, 'sha256'), 'hex'), p_created_by)
  returning * into v_pipeline;
  perform integration_audit('cicd_pipeline_created', v_pipeline.project_id, v_pipeline.id, jsonb_build_object('test_plan_id', v_pipeline.test_plan_id, 'provider', v_pipeline.provider, 'token_prefix', v_pipeline.token_prefix));
  return jsonb_build_object('pipeline', to_jsonb(v_pipeline) - 'token_hash', 'token', p_token);
end; $$ language plpgsql security definer set search_path = public;

create or replace function rotate_cicd_pipeline_token(p_pipeline_id uuid, p_token text)
returns jsonb as $$
declare v_pipeline cicd_pipelines;
begin
  if length(coalesce(p_token, '')) < 32 then raise exception 'INVALID_TOKEN'; end if;
  update cicd_pipelines set token_prefix = left(p_token, 11), token_hash = encode(digest(p_token, 'sha256'), 'hex'), active = true
  where id = p_pipeline_id and can_edit_project_content(project_id)
  returning * into v_pipeline;
  if not found then raise exception 'NOT_FOUND_OR_FORBIDDEN'; end if;
  perform integration_audit('cicd_pipeline_token_rotated', v_pipeline.project_id, v_pipeline.id, jsonb_build_object('token_prefix', v_pipeline.token_prefix));
  return jsonb_build_object('pipeline', to_jsonb(v_pipeline) - 'token_hash', 'token', p_token);
end; $$ language plpgsql security definer set search_path = public;

create or replace function ingest_cicd_test_run(p_token text, p_payload jsonb)
returns jsonb as $$
declare
  v_pipeline cicd_pipelines;
  v_run test_runs;
  v_result jsonb;
  v_item jsonb;
  v_case_id uuid;
  v_total integer := 0;
  v_pass integer := 0;
  v_fail integer := 0;
  v_skip integer := 0;
  v_blocked integer := 0;
  v_not_run integer := 0;
begin
  select * into v_pipeline from cicd_pipelines where active and token_hash = encode(digest(coalesce(p_token, ''), 'sha256'), 'hex') for update;
  if not found then raise exception 'INVALID_PIPELINE_TOKEN'; end if;
  if (select count(*) from cicd_ingest_attempts where pipeline_id = v_pipeline.id and requested_at > now() - interval '1 minute') >= 60 then
    insert into cicd_ingest_attempts(pipeline_id, succeeded, error_code) values (v_pipeline.id, false, 'RATE_LIMITED');
    raise exception 'RATE_LIMITED';
  end if;
  if jsonb_typeof(p_payload) <> 'object' or jsonb_typeof(p_payload->'results') <> 'array' then raise exception 'INVALID_PAYLOAD'; end if;
  insert into test_runs(test_plan_id, name, pipeline_id, branch, commit_sha, build_number, ci_provider, external_run_id, environment_id, build_version, release)
  values (v_pipeline.test_plan_id, coalesce(nullif(trim(p_payload->>'name'), ''), v_pipeline.name || ' run'), v_pipeline.id, nullif(trim(p_payload->>'branch'), ''), nullif(trim(p_payload->>'commit_sha'), ''), nullif(trim(p_payload->>'build_number'), ''), v_pipeline.provider, nullif(trim(p_payload->>'external_run_id'), ''), nullif(p_payload->>'environment_id', '')::uuid, nullif(trim(p_payload->>'build_version'), ''), nullif(trim(p_payload->>'release'), '')) returning * into v_run;
  insert into test_results(test_run_id, test_case_id)
  select v_run.id, tpc.test_case_id from test_plan_cases tpc where tpc.test_plan_id = v_pipeline.test_plan_id;
  for v_item in select value from jsonb_array_elements(p_payload->'results') loop
    v_case_id := nullif(v_item->>'test_case_id', '')::uuid;
    if v_case_id is null then select tc.id into v_case_id from test_cases tc join test_plan_cases tpc on tpc.test_case_id = tc.id where tpc.test_plan_id = v_pipeline.test_plan_id and tc.code = v_item->>'test_case_code'; end if;
    if v_case_id is null or not exists (select 1 from test_plan_cases where test_plan_id = v_pipeline.test_plan_id and test_case_id = v_case_id) then raise exception 'TEST_CASE_NOT_IN_PLAN'; end if;
    if v_item->>'status' not in ('pass', 'fail', 'skip', 'blocked') then raise exception 'INVALID_RESULT_STATUS'; end if;
    update test_results set status = (v_item->>'status')::text, notes = nullif(v_item->>'notes', ''), executed_at = coalesce(nullif(v_item->>'executed_at', '')::timestamptz, now()) where test_run_id = v_run.id and test_case_id = v_case_id;
  end loop;
  select count(*), count(*) filter (where status = 'pass'), count(*) filter (where status = 'fail'), count(*) filter (where status = 'skip'), count(*) filter (where status = 'blocked'), count(*) filter (where status = 'not_run') into v_total, v_pass, v_fail, v_skip, v_blocked, v_not_run from test_results where test_run_id = v_run.id;
  update cicd_pipelines set last_used_at = now() where id = v_pipeline.id;
  insert into cicd_ingest_attempts(pipeline_id, succeeded) values (v_pipeline.id, true);
  return jsonb_build_object('run_id', v_run.id, 'run_code', v_run.code, 'status', v_run.status, 'provider', v_pipeline.provider, 'summary', jsonb_build_object('total', v_total, 'pass', v_pass, 'fail', v_fail, 'skip', v_skip, 'blocked', v_blocked, 'not_run', v_not_run, 'progress_percent', case when v_total = 0 then 0 else round(((v_total - v_not_run)::numeric / v_total) * 100) end));
exception when others then
  if v_pipeline.id is not null then insert into cicd_ingest_attempts(pipeline_id, succeeded, error_code) values (v_pipeline.id, false, sqlstate); end if;
  raise;
end; $$ language plpgsql security definer set search_path = public;

revoke all on function create_cicd_pipeline(uuid, uuid, text, text, text, uuid) from public, anon;
grant execute on function create_cicd_pipeline(uuid, uuid, text, text, text, uuid) to authenticated;
revoke all on function rotate_cicd_pipeline_token(uuid, text) from public, anon;
grant execute on function rotate_cicd_pipeline_token(uuid, text) to authenticated;
revoke all on function ingest_cicd_test_run(text, jsonb) from public;
grant execute on function ingest_cicd_test_run(text, jsonb) to anon, authenticated;
