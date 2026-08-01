-- ADM-06: complete notification coverage for assignments, status changes, and
-- terminal automation results. Run after schema_081_adm04_team_management.sql.

alter table notifications add column if not exists test_case_id uuid references test_cases(id) on delete cascade;
alter table notifications add column if not exists test_run_id uuid references test_runs(id) on delete cascade;
alter table notifications add column if not exists automation_job_id uuid references automation_jobs(id) on delete cascade;
alter table notifications add column if not exists project_id uuid references projects(id) on delete cascade;

alter table notifications drop constraint if exists notifications_kind_check;
alter table notifications add constraint notifications_kind_check check (kind in (
  'issue_assigned', 'issue_status_changed', 'comment_mentioned',
  'test_case_assigned', 'test_case_status_changed', 'test_run_assigned',
  'test_run_status_changed', 'automation_completed'
));

create index if not exists idx_notifications_test_case on notifications(test_case_id) where test_case_id is not null;
create index if not exists idx_notifications_test_run on notifications(test_run_id) where test_run_id is not null;
create index if not exists idx_notifications_automation_job on notifications(automation_job_id) where automation_job_id is not null;

create or replace function notify_test_case_changes()
returns trigger as $$
begin
  if new.assigned_to is not null and new.assigned_to is distinct from old.assigned_to then
    insert into notifications(recipient_id, project_id, test_case_id, kind, message)
    values (new.assigned_to, new.project_id, new.id, 'test_case_assigned',
      'Test case ' || coalesce(new.code, new.title, new.id::text) || ' ditugaskan kepada Anda.');
  end if;
  if new.status is distinct from old.status and new.assigned_to is not null then
    insert into notifications(recipient_id, project_id, test_case_id, kind, message)
    values (new.assigned_to, new.project_id, new.id, 'test_case_status_changed',
      'Status test case ' || coalesce(new.code, new.title, new.id::text) || ' berubah menjadi ' || new.status || '.');
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists trg_test_case_notifications on test_cases;
create trigger trg_test_case_notifications after update of assigned_to, status on test_cases
for each row execute function notify_test_case_changes();

create or replace function notify_test_run_assignment()
returns trigger as $$
declare v_run test_runs; v_project_id uuid; v_case_code text;
begin
  if tg_op = 'UPDATE' and new.tester_id is not distinct from old.tester_id then return new; end if;
  select * into v_run from test_runs where id = new.test_run_id;
  select coalesce(tp.project_id, v_run.custom_project_id) into v_project_id from test_plans tp where tp.id = v_run.test_plan_id;
  v_project_id := coalesce(v_project_id, v_run.custom_project_id);
  select code into v_case_code from test_cases where id = new.test_case_id;
  insert into notifications(recipient_id, project_id, test_run_id, test_case_id, kind, message)
  values (new.tester_id, v_project_id, new.test_run_id, new.test_case_id, 'test_run_assigned',
    'Anda ditugaskan menjalankan test case ' || coalesce(v_case_code, new.test_case_id::text) || ' pada ' || coalesce(v_run.name, 'test run') || '.');
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists trg_test_run_assignment_notifications on test_run_assignments;
create trigger trg_test_run_assignment_notifications after insert or update of tester_id on test_run_assignments
for each row execute function notify_test_run_assignment();

create or replace function notify_test_run_status()
returns trigger as $$
declare v_project_id uuid; v_recipient uuid;
begin
  if new.status is not distinct from old.status then return new; end if;
  select coalesce(tp.project_id, new.custom_project_id) into v_project_id from test_plans tp where tp.id = new.test_plan_id;
  v_project_id := coalesce(v_project_id, new.custom_project_id);
  for v_recipient in select distinct tester_id from test_run_assignments where test_run_id = new.id loop
    insert into notifications(recipient_id, project_id, test_run_id, kind, message)
    values (v_recipient, v_project_id, new.id, 'test_run_status_changed',
      'Status test run ' || coalesce(new.name, new.id::text) || ' berubah menjadi ' || new.status || '.');
  end loop;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists trg_test_run_status_notifications on test_runs;
create trigger trg_test_run_status_notifications after update of status on test_runs
for each row execute function notify_test_run_status();

create or replace function notify_automation_result()
returns trigger as $$
declare v_case_code text;
begin
  if new.status not in ('passed', 'failed', 'canceled') or new.status is not distinct from old.status then return new; end if;
  select code into v_case_code from test_cases where id = new.test_case_id;
  insert into notifications(recipient_id, project_id, test_run_id, test_case_id, automation_job_id, kind, message)
  values (new.created_by, new.project_id, new.test_run_id, new.test_case_id, new.id, 'automation_completed',
    'Automation ' || coalesce(v_case_code, new.test_case_id::text) || ' selesai dengan hasil ' || new.status || '.');
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists trg_automation_result_notifications on automation_jobs;
create trigger trg_automation_result_notifications after update of status on automation_jobs
for each row execute function notify_automation_result();
