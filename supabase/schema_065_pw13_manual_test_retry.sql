-- PW-13: manually retry one automated Test Result in its existing Test Run.
-- Run after schema_064_pw12_run_single_locally.sql. Not executed automatically.

create or replace function retry_automation_test_result(
  p_test_result_id uuid,
  p_created_by uuid default auth.uid()
) returns jsonb as $$
declare
  v_result test_results;
  v_run test_runs;
  v_project_id uuid;
  v_script automation_scripts;
  v_previous_job automation_jobs;
  v_job automation_jobs;
begin
  if p_created_by is null or p_created_by <> auth.uid() then raise exception 'AUTH_REQUIRED'; end if;

  -- Serialize retries for this result so two clicks cannot enqueue duplicates.
  select * into v_result from test_results where id = p_test_result_id for update;
  if not found then raise exception 'RESULT_NOT_FOUND'; end if;

  select * into v_run from test_runs where id = v_result.test_run_id;
  v_project_id := coalesce(
    v_run.custom_project_id,
    (select project_id from test_plans where id = v_run.test_plan_id)
  );
  if v_project_id is null then raise exception 'PROJECT_NOT_FOUND'; end if;
  if not can_run_tests(v_project_id) then raise exception 'FORBIDDEN'; end if;

  if exists (
    select 1 from automation_jobs
    where test_run_id = v_result.test_run_id
      and test_case_id = v_result.test_case_id
      and status in ('queued', 'running')
  ) then raise exception 'RETRY_ALREADY_ACTIVE'; end if;

  select * into v_script from automation_scripts
  where project_id = v_project_id and test_case_id = v_result.test_case_id;
  if not found then raise exception 'SCRIPT_NOT_MAPPED'; end if;

  select * into v_previous_job from automation_jobs
  where test_run_id = v_result.test_run_id and test_case_id = v_result.test_case_id
  order by created_at desc
  limit 1;

  insert into automation_jobs(
    project_id, test_run_id, test_case_id, script_ref, required_labels,
    max_attempts, browser, device_profile, created_by
  ) values (
    v_project_id, v_result.test_run_id, v_result.test_case_id,
    v_script.script_ref, v_script.runner_labels, 1,
    coalesce(v_previous_job.browser, v_run.browser, 'chromium'),
    coalesce(v_previous_job.device_profile, v_run.device),
    p_created_by
  ) returning * into v_job;

  perform integration_audit(
    'automation_test_result_retry_queued',
    v_project_id,
    v_job.id,
    jsonb_build_object(
      'test_result_id', v_result.id,
      'test_run_id', v_result.test_run_id,
      'test_case_id', v_result.test_case_id
    )
  );

  return jsonb_build_object(
    'job_id', v_job.id,
    'test_result_id', v_result.id,
    'test_run_id', v_result.test_run_id
  );
end; $$ language plpgsql security definer set search_path = public;

revoke all on function retry_automation_test_result(uuid, uuid) from public, anon;
grant execute on function retry_automation_test_result(uuid, uuid) to authenticated;
