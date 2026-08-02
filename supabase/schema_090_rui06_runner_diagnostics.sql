-- RUI-06: per-runner sanity diagnostics and end-to-end no-op connection jobs.
-- Run manually after schema_089_rui05_script_mapping.sql.
create table if not exists automation_runner_diagnostics (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  runner_id uuid not null references automation_runners(id) on delete cascade,
  status text not null default 'queued' check (status in ('queued','running','passed','failed')),
  base_url text,
  result jsonb,
  error_message text,
  requested_by uuid not null references profiles(id),
  requested_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz
);
create index if not exists idx_runner_diagnostics_poll on automation_runner_diagnostics(runner_id,status,requested_at);
alter table automation_runner_diagnostics enable row level security;
create policy "project access - runner diagnostics select" on automation_runner_diagnostics for select using (has_project_access(project_id));

create or replace function enqueue_runner_diagnostic(p_runner_id uuid) returns jsonb as $$
declare v_runner automation_runners; v_job automation_runner_diagnostics;
begin
  select * into v_runner from automation_runners where id=p_runner_id and active;
  if not found or not has_project_access(v_runner.project_id) then raise exception 'RUNNER_NOT_FOUND'; end if;
  if exists(select 1 from automation_runner_diagnostics where runner_id=p_runner_id and status in ('queued','running')) then raise exception 'DIAGNOSTIC_ALREADY_PENDING'; end if;
  insert into automation_runner_diagnostics(project_id,runner_id,base_url,requested_by)
  values(v_runner.project_id,v_runner.id,(select base_url from environments where project_id=v_runner.project_id and nullif(trim(base_url),'') is not null order by created_at limit 1),auth.uid()) returning * into v_job;
  return to_jsonb(v_job);
end; $$ language plpgsql security definer set search_path=public;

create or replace function poll_runner_diagnostic(p_token text) returns jsonb as $$
declare v_runner automation_runners; v_job automation_runner_diagnostics;
begin
  select * into v_runner from automation_runners where active and token_hash=encode(extensions.digest(coalesce(p_token,''),'sha256'),'hex');
  if not found then raise exception 'INVALID_RUNNER_TOKEN'; end if;
  select * into v_job from automation_runner_diagnostics where runner_id=v_runner.id and status='queued' order by requested_at for update skip locked limit 1;
  if not found then return jsonb_build_object('job',null); end if;
  update automation_runner_diagnostics set status='running',started_at=now() where id=v_job.id returning * into v_job;
  return jsonb_build_object('job',jsonb_build_object('id',v_job.id,'base_url',v_job.base_url));
end; $$ language plpgsql security definer set search_path=public,extensions;

create or replace function report_runner_diagnostic(p_token text,p_job_id uuid,p_result jsonb) returns jsonb as $$
declare v_runner automation_runners; v_job automation_runner_diagnostics; v_passed boolean;
begin
  select * into v_runner from automation_runners where active and token_hash=encode(extensions.digest(coalesce(p_token,''),'sha256'),'hex');
  if not found then raise exception 'INVALID_RUNNER_TOKEN'; end if;
  select * into v_job from automation_runner_diagnostics where id=p_job_id and runner_id=v_runner.id and status='running' for update;
  if not found then raise exception 'DIAGNOSTIC_JOB_NOT_FOUND'; end if;
  v_passed := coalesce((p_result->>'baseUrlReachable')::boolean,false) and coalesce((p_result->>'browserInstalled')::boolean,false) and coalesce((p_result->>'diskFreeBytes')::bigint,0)>0;
  update automation_runner_diagnostics set status=case when v_passed then 'passed' else 'failed' end,result=p_result,
    error_message=nullif(trim(p_result->>'errorMessage'),''),finished_at=now() where id=p_job_id returning * into v_job;
  return to_jsonb(v_job);
end; $$ language plpgsql security definer set search_path=public,extensions;

revoke all on function enqueue_runner_diagnostic(uuid) from public,anon;
grant execute on function enqueue_runner_diagnostic(uuid) to authenticated;
revoke all on function poll_runner_diagnostic(text),report_runner_diagnostic(text,uuid,jsonb) from public;
grant execute on function poll_runner_diagnostic(text),report_runner_diagnostic(text,uuid,jsonb) to anon,authenticated;
