-- Test Run Enhancement: distribute the fixed run scope among registered testers.
-- Run after schema_011_environment_management.sql and schema_project_roles.sql.

create table if not exists test_run_assignments (
  id uuid primary key default gen_random_uuid(),
  test_run_id uuid not null references test_runs(id) on delete cascade,
  test_case_id uuid not null references test_cases(id) on delete cascade,
  tester_id uuid not null references profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (test_run_id, test_case_id)
);
create index if not exists idx_test_run_assignments_run on test_run_assignments (test_run_id);
create index if not exists idx_test_run_assignments_tester on test_run_assignments (tester_id);
drop trigger if exists trg_test_run_assignments_updated_at on test_run_assignments;
create trigger trg_test_run_assignments_updated_at before update on test_run_assignments
  for each row execute function set_updated_at();

alter table test_run_assignments enable row level security;
drop policy if exists "project access - test_run_assignments select" on test_run_assignments;
create policy "project access - test_run_assignments select" on test_run_assignments for select
  using (has_project_access((select tp.project_id from test_runs tr join test_plans tp on tp.id = tr.test_plan_id where tr.id = test_run_id)));
drop policy if exists "test runners - test_run_assignments insert" on test_run_assignments;
create policy "test runners - test_run_assignments insert" on test_run_assignments for insert
  with check (can_run_tests((select tp.project_id from test_runs tr join test_plans tp on tp.id = tr.test_plan_id where tr.id = test_run_id)));
drop policy if exists "test runners - test_run_assignments update" on test_run_assignments;
create policy "test runners - test_run_assignments update" on test_run_assignments for update
  using (can_run_tests((select tp.project_id from test_runs tr join test_plans tp on tp.id = tr.test_plan_id where tr.id = test_run_id)))
  with check (can_run_tests((select tp.project_id from test_plans tp join test_runs tr on tr.test_plan_id = tp.id where tr.id = test_run_id)));
drop policy if exists "project content deleters - test_run_assignments delete" on test_run_assignments;
create policy "project content deleters - test_run_assignments delete" on test_run_assignments for delete
  using (can_delete_project_content((select tp.project_id from test_runs tr join test_plans tp on tp.id = tr.test_plan_id where tr.id = test_run_id)));
