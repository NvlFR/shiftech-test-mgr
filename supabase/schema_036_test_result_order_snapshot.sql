-- Preserve test-case order for a run even when the source plan is reordered later.
alter table test_results add column if not exists "order" integer not null default 0;

update test_results tr
set "order" = tpc."order"
from test_runs run
join test_plans tp on tp.id = run.test_plan_id
join test_plan_cases tpc on tpc.test_plan_id = tp.id
where run.id = tr.test_run_id and tpc.test_case_id = tr.test_case_id;

create index if not exists idx_test_results_run_order on test_results (test_run_id, "order");
