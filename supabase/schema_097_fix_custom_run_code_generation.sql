-- Fix: set_test_run_code() only resolved project_id via test_plan_id, so it
-- passed NULL project_id to next_entity_code() for ad-hoc/"custom" test runs
-- (test_plan_id is null, project scoped via custom_project_id instead — see
-- schema_031_structured_steps_custom_runs.sql). Any insert into test_runs
-- with test_plan_id null and no explicit code (e.g. mcp_enqueue_automation,
-- mcp_rerun_failed_automation in schema_055/056) failed with:
--   ERROR: 23502: null value in column "project_id" of relation
--   "entity_code_sequences" violates not-null constraint
-- The UI never hit this because testRunService always computes and passes an
-- explicit code for custom runs (see frontend/src/repositories/testRunRepository.ts),
-- which short-circuits the trigger's "if new.code is null" branch. Found
-- 2026-08-03 while enqueueing a real automation job for project LelangOps.

create or replace function set_test_run_code()
returns trigger as $$
declare
  v_project_id uuid;
begin
  if new.code is null or new.code = '' then
    select project_id into v_project_id from test_plans where id = new.test_plan_id;
    new.code := next_entity_code(coalesce(v_project_id, new.custom_project_id), 'TR');
  end if;
  return new;
end;
$$ language plpgsql;
