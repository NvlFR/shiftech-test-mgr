-- PW-06: link the complete Storage artifact bundle to its test result.
-- Run after schema_061_pw05_runner_environment_metadata.sql. Not executed automatically.

alter table test_results
  add column if not exists automation_artifacts jsonb not null default '[]'::jsonb
    check (jsonb_typeof(automation_artifacts) = 'array');

create or replace function report_automation_job(p_token text, p_job_id uuid, p_payload jsonb) returns jsonb as $$
declare v_runner automation_runners; v_job automation_jobs; v_result_status text; v_final_status text; v_requeue boolean := false; v_environment jsonb; v_artifacts jsonb;
begin
  select * into v_runner from automation_runners where active and token_hash = encode(digest(coalesce(p_token, ''), 'sha256'), 'hex');
  if not found then raise exception 'INVALID_RUNNER_TOKEN'; end if;
  update automation_runners set last_seen_at = now() where id = v_runner.id;
  select * into v_job from automation_jobs where id = p_job_id for update;
  if not found or v_job.runner_id <> v_runner.id or v_job.status <> 'running' then raise exception 'JOB_NOT_CLAIMED_BY_RUNNER'; end if;
  if jsonb_typeof(p_payload) <> 'object' or jsonb_typeof(p_payload->'environment') <> 'object' then raise exception 'INVALID_PAYLOAD'; end if;
  if (p_payload->>'result') not in ('pass', 'fail', 'blocked', 'skip') then raise exception 'INVALID_RESULT'; end if;
  v_environment := p_payload->'environment';
  v_artifacts := coalesce(p_payload->'artifacts', '[]'::jsonb);
  if jsonb_typeof(v_artifacts) <> 'array' then raise exception 'INVALID_ARTIFACTS'; end if;
  if exists (select 1 from jsonb_array_elements(v_artifacts) artifact where
    nullif(artifact->>'type', '') is null or artifact->>'type' not in ('screenshot','video','trace','log','network','dom') or
    nullif(artifact->>'name', '') is null or nullif(artifact->>'path', '') is null or artifact->>'bucket' <> 'automation-artifacts')
  then raise exception 'INVALID_ARTIFACT_METADATA'; end if;
  if (p_payload->>'result') = 'fail' and exists (
    select 1 from unnest(array['screenshot','video','trace','log','network','dom']) required_type
    where not exists (select 1 from jsonb_array_elements(v_artifacts) artifact where artifact->>'type' = required_type)
  ) then raise exception 'INCOMPLETE_FAILURE_ARTIFACT_BUNDLE'; end if;
  if nullif(trim(v_environment->>'browser'), '') is null or nullif(trim(v_environment->>'browserVersion'), '') is null or nullif(trim(v_environment->>'os'), '') is null or jsonb_typeof(v_environment->'viewport') <> 'object' then raise exception 'INVALID_ENVIRONMENT_METADATA'; end if;
  v_result_status := p_payload->>'result';
  v_requeue := v_result_status <> 'pass' and coalesce((p_payload->>'retry')::boolean, false) and v_job.attempt < v_job.max_attempts;
  if v_requeue then
    update automation_jobs set status = 'queued', runner_id = null, started_at = null, artifacts = v_artifacts, error_message = nullif(trim(p_payload->>'error_message'), ''), environment_metadata = v_environment where id = v_job.id;
    return jsonb_build_object('job_id', v_job.id, 'status', 'queued', 'requeued', true, 'attempt', v_job.attempt, 'max_attempts', v_job.max_attempts);
  end if;
  v_final_status := case when v_result_status = 'pass' then 'passed' else 'failed' end;
  update automation_jobs set status = v_final_status, finished_at = now(), artifacts = v_artifacts, error_message = nullif(trim(p_payload->>'error_message'), ''), environment_metadata = v_environment where id = v_job.id;
  update test_results set status = v_result_status, executed_at = now(), notes = nullif(trim(p_payload->>'notes'), ''), automation_artifacts = v_artifacts where test_run_id = v_job.test_run_id and test_case_id = v_job.test_case_id;
  update test_runs set commit_sha = coalesce(nullif(trim(v_environment->>'commitSha'), ''), commit_sha) where id = v_job.test_run_id;
  perform integration_audit('automation_job_reported', v_job.project_id, v_job.id, jsonb_build_object('result', v_result_status, 'status', v_final_status, 'attempt', v_job.attempt, 'artifact_count', jsonb_array_length(v_artifacts)));
  return jsonb_build_object('job_id', v_job.id, 'status', v_final_status, 'requeued', false, 'result', v_result_status);
end; $$ language plpgsql security definer set search_path = public, extensions;

revoke all on function report_automation_job(text, uuid, jsonb) from public;
grant execute on function report_automation_job(text, uuid, jsonb) to anon, authenticated;
