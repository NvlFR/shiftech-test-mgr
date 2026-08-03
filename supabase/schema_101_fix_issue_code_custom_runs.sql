-- Fix: set_issue_code() (schema_issue_code.sql) only resolved project_id via
-- test_result -> test_run -> test_plan, the same bug class as
-- set_test_run_code() (schema_097_fix_custom_run_code_generation.sql) and
-- mcp_complete_test_run() (schema_100). Any Issue created from a Test Result
-- that belongs to an ad-hoc/custom Test Run (test_plan_id null, project
-- scoped via custom_project_id — see schema_031_structured_steps_custom_runs.sql)
-- failed with the same "null value in column project_id of relation
-- entity_code_sequences" error. This meant Issues could never be filed
-- against automation-run results (mcp_enqueue_automation always creates a
-- custom run for a single Test Case — see schema_055) via testmanager.issue.create.
-- Found 2026-08-03 filing a real Issue for a bug discovered while running
-- headed automation for project LelangOps (TC-0006).

create or replace function set_issue_code()
returns trigger as $$
declare
  v_project_id uuid;
begin
  if new.code is null or new.code = '' then
    select coalesce(tp.project_id, run.custom_project_id) into v_project_id
    from test_results tr
    join test_runs run on run.id = tr.test_run_id
    left join test_plans tp on tp.id = run.test_plan_id
    where tr.id = new.test_result_id;

    new.code := next_entity_code(v_project_id, 'ISS');
  end if;
  return new;
end;
$$ language plpgsql;
