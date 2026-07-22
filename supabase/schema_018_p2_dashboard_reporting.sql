-- P2 Dashboard Trend and Reporting.
-- Run after schema_017_p1_rpc_hardening.sql.
-- Reporting is computed from live test_runs/test_results/issues rows; these
-- indexes only improve read performance and do not introduce cached summaries.

create index if not exists idx_test_runs_reporting_started_at
  on test_runs (started_at desc, test_plan_id);
create index if not exists idx_test_runs_reporting_environment_release
  on test_runs (environment_id, release, started_at desc);
create index if not exists idx_test_results_reporting_run_tester_status
  on test_results (test_run_id, tester_id, status);
create index if not exists idx_issues_reporting_result_created_at
  on issues (test_result_id, created_at desc);

-- Audit logs are read-only evidence for approved users. No reporting client
-- receives write access to audit_logs, and no secret/report payload is stored.
drop policy if exists "approved users - audit logs" on audit_logs;
create policy "approved users - audit logs" on audit_logs
  for select using (is_approved());
