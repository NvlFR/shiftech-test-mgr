-- PW-18: keep the local Playwright browser open after a failed job so the
-- tester can inspect the current page state before allowing teardown.

alter table automation_jobs
  add column if not exists pause_on_failure boolean not null default false;

drop function if exists enqueue_automation_jobs(uuid, uuid, text, uuid, integer, uuid, text, text);
create or replace function enqueue_automation_jobs(
  p_project_id uuid,
  p_test_plan_id uuid,
  p_name text default null,
  p_environment_id uuid default null,
  p_max_attempts integer default 1,
  p_created_by uuid default auth.uid(),
  p_browser text default 'chromium',
  p_device_profile text default null,
  p_pause_on_failure boolean default false
) returns jsonb as $$
declare v_run test_runs; v_job_count integer := 0; v_max integer := coalesce(p_max_attempts, 1);
begin
  if p_created_by is null or p_created_by <> auth.uid() then raise exception 'AUTH_REQUIRED'; end if;
  if not can_edit_project_content(p_project_id) then raise exception 'FORBIDDEN'; end if;
  if p_test_plan_id is null or (select project_id from test_plans where id = p_test_plan_id) <> p_project_id then raise exception 'PLAN_PROJECT_MISMATCH'; end if;
  if v_max not between 1 and 10 then raise exception 'INVALID_MAX_ATTEMPTS'; end if;
  if p_browser not in ('chromium', 'firefox', 'webkit') then raise exception 'INVALID_BROWSER'; end if;
  if p_device_profile is not null and length(trim(p_device_profile)) not between 1 and 80 then raise exception 'INVALID_DEVICE_PROFILE'; end if;

  insert into test_runs(test_plan_id, name, ci_provider, environment_id, browser, device)
  values (p_test_plan_id, coalesce(nullif(trim(p_name), ''), 'Automation run'), 'automation', p_environment_id, p_browser, nullif(trim(p_device_profile), ''))
  returning * into v_run;
  insert into test_results(test_run_id, test_case_id)
  select v_run.id, tpc.test_case_id from test_plan_cases tpc where tpc.test_plan_id = p_test_plan_id;
  insert into automation_jobs(project_id, test_run_id, test_case_id, script_ref, required_labels, max_attempts, browser, device_profile, pause_on_failure, created_by)
  select p_project_id, v_run.id, s.test_case_id, s.script_ref, s.runner_labels, v_max, p_browser, nullif(trim(p_device_profile), ''), coalesce(p_pause_on_failure, false), p_created_by
  from automation_scripts s join test_plan_cases tpc on tpc.test_case_id = s.test_case_id and tpc.test_plan_id = p_test_plan_id
  where s.project_id = p_project_id;
  get diagnostics v_job_count = row_count;
  perform integration_audit('automation_jobs_enqueued', p_project_id, v_run.id, jsonb_build_object('test_plan_id', p_test_plan_id, 'job_count', v_job_count, 'browser', p_browser, 'device_profile', p_device_profile, 'pause_on_failure', coalesce(p_pause_on_failure, false)));
  return jsonb_build_object('run_id', v_run.id, 'run_code', v_run.code, 'job_count', v_job_count);
end; $$ language plpgsql security definer set search_path = public;

