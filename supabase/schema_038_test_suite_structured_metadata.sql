-- Additive compatibility migration for source-new Test Suite pages.
-- Run after schema_031_structured_steps_custom_runs.sql.

alter table test_cases
  add column if not exists step_type text not null default 'simple'
  check (step_type in ('simple', 'detailed'));

alter table test_suite_items
  add column if not exists module_name text,
  add column if not exists preconditions text,
  add column if not exists step_type text not null default 'simple',
  add column if not exists target_role text,
  add column if not exists tag_names text[] not null default '{}';

alter table test_suite_items
  drop constraint if exists test_suite_items_step_type_check;

alter table test_suite_items
  add constraint test_suite_items_step_type_check
  check (step_type in ('simple', 'detailed'));

create table if not exists test_suite_item_steps (
  id uuid primary key default gen_random_uuid(),
  suite_item_id uuid not null references test_suite_items(id) on delete cascade,
  step_number integer not null check (step_number > 0),
  action text not null check (length(trim(action)) > 0),
  expected_result text,
  unique (suite_item_id, step_number)
);

create index if not exists idx_test_suite_item_steps_item
  on test_suite_item_steps(suite_item_id, step_number);

alter table test_suite_item_steps enable row level security;

drop policy if exists "suite item steps read" on test_suite_item_steps;
create policy "suite item steps read" on test_suite_item_steps for select
  using (exists (
    select 1 from test_suite_items i
    join test_suites s on s.id = i.suite_id
    where i.id = suite_item_id
      and (s.owner_id = auth.uid() or s.visibility in ('unlisted', 'public') or is_admin())
  ));

drop policy if exists "suite item steps owner write" on test_suite_item_steps;
create policy "suite item steps owner write" on test_suite_item_steps for all
  using (exists (
    select 1 from test_suite_items i
    join test_suites s on s.id = i.suite_id
    where i.id = suite_item_id and (s.owner_id = auth.uid() or is_admin())
  ))
  with check (exists (
    select 1 from test_suite_items i
    join test_suites s on s.id = i.suite_id
    where i.id = suite_item_id and (s.owner_id = auth.uid() or is_admin())
  ));
