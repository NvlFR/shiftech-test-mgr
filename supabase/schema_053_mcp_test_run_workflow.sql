-- MCP-10 Test Run workflow. Run after schema_052_mcp_testplan_approval.sql.
-- This migration is not executed automatically.

create or replace function mcp_test_run_write_allowed(p_token text, p_project_id uuid)
returns boolean as $$
  select mcp_api_token_has_project(p_token,p_project_id) and exists (
    select 1 from api_tokens t
    where t.token_hash=encode(extensions.digest(p_token,'sha256'),'hex')
      and t.project_id=p_project_id and t.revoked_at is null
      and 'write:test-runs'=any(t.scopes)
  );
$$ language sql security definer set search_path=public,extensions stable;

create or replace function mcp_create_test_run(p_token text,p_project_id uuid,p_test_plan_id uuid,p_name text,p_notes text default null)
returns jsonb as $$
declare v_run test_runs%rowtype; v_case_count integer;
begin
  if not mcp_test_run_write_allowed(p_token,p_project_id) then raise exception 'MCP_WRITE_FORBIDDEN'; end if;
  if nullif(trim(p_name),'') is null then raise exception 'INVALID_RUN_NAME'; end if;
  if not exists(select 1 from test_plans where id=p_test_plan_id and project_id=p_project_id) then raise exception 'TEST_PLAN_NOT_FOUND'; end if;
  select count(*) into v_case_count from test_plan_cases where test_plan_id=p_test_plan_id;
  if v_case_count=0 then raise exception 'TEST_PLAN_HAS_NO_CASES'; end if;

  -- Always INSERT: a re-run is a distinct historical execution, never an update.
  insert into test_runs(test_plan_id,name,status,notes)
  values(p_test_plan_id,trim(p_name),'in_progress',p_notes) returning * into v_run;

  insert into test_results(test_run_id,test_case_id,test_case_code,test_case_title,test_case_objective,
    test_case_preconditions,test_case_steps,test_case_expected_result,test_case_priority,"order")
  select v_run.id,tc.id,tc.code,tc.title,tc.objective,tc.preconditions,tc.steps,tc.expected_result,tc.priority,tpc."order"
  from test_plan_cases tpc join test_cases tc on tc.id=tpc.test_case_id
  where tpc.test_plan_id=p_test_plan_id order by tpc."order";

  insert into test_result_steps(test_result_id,test_case_step_id,step_number,action,expected_result)
  select result.id,step.id,step.step_number,step.action,step.expected_result
  from test_results result join test_case_steps step on step.test_case_id=result.test_case_id
  where result.test_run_id=v_run.id;

  return jsonb_build_object('id',v_run.id,'code',v_run.code,'name',v_run.name,'status',v_run.status,
    'testplan_id',v_run.test_plan_id,'result_count',v_case_count,'started_at',v_run.started_at);
end;
$$ language plpgsql security definer set search_path=public,extensions;

create or replace function mcp_record_test_result(p_token text,p_project_id uuid,p_test_result_id uuid,p_tester_id uuid,p_status text,p_notes text default null)
returns jsonb as $$
declare v_result test_results%rowtype;
begin
  if not mcp_test_run_write_allowed(p_token,p_project_id) then raise exception 'MCP_WRITE_FORBIDDEN'; end if;
  if p_status not in ('pass','fail','skip','blocked') then raise exception 'INVALID_RESULT_STATUS'; end if;
  if not exists(select 1 from profiles where id=p_tester_id and role in ('user','admin') and deleted_at is null) then raise exception 'TESTER_NOT_FOUND'; end if;
  update test_results result set status=p_status,tester_id=p_tester_id,executed_at=now(),notes=p_notes
  from test_runs run left join test_plans plan on plan.id=run.test_plan_id
  where result.id=p_test_result_id and run.id=result.test_run_id
    and coalesce(plan.project_id,run.custom_project_id)=p_project_id and run.status='in_progress'
  returning result.* into v_result;
  if not found then raise exception 'IN_PROGRESS_TEST_RESULT_NOT_FOUND'; end if;
  return jsonb_build_object('id',v_result.id,'testrun_id',v_result.test_run_id,'testcase_id',v_result.test_case_id,
    'status',v_result.status,'tester_id',v_result.tester_id,'executed_at',v_result.executed_at,'notes',v_result.notes);
end;
$$ language plpgsql security definer set search_path=public,extensions;

create or replace function mcp_complete_test_run(p_token text,p_project_id uuid,p_test_run_id uuid,p_notes text default null)
returns jsonb as $$
declare v_run test_runs%rowtype;
begin
  if not mcp_test_run_write_allowed(p_token,p_project_id) then raise exception 'MCP_WRITE_FORBIDDEN'; end if;
  -- Completion only occurs through this explicit call; result counts never infer it.
  update test_runs run set status='completed',completed_at=now(),notes=coalesce(p_notes,run.notes)
  from test_plans plan
  where run.id=p_test_run_id and plan.id=run.test_plan_id and plan.project_id=p_project_id and run.status='in_progress'
  returning run.* into v_run;
  if not found then raise exception 'IN_PROGRESS_TEST_RUN_NOT_FOUND'; end if;
  return jsonb_build_object('id',v_run.id,'code',v_run.code,'name',v_run.name,'status',v_run.status,
    'completed_at',v_run.completed_at,'summary',mcp_test_run_summary(v_run.id));
end;
$$ language plpgsql security definer set search_path=public,extensions;

revoke all on function mcp_test_run_write_allowed(text,uuid) from public;
revoke all on function mcp_create_test_run(text,uuid,uuid,text,text) from public;
revoke all on function mcp_record_test_result(text,uuid,uuid,uuid,text,text) from public;
revoke all on function mcp_complete_test_run(text,uuid,uuid,text) from public;
grant execute on function mcp_create_test_run(text,uuid,uuid,text,text),mcp_record_test_result(text,uuid,uuid,uuid,text,text),mcp_complete_test_run(text,uuid,uuid,text) to anon;
