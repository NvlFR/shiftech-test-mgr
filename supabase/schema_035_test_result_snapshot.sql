-- Additive snapshot of test case content at the time a test result is created.
-- Run after schema_test_management_v2.sql (and after any later local schema files
-- that still keep test_results.test_case_id as the live-case foreign key).
--
-- The columns intentionally remain nullable: older rows may not have a recoverable
-- snapshot, and the local application continues to use test_case_id for the live
-- relationship. New runs populate these fields from the test case template.

alter table test_results add column if not exists test_case_code text;
alter table test_results add column if not exists test_case_title text;
alter table test_results add column if not exists test_case_objective text;
alter table test_results add column if not exists test_case_preconditions text;
alter table test_results add column if not exists test_case_steps text;
alter table test_results add column if not exists test_case_expected_result text;
alter table test_results add column if not exists test_case_priority text;

-- Best-effort backfill for results created before this migration. Do not overwrite
-- an existing snapshot, because it represents the historical run state.
update test_results tr
set
  test_case_code = tc.code,
  test_case_title = tc.title,
  test_case_objective = tc.objective,
  test_case_preconditions = tc.preconditions,
  test_case_steps = tc.steps,
  test_case_expected_result = tc.expected_result,
  test_case_priority = tc.priority
from test_cases tc
where tc.id = tr.test_case_id
  and tr.test_case_title is null;