drop function if exists run_automation_test_case_locally(uuid, uuid, uuid, text, text, text, uuid);
create or replace function run_automation_test_case_locally(
  p_project_id uuid,
  p_test_plan_id uuid,
  p_test_case_id uuid,
  p_name text default null,
  p_browser text default 'chromium',
  p_device_profile text default null,
  p_created_by uuid default auth.uid(),
  p_pause_on_failure boolean default false
) returns jsonb as $$
declare v_run test_runs; v_script automation_scripts; v_job automation_jobs;
begin
  if p_created_by is null or p_created_by <> auth.uid() then raise exception 'AUTH_REQUIRED'; end if;
  if not can_edit_project_content(p_project_id) then raise exception 'FORBIDDEN'; end if;
  if (select project_id from test_plans where id = p_test_plan_id) is distinct from p_project_id then raise exception 'PLAN_PROJECT_MISMATCH'; end if;
  if not exists (select 1 from test_plan_cases where test_plan_id = p_test_plan_id and test_case_id = p_test_case_id) then raise exception 'CASE_NOT_IN_PLAN'; end if;
  if p_browser not in ('chromium', 'firefox', 'webkit') then raise exception 'INVALID_BROWSER'; end if;
  if p_device_profile is not null and length(trim(p_device_profile)) not between 1 and 80 then raise exception 'INVALID_DEVICE_PROFILE'; end if;
  select * into v_script from automation_scripts where project_id = p_project_id and test_case_id = p_test_case_id;
  if not found then raise exception 'SCRIPT_NOT_MAPPED'; end if;

  insert into test_runs(test_plan_id, name, ci_provider, browser, device)
  values (p_test_plan_id, coalesce(nullif(trim(p_name), ''), 'Local single-case run'), 'automation', p_browser, nullif(trim(p_device_profile), '')) returning * into v_run;
  insert into test_results(test_run_id, test_case_id) values (v_run.id, p_test_case_id);
  insert into automation_jobs(project_id, test_run_id, test_case_id, script_ref, required_labels, max_attempts, browser, device_profile, pause_on_failure, created_by)
  values (p_project_id, v_run.id, p_test_case_id, v_script.script_ref, v_script.runner_labels, 1, p_browser, nullif(trim(p_device_profile), ''), coalesce(p_pause_on_failure, false), p_created_by) returning * into v_job;
  perform integration_audit('automation_test_case_run_locally', p_project_id, v_run.id,
    jsonb_build_object('test_plan_id', p_test_plan_id, 'test_case_id', p_test_case_id, 'job_id', v_job.id, 'pause_on_failure', coalesce(p_pause_on_failure, false)));
  return jsonb_build_object('run_id', v_run.id, 'run_code', v_run.code, 'job_id', v_job.id);
end; $$ language plpgsql security definer set search_path = public;

create or replace function poll_automation_job(p_token text) returns jsonb as $$
declare v_runner automation_runners; v_job automation_jobs; v_case test_cases; v_repository project_repositories; v_repository_token text; v_repository_payload jsonb := null;
begin
  select * into v_runner from automation_runners where active and token_hash = encode(digest(coalesce(p_token, ''), 'sha256'), 'hex');
  if not found then raise exception 'INVALID_RUNNER_TOKEN'; end if;
  update automation_runners set last_seen_at = now() where id = v_runner.id;
  select * into v_job from automation_jobs where project_id = v_runner.project_id and status = 'queued' and required_labels <@ v_runner.labels order by queued_at for update skip locked limit 1;
  if not found then return jsonb_build_object('job', null); end if;
  update automation_jobs set status = 'running', runner_id = v_runner.id, attempt = attempt + 1, started_at = now() where id = v_job.id returning * into v_job;
  select * into v_case from test_cases where id = v_job.test_case_id;
  select r.* into v_repository from test_runs tr join project_repositories r on r.id = tr.repository_id and r.project_id = v_job.project_id and r.is_active where tr.id = v_job.test_run_id;
  if found then
    select s.decrypted_secret into v_repository_token from vault.decrypted_secrets s where s.id = v_repository.credential_id and (v_repository.credential_expires_at is null or v_repository.credential_expires_at > now());
    v_repository_payload := jsonb_build_object('id', v_repository.id, 'source_type', v_repository.source_type, 'url_or_path', v_repository.url_or_path, 'default_branch', v_repository.default_branch, 'subdirectory', v_repository.subdirectory, 'token', v_repository_token);
  end if;
  return jsonb_build_object('job', jsonb_build_object('id', v_job.id, 'test_run_id', v_job.test_run_id, 'test_case_id', v_job.test_case_id, 'test_case_code', v_case.code, 'test_case_title', v_case.title, 'script_ref', v_job.script_ref, 'attempt', v_job.attempt, 'max_attempts', v_job.max_attempts, 'browser', v_job.browser, 'device_profile', v_job.device_profile, 'pause_on_failure', v_job.pause_on_failure, 'repository', v_repository_payload));
end; $$ language plpgsql security definer set search_path = public, vault, pg_temp;

revoke all on function enqueue_automation_jobs(uuid, uuid, text, uuid, integer, uuid, text, text, boolean) from public, anon;
grant execute on function enqueue_automation_jobs(uuid, uuid, text, uuid, integer, uuid, text, text, boolean) to authenticated;
revoke all on function run_automation_test_case_locally(uuid, uuid, uuid, text, text, text, uuid, boolean) from public, anon;
grant execute on function run_automation_test_case_locally(uuid, uuid, uuid, text, text, text, uuid, boolean) to authenticated;
revoke all on function poll_automation_job(text) from public;
grant execute on function poll_automation_job(text) to anon, authenticated;
