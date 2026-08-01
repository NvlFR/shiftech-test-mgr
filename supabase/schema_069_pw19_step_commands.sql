-- PW-19: UI-to-runner step commands. The runner polls these commands over its
-- existing outbound HTTPS connection; no inbound port is opened on the runner.

create table if not exists automation_job_commands (
  id bigint generated always as identity primary key,
  project_id uuid not null references projects(id) on delete cascade,
  job_id uuid not null references automation_jobs(id) on delete cascade,
  runner_id uuid not null references automation_runners(id) on delete cascade,
  command text not null check (command in ('next', 'continue')),
  status text not null default 'pending' check (status in ('pending', 'delivered')),
  requested_by uuid not null references profiles(id),
  requested_at timestamptz not null default now(),
  delivered_at timestamptz
);

create index if not exists idx_automation_job_commands_pending
  on automation_job_commands(runner_id, requested_at) where status = 'pending';

alter table automation_job_commands enable row level security;
create policy "project access - automation commands select" on automation_job_commands
  for select using (has_project_access(project_id));

create or replace function send_automation_job_command(p_job_id uuid, p_command text)
returns jsonb as $$
declare v_job automation_jobs; v_command automation_job_commands;
begin
  if p_command not in ('next', 'continue') then raise exception 'INVALID_STEP_COMMAND'; end if;
  select * into v_job from automation_jobs where id = p_job_id;
  if not found then raise exception 'JOB_NOT_FOUND'; end if;
  if not can_edit_project_content(v_job.project_id) then raise exception 'FORBIDDEN'; end if;
  if v_job.status <> 'running' or v_job.runner_id is null then raise exception 'JOB_NOT_RUNNING'; end if;
  insert into automation_job_commands(project_id, job_id, runner_id, command, requested_by)
  values (v_job.project_id, v_job.id, v_job.runner_id, p_command, auth.uid()) returning * into v_command;
  return jsonb_build_object('id', v_command.id, 'command', v_command.command, 'status', v_command.status);
end; $$ language plpgsql security definer set search_path = public;

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
end; $$ language plpgsql security definer set search_path = public;

revoke all on table automation_job_commands from anon, authenticated;
grant select on table automation_job_commands to authenticated;
revoke all on function send_automation_job_command(uuid, text) from public, anon;
grant execute on function send_automation_job_command(uuid, text) to authenticated;
revoke all on function poll_automation_job_commands(text, uuid) from public;
grant execute on function poll_automation_job_commands(text, uuid) to anon, authenticated;
