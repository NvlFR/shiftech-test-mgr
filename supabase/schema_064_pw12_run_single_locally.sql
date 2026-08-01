-- PW-12: enqueue exactly one mapped Test Case for execution by a Local Runner.
-- The runner remains pull-based/outbound-only; this avoids enqueueing every case
-- in the selected Test Plan while preserving the normal Test Run/result history.

create or replace function run_automation_test_case_locally(
  p_project_id uuid,
  p_test_plan_id uuid,
  p_test_case_id uuid,
  p_name text default null,
  p_browser text default 'chromium',
  p_device_profile text default null,
  p_created_by uuid default auth.uid()
) returns jsonb as $$
declare
  v_run test_runs;
  v_script automation_scripts;
  v_job automation_jobs;
begin
  if p_created_by is null or p_created_by <> auth.uid() then raise exception 'AUTH_REQUIRED'; end if;
  if not can_edit_project_content(p_project_id) then raise exception 'FORBIDDEN'; end if;
  if (select project_id from test_plans where id = p_test_plan_id) is distinct from p_project_id then raise exception 'PLAN_PROJECT_MISMATCH'; end if;
  if not exists (select 1 from test_plan_cases where test_plan_id = p_test_plan_id and test_case_id = p_test_case_id) then raise exception 'CASE_NOT_IN_PLAN'; end if;
  if p_browser not in ('chromium', 'firefox', 'webkit') then raise exception 'INVALID_BROWSER'; end if;
  if p_device_profile is not null and length(trim(p_device_profile)) not between 1 and 80 then raise exception 'INVALID_DEVICE_PROFILE'; end if;

  select * into v_script from automation_scripts
  where project_id = p_project_id and test_case_id = p_test_case_id;
  if not found then raise exception 'SCRIPT_NOT_MAPPED'; end if;

  insert into test_runs(test_plan_id, name, ci_provider, browser, device)
  values (p_test_plan_id, coalesce(nullif(trim(p_name), ''), 'Local single-case run'), 'automation', p_browser, nullif(trim(p_device_profile), ''))
  returning * into v_run;

  insert into test_results(test_run_id, test_case_id)
  values (v_run.id, p_test_case_id);

  insert into automation_jobs(project_id, test_run_id, test_case_id, script_ref, required_labels, max_attempts, browser, device_profile, created_by)
  values (p_project_id, v_run.id, p_test_case_id, v_script.script_ref, v_script.runner_labels, 1, p_browser, nullif(trim(p_device_profile), ''), p_created_by)
  returning * into v_job;

  perform integration_audit('automation_test_case_run_locally', p_project_id, v_run.id,
    jsonb_build_object('test_plan_id', p_test_plan_id, 'test_case_id', p_test_case_id, 'job_id', v_job.id));
  return jsonb_build_object('run_id', v_run.id, 'run_code', v_run.code, 'job_id', v_job.id);
end; $$ language plpgsql security definer set search_path = public;

revoke all on function run_automation_test_case_locally(uuid, uuid, uuid, text, text, text, uuid) from public, anon;
grant execute on function run_automation_test_case_locally(uuid, uuid, uuid, text, text, text, uuid) to authenticated;
