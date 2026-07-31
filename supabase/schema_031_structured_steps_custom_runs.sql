-- Structured test steps, per-result step checklist, and custom/ad-hoc runs.
-- Run after schema_030_test_suite_library.sql.

create table if not exists test_case_steps (
  id uuid primary key default gen_random_uuid(),
  test_case_id uuid not null references test_cases(id) on delete cascade,
  step_number integer not null check (step_number > 0),
  action text not null check (length(trim(action)) > 0),
  expected_result text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (test_case_id, step_number)
);

alter table test_runs alter column test_plan_id drop not null;
alter table test_runs add column if not exists custom_project_id uuid references projects(id) on delete cascade;
alter table test_runs add column if not exists is_custom boolean not null default false;

create table if not exists test_run_cases (
  id uuid primary key default gen_random_uuid(),
  test_run_id uuid not null references test_runs(id) on delete cascade,
  test_case_id uuid not null references test_cases(id) on delete restrict,
  order_index integer not null default 0,
  unique (test_run_id, test_case_id)
);

create table if not exists test_result_steps (
  id uuid primary key default gen_random_uuid(),
  test_result_id uuid not null references test_results(id) on delete cascade,
  test_case_step_id uuid not null references test_case_steps(id) on delete restrict,
  step_number integer not null,
  action text not null,
  expected_result text,
  status text not null default 'not_run' check (status in ('pass', 'fail', 'not_run')),
  notes text,
  updated_at timestamptz not null default now(),
  unique (test_result_id, test_case_step_id)
);

create index if not exists idx_test_case_steps_case on test_case_steps(test_case_id, step_number);
create index if not exists idx_test_run_cases_run on test_run_cases(test_run_id, order_index);
create index if not exists idx_test_result_steps_result on test_result_steps(test_result_id, step_number);

-- Extend the existing test-run/result policies to cover ad-hoc runs whose
-- project scope lives in custom_project_id instead of test_plans.
drop policy if exists "project access - test_runs select" on test_runs;
drop policy if exists "test runners - test_runs insert" on test_runs;
drop policy if exists "test runners - test_runs update" on test_runs;
drop policy if exists "project content deleters - test_runs delete" on test_runs;
create policy "project access - test_runs select" on test_runs for select
  using (has_project_access((select coalesce(tp.project_id, tr.custom_project_id) from test_runs tr left join test_plans tp on tp.id = tr.test_plan_id where tr.id = test_runs.id)));
create policy "test runners - test_runs insert" on test_runs for insert
  with check (can_run_tests(coalesce(custom_project_id, (select project_id from test_plans where id = test_plan_id))));
create policy "test runners - test_runs update" on test_runs for update
  using (can_run_tests((select coalesce(tp.project_id, tr.custom_project_id) from test_runs tr left join test_plans tp on tp.id = tr.test_plan_id where tr.id = test_runs.id)))
  with check (can_run_tests(coalesce(custom_project_id, (select project_id from test_plans where id = test_plan_id))));
create policy "project content deleters - test_runs delete" on test_runs for delete
  using (can_delete_project_content((select coalesce(tp.project_id, tr.custom_project_id) from test_runs tr left join test_plans tp on tp.id = tr.test_plan_id where tr.id = test_runs.id)));

drop policy if exists "project access - test_results select" on test_results;
drop policy if exists "test runners - test_results insert" on test_results;
drop policy if exists "test runners - test_results update" on test_results;
drop policy if exists "project content deleters - test_results delete" on test_results;
create policy "project access - test_results select" on test_results for select
  using (has_project_access((select coalesce(tp.project_id, tr.custom_project_id) from test_runs tr left join test_plans tp on tp.id = tr.test_plan_id where tr.id = test_run_id)));
create policy "test runners - test_results insert" on test_results for insert
  with check (can_run_tests((select coalesce(tp.project_id, tr.custom_project_id) from test_runs tr left join test_plans tp on tp.id = tr.test_plan_id where tr.id = test_run_id)));
create policy "test runners - test_results update" on test_results for update
  using (can_run_tests((select coalesce(tp.project_id, tr.custom_project_id) from test_runs tr left join test_plans tp on tp.id = tr.test_plan_id where tr.id = test_run_id)))
  with check (can_run_tests((select coalesce(tp.project_id, tr.custom_project_id) from test_runs tr left join test_plans tp on tp.id = tr.test_plan_id where tr.id = test_run_id)));
create policy "project content deleters - test_results delete" on test_results for delete
  using (can_delete_project_content((select coalesce(tp.project_id, tr.custom_project_id) from test_runs tr left join test_plans tp on tp.id = tr.test_plan_id where tr.id = test_run_id)));

alter table test_case_steps enable row level security;
alter table test_run_cases enable row level security;
alter table test_result_steps enable row level security;

create policy "project access - test_case_steps" on test_case_steps for all
  using (has_project_access((select project_id from test_cases where id = test_case_id)))
  with check (has_project_access((select project_id from test_cases where id = test_case_id)));
create policy "project access - test_run_cases" on test_run_cases for all
  using (has_project_access((select coalesce(tp.project_id, tr.custom_project_id) from test_runs tr left join test_plans tp on tp.id = tr.test_plan_id where tr.id = test_run_id)))
  with check (has_project_access((select coalesce(tp.project_id, tr.custom_project_id) from test_runs tr left join test_plans tp on tp.id = tr.test_plan_id where tr.id = test_run_id)));
create policy "project access - test_result_steps" on test_result_steps for all
  using (has_project_access((select coalesce(tp.project_id, tr.custom_project_id) from test_results r join test_runs tr on tr.id = r.test_run_id left join test_plans tp on tp.id = tr.test_plan_id where r.id = test_result_id)))
  with check (has_project_access((select coalesce(tp.project_id, tr.custom_project_id) from test_results r join test_runs tr on tr.id = r.test_run_id left join test_plans tp on tp.id = tr.test_plan_id where r.id = test_result_id)));
