-- Supply the linked repository to a runner so script_ref can be resolved from it.
-- Run after schema_045_test_run_repository_traceability.sql.
-- Repository credentials are decrypted only while building the claimed job response.

create or replace function poll_automation_job(p_token text)
returns jsonb as $$
declare
  v_runner automation_runners;
  v_job automation_jobs;
  v_case test_cases;
  v_repository project_repositories;
  v_repository_token text;
  v_repository_payload jsonb := null;
begin
  select * into v_runner
  from automation_runners
  where active and token_hash = encode(digest(coalesce(p_token, ''), 'sha256'), 'hex');
  if not found then raise exception 'INVALID_RUNNER_TOKEN'; end if;
  update automation_runners set last_seen_at = now() where id = v_runner.id;

  select * into v_job from automation_jobs
  where project_id = v_runner.project_id and status = 'queued' and required_labels <@ v_runner.labels
  order by queued_at asc
  for update skip locked
  limit 1;
  if not found then return jsonb_build_object('job', null); end if;

  update automation_jobs
  set status = 'running', runner_id = v_runner.id, attempt = attempt + 1, started_at = now()
  where id = v_job.id returning * into v_job;
  select * into v_case from test_cases where id = v_job.test_case_id;

  select r, s.decrypted_secret into v_repository, v_repository_token
  from test_runs tr
  join project_repositories r on r.id = tr.repository_id and r.project_id = v_job.project_id and r.is_active
  left join vault.decrypted_secrets s
    on s.id = r.credential_id
   and (r.credential_expires_at is null or r.credential_expires_at > now())
  where tr.id = v_job.test_run_id;

  if found then
    v_repository_payload := jsonb_build_object(
      'id', v_repository.id,
      'source_type', v_repository.source_type,
      'url_or_path', v_repository.url_or_path,
      'default_branch', v_repository.default_branch,
      'subdirectory', v_repository.subdirectory,
      'token', v_repository_token
    );
  end if;

  return jsonb_build_object('job', jsonb_build_object(
    'id', v_job.id, 'test_run_id', v_job.test_run_id, 'test_case_id', v_job.test_case_id,
    'test_case_code', v_case.code, 'test_case_title', v_case.title, 'script_ref', v_job.script_ref,
    'attempt', v_job.attempt, 'max_attempts', v_job.max_attempts,
    'repository', v_repository_payload));
end; $$ language plpgsql security definer set search_path = public, vault, pg_temp;

revoke all on function poll_automation_job(text) from public;
grant execute on function poll_automation_job(text) to anon, authenticated;
