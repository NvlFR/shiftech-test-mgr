-- PW-05: persist environment metadata reported by the local Playwright runner.
-- Run after schema_060_pw02_browser_device_jobs.sql. Not executed automatically.

alter table automation_jobs
  add column if not exists environment_metadata jsonb not null default '{}'::jsonb
    check (jsonb_typeof(environment_metadata) = 'object');

create or replace function poll_automation_job(p_token text) returns jsonb as $$
declare v_runner automation_runners; v_job automation_jobs; v_case test_cases; v_run test_runs; v_environment environments; v_repository project_repositories; v_repository_token text; v_repository_payload jsonb := null;
begin
  select * into v_runner from automation_runners where active and token_hash = encode(digest(coalesce(p_token, ''), 'sha256'), 'hex');
  if not found then raise exception 'INVALID_RUNNER_TOKEN'; end if;
  update automation_runners set last_seen_at = now() where id = v_runner.id;
  select * into v_job from automation_jobs where project_id = v_runner.project_id and status = 'queued' and required_labels <@ v_runner.labels order by queued_at for update skip locked limit 1;
  if not found then return jsonb_build_object('job', null); end if;
  update automation_jobs set status = 'running', runner_id = v_runner.id, attempt = attempt + 1, started_at = now() where id = v_job.id returning * into v_job;
  select * into v_case from test_cases where id = v_job.test_case_id;
  select * into v_run from test_runs where id = v_job.test_run_id;
  if v_run.environment_id is not null then select * into v_environment from environments where id = v_run.environment_id; end if;
  select r.* into v_repository from project_repositories r where r.id = v_run.repository_id and r.project_id = v_job.project_id and r.is_active;
  if found then
    select s.decrypted_secret into v_repository_token from vault.decrypted_secrets s where s.id = v_repository.credential_id and (v_repository.credential_expires_at is null or v_repository.credential_expires_at > now());
    v_repository_payload := jsonb_build_object('id', v_repository.id, 'source_type', v_repository.source_type, 'url_or_path', v_repository.url_or_path, 'default_branch', v_repository.default_branch, 'subdirectory', v_repository.subdirectory, 'token', v_repository_token);
  end if;
  return jsonb_build_object('job', jsonb_build_object('id', v_job.id, 'test_run_id', v_job.test_run_id, 'test_case_id', v_job.test_case_id, 'test_case_code', v_case.code, 'test_case_title', v_case.title, 'script_ref', v_job.script_ref, 'attempt', v_job.attempt, 'max_attempts', v_job.max_attempts, 'browser', v_job.browser, 'device_profile', v_job.device_profile, 'base_url', v_environment.base_url, 'build_version', v_run.build_version, 'repository', v_repository_payload));
end; $$ language plpgsql security definer set search_path = public, vault, pg_temp;

create or replace function report_automation_job(p_token text, p_job_id uuid, p_payload jsonb) returns jsonb as $$
declare v_runner automation_runners; v_job automation_jobs; v_result_status text; v_final_status text; v_requeue boolean := false; v_environment jsonb;
begin
  select * into v_runner from automation_runners where active and token_hash = encode(digest(coalesce(p_token, ''), 'sha256'), 'hex');
  if not found then raise exception 'INVALID_RUNNER_TOKEN'; end if;
  update automation_runners set last_seen_at = now() where id = v_runner.id;
  select * into v_job from automation_jobs where id = p_job_id for update;
  if not found or v_job.runner_id <> v_runner.id or v_job.status <> 'running' then raise exception 'JOB_NOT_CLAIMED_BY_RUNNER'; end if;
  if jsonb_typeof(p_payload) <> 'object' or jsonb_typeof(p_payload->'environment') <> 'object' then raise exception 'INVALID_PAYLOAD'; end if;
  if (p_payload->>'result') not in ('pass', 'fail', 'blocked', 'skip') then raise exception 'INVALID_RESULT'; end if;
  v_environment := p_payload->'environment';
  if nullif(trim(v_environment->>'browser'), '') is null or nullif(trim(v_environment->>'browserVersion'), '') is null or nullif(trim(v_environment->>'os'), '') is null or jsonb_typeof(v_environment->'viewport') <> 'object' then raise exception 'INVALID_ENVIRONMENT_METADATA'; end if;
  v_result_status := p_payload->>'result';
  v_requeue := v_result_status <> 'pass' and coalesce((p_payload->>'retry')::boolean, false) and v_job.attempt < v_job.max_attempts;
  if v_requeue then
    update automation_jobs set status = 'queued', runner_id = null, started_at = null, artifacts = coalesce(p_payload->'artifacts', '[]'::jsonb), error_message = nullif(trim(p_payload->>'error_message'), ''), environment_metadata = v_environment where id = v_job.id;
    return jsonb_build_object('job_id', v_job.id, 'status', 'queued', 'requeued', true, 'attempt', v_job.attempt, 'max_attempts', v_job.max_attempts);
  end if;
  v_final_status := case when v_result_status = 'pass' then 'passed' else 'failed' end;
  update automation_jobs set status = v_final_status, finished_at = now(), artifacts = coalesce(p_payload->'artifacts', '[]'::jsonb), error_message = nullif(trim(p_payload->>'error_message'), ''), environment_metadata = v_environment where id = v_job.id;
  update test_results set status = v_result_status, executed_at = now(), notes = nullif(trim(p_payload->>'notes'), '') where test_run_id = v_job.test_run_id and test_case_id = v_job.test_case_id;
  update test_runs set commit_sha = coalesce(nullif(trim(v_environment->>'commitSha'), ''), commit_sha) where id = v_job.test_run_id;
  perform integration_audit('automation_job_reported', v_job.project_id, v_job.id, jsonb_build_object('result', v_result_status, 'status', v_final_status, 'attempt', v_job.attempt));
  return jsonb_build_object('job_id', v_job.id, 'status', v_final_status, 'requeued', false, 'result', v_result_status);
end; $$ language plpgsql security definer set search_path = public, extensions;

revoke all on function poll_automation_job(text) from public;
grant execute on function poll_automation_job(text) to anon, authenticated;
revoke all on function report_automation_job(text, uuid, jsonb) from public;
grant execute on function report_automation_job(text, uuid, jsonb) to anon, authenticated;
