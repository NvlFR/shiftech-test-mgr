-- Fix: poll_automation_job_commands() (schema_069_pw19_step_commands.sql) was
-- created with search_path = 'public' only, missing 'extensions' where
-- pgcrypto's digest() lives — same regression class as poll_automation_job
-- (see schema_098). Every runner step-command poll during an active job
-- failed silently (caught + logged as a warning, non-fatal, but the
-- pause-on-failure step-through feature was completely broken). Found
-- 2026-08-03 running a real automation job end-to-end for project LelangOps.

create or replace function poll_automation_job_commands(p_token text, p_job_id uuid)
returns jsonb as $$
declare v_runner automation_runners; v_job automation_jobs; v_commands jsonb;
begin
  select * into v_runner from automation_runners
    where active and token_hash = encode(digest(coalesce(p_token, ''), 'sha256'), 'hex');
  if not found then raise exception 'INVALID_RUNNER_TOKEN'; end if;
  select * into v_job from automation_jobs where id = p_job_id and runner_id = v_runner.id and status = 'running';
  if not found then raise exception 'JOB_NOT_OWNED'; end if;
  with delivered as (
    update automation_job_commands set status = 'delivered', delivered_at = now()
    where id in (
      select id from automation_job_commands
      where runner_id = v_runner.id and job_id = p_job_id and status = 'pending'
      order by requested_at for update skip locked limit 20
    ) returning id, command, requested_at
  ) select coalesce(jsonb_agg(jsonb_build_object('id', id, 'command', command, 'requested_at', requested_at) order by id), '[]'::jsonb)
    into v_commands from delivered;
  return jsonb_build_object('commands', v_commands);
end; $$ language plpgsql security definer set search_path = public, extensions;
