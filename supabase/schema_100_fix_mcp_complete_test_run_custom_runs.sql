-- Fix: mcp_complete_test_run() joined test_runs to test_plans and matched
-- plan.project_id, so it could only ever complete plan-linked runs. Any
-- ad-hoc/"custom" run (test_plan_id null, project scoped via
-- custom_project_id instead — see schema_031_structured_steps_custom_runs.sql)
-- always raised IN_PROGRESS_TEST_RUN_NOT_FOUND, even with the correct
-- project/run id. This broke the MCP automation workflow end-to-end:
-- mcp_enqueue_automation() for a single Test Case creates exactly this kind
-- of run (see schema_055_mcp_automation.sql), so any run started via
-- testmanager.automation.enqueue could be executed and recorded but never
-- completed through testmanager.testrun.complete. Found 2026-08-03
-- completing a real automation run (TR-0004) for project LelangOps.

create or replace function mcp_complete_test_run(p_token text, p_project_id uuid, p_test_run_id uuid, p_notes text default null)
returns jsonb as $$
declare v_run test_runs%rowtype;
begin
  if not mcp_test_run_write_allowed(p_token,p_project_id) then raise exception 'MCP_WRITE_FORBIDDEN'; end if;
  -- Completion only occurs through this explicit call; result counts never infer it.
  update test_runs run set status='completed',completed_at=now(),notes=coalesce(p_notes,run.notes)
  from (select id, coalesce((select plan.project_id from test_plans plan where plan.id = tr.test_plan_id), tr.custom_project_id) as project_id
        from test_runs tr where tr.id = p_test_run_id) scoped
  where run.id=scoped.id and scoped.project_id=p_project_id and run.status='in_progress'
  returning run.* into v_run;
  if not found then raise exception 'IN_PROGRESS_TEST_RUN_NOT_FOUND'; end if;
  return jsonb_build_object('id',v_run.id,'code',v_run.code,'name',v_run.name,'status',v_run.status,
    'completed_at',v_run.completed_at,'summary',mcp_test_run_summary(v_run.id));
end;
$$ language plpgsql security definer set search_path = public, extensions;
