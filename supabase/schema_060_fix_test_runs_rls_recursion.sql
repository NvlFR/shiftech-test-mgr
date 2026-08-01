-- Fix recursive RLS introduced by schema_031_structured_steps_custom_runs.sql.
-- Run after schema_059_mcp_rate_limit_audit.sql.
--
-- A policy on test_runs must not query test_runs again: PostgreSQL evaluates the
-- same policy for that inner query and raises 42P17 (infinite recursion). The
-- project scope is already available on the current row through custom_project_id
-- or its test_plan_id, so use those values directly.

drop policy if exists "project access - test_runs select" on test_runs;
create policy "project access - test_runs select" on test_runs for select
  using (
    has_project_access(
      coalesce(
        custom_project_id,
        (select project_id from test_plans where id = test_plan_id)
      )
    )
  );

drop policy if exists "test runners - test_runs update" on test_runs;
create policy "test runners - test_runs update" on test_runs for update
  using (
    can_run_tests(
      coalesce(
        custom_project_id,
        (select project_id from test_plans where id = test_plan_id)
      )
    )
  )
  with check (
    can_run_tests(
      coalesce(
        custom_project_id,
        (select project_id from test_plans where id = test_plan_id)
      )
    )
  );

drop policy if exists "project content deleters - test_runs delete" on test_runs;
create policy "project content deleters - test_runs delete" on test_runs for delete
  using (
    can_delete_project_content(
      coalesce(
        custom_project_id,
        (select project_id from test_plans where id = test_plan_id)
      )
    )
  );
