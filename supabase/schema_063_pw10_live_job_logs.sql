-- PW-10: append-only live output streamed by the local runner.
create table if not exists automation_job_logs (
  id bigint generated always as identity primary key,
  project_id uuid not null references projects(id) on delete cascade,
  job_id uuid not null references automation_jobs(id) on delete cascade,
  attempt integer not null check (attempt > 0),
  sequence integer not null check (sequence >= 0),
  stream text not null check (stream in ('stdout', 'stderr', 'system')),
  content text not null check (length(content) between 1 and 32768),
  created_at timestamptz not null default now(),
  unique (job_id, attempt, sequence)
);

create index if not exists idx_automation_job_logs_job
  on automation_job_logs(job_id, attempt, sequence);

alter table automation_job_logs enable row level security;

drop policy if exists "project access - automation job logs select" on automation_job_logs;
create policy "project access - automation job logs select" on automation_job_logs for select
  using (has_project_access(project_id));

create or replace function append_automation_job_log(
  p_token text,
  p_job_id uuid,
  p_attempt integer,
  p_sequence integer,
  p_stream text,
  p_content text
) returns jsonb as $$
declare v_runner automation_runners; v_job automation_jobs;
begin
  select * into v_runner from automation_runners
  where token_hash = encode(digest(p_token, 'sha256'), 'hex') and active;
  if v_runner.id is null then raise exception 'INVALID_RUNNER_TOKEN'; end if;

  select * into v_job from automation_jobs where id = p_job_id;
  if v_job.id is null or v_job.project_id <> v_runner.project_id or v_job.runner_id <> v_runner.id then
    raise exception 'JOB_NOT_ASSIGNED';
  end if;
  if v_job.status <> 'running' or v_job.attempt <> p_attempt then raise exception 'JOB_NOT_RUNNING'; end if;
  if p_sequence < 0 then raise exception 'INVALID_SEQUENCE'; end if;
  if p_stream not in ('stdout', 'stderr', 'system') then raise exception 'INVALID_STREAM'; end if;
  if length(coalesce(p_content, '')) not between 1 and 32768 then raise exception 'INVALID_CONTENT'; end if;

  insert into automation_job_logs(project_id, job_id, attempt, sequence, stream, content)
  values (v_job.project_id, v_job.id, p_attempt, p_sequence, p_stream, p_content)
  on conflict (job_id, attempt, sequence) do nothing;
  return jsonb_build_object('job_id', v_job.id, 'sequence', p_sequence);
end;
$$ language plpgsql security definer set search_path = public, extensions;

revoke all on function append_automation_job_log(text, uuid, integer, integer, text, text) from public;
grant execute on function append_automation_job_log(text, uuid, integer, integer, text, text) to anon, authenticated;

alter table automation_job_logs replica identity full;
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'automation_job_logs'
  ) then
    alter publication supabase_realtime add table public.automation_job_logs;
  end if;
end $$;
