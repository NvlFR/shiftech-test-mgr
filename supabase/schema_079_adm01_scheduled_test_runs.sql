-- ADM-01: recurring scheduled automation runs. pg_cron only enqueues work;
-- Playwright remains on the outbound-only local runner.
create extension if not exists pg_cron;

create table if not exists test_plan_schedules (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  test_plan_id uuid not null unique references test_plans(id) on delete cascade,
  name text not null default 'Scheduled automation run',
  next_run_at timestamptz not null,
  interval_days integer not null default 1 check (interval_days between 1 and 365),
  environment_id uuid references environments(id) on delete set null,
  browser text not null default 'chromium' check (browser in ('chromium','firefox','webkit')),
  device_profile text,
  max_attempts integer not null default 1 check (max_attempts between 1 and 10),
  pause_on_failure boolean not null default false,
  active boolean not null default true,
  last_enqueued_at timestamptz,
  created_by uuid not null references profiles(id) on delete restrict default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint test_plan_schedules_name_not_blank check (length(trim(name)) between 1 and 255),
  constraint test_plan_schedules_device_length check (device_profile is null or length(trim(device_profile)) between 1 and 80)
);
create index if not exists idx_test_plan_schedules_due on test_plan_schedules(next_run_at) where active;
drop trigger if exists trg_test_plan_schedules_updated_at on test_plan_schedules;
create trigger trg_test_plan_schedules_updated_at before update on test_plan_schedules
for each row execute function set_updated_at();

create or replace function validate_test_plan_schedule_scope()
returns trigger as $$
begin
  if not exists (
    select 1 from test_plans
    where id = new.test_plan_id and project_id = new.project_id
  ) then
    raise exception 'PLAN_PROJECT_MISMATCH';
  end if;
  if new.environment_id is not null and not exists (
    select 1 from environments
    where id = new.environment_id and project_id = new.project_id
  ) then
    raise exception 'ENVIRONMENT_PROJECT_MISMATCH';
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists trg_test_plan_schedule_scope on test_plan_schedules;
create trigger trg_test_plan_schedule_scope
before insert or update of project_id, test_plan_id, environment_id
on test_plan_schedules for each row
execute function validate_test_plan_schedule_scope();
revoke execute on function validate_test_plan_schedule_scope()
from public, anon, authenticated;

alter table test_plan_schedules enable row level security;
drop policy if exists "project access - schedules select" on test_plan_schedules;
create policy "project access - schedules select" on test_plan_schedules for select using (has_project_access(project_id));
drop policy if exists "project managers - schedules insert" on test_plan_schedules;
create policy "project managers - schedules insert" on test_plan_schedules for insert
with check (can_edit_project_content(project_id) and created_by = auth.uid());
drop policy if exists "project managers - schedules update" on test_plan_schedules;
create policy "project managers - schedules update" on test_plan_schedules for update using (can_edit_project_content(project_id)) with check (can_edit_project_content(project_id));
drop policy if exists "project managers - schedules delete" on test_plan_schedules;
create policy "project managers - schedules delete" on test_plan_schedules for delete using (can_edit_project_content(project_id));

create or replace function run_due_test_plan_schedules() returns integer as $$
declare v_schedule test_plan_schedules%rowtype; v_run test_runs%rowtype; v_count integer := 0;
begin
  for v_schedule in select * from test_plan_schedules where active and next_run_at <= now() order by next_run_at for update skip locked
  loop
    -- Advance first, including every missed interval, so one outage creates at
    -- most one catch-up run instead of a burst of duplicate historical runs.
    update test_plan_schedules set last_enqueued_at = now(),
      next_run_at = v_schedule.next_run_at +
        (floor(extract(epoch from (now() - v_schedule.next_run_at)) /
          (v_schedule.interval_days * 86400.0)) + 1) *
        make_interval(days => v_schedule.interval_days)
    where id = v_schedule.id;
    insert into test_runs(test_plan_id,name,ci_provider,environment_id,browser,device)
    values(v_schedule.test_plan_id,v_schedule.name,'automation',v_schedule.environment_id,v_schedule.browser,v_schedule.device_profile)
    returning * into v_run;
    insert into test_results(test_run_id,test_case_id)
      select v_run.id,test_case_id from test_plan_cases where test_plan_id=v_schedule.test_plan_id;
    insert into automation_jobs(project_id,test_run_id,test_case_id,script_ref,required_labels,max_attempts,browser,device_profile,pause_on_failure,created_by)
      select v_schedule.project_id,v_run.id,s.test_case_id,s.script_ref,s.runner_labels,v_schedule.max_attempts,v_schedule.browser,v_schedule.device_profile,v_schedule.pause_on_failure,v_schedule.created_by
      from automation_scripts s join test_plan_cases tpc on tpc.test_case_id=s.test_case_id and tpc.test_plan_id=v_schedule.test_plan_id
      where s.project_id=v_schedule.project_id;
    perform integration_audit('scheduled_automation_jobs_enqueued',v_schedule.project_id,v_run.id,jsonb_build_object('schedule_id',v_schedule.id,'test_plan_id',v_schedule.test_plan_id));
    v_count := v_count + 1;
  end loop;
  return v_count;
end; $$ language plpgsql security definer set search_path=public;
revoke all on function run_due_test_plan_schedules() from public,anon,authenticated;
-- pg_cron replaces an existing job with the same name, so rerunning this
-- migration does not create duplicate schedulers.
select cron.schedule(
  'scheduled-test-runs',
  '* * * * *',
  'select public.run_due_test_plan_schedules();'
);
