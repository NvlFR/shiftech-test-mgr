-- MCP-12 Automation tools. Run after schema_054_mcp_issue_workflow.sql.
-- This migration is not executed automatically.

create or replace function mcp_automation_write_allowed(p_token text,p_project_id uuid)
returns boolean as $$
  select mcp_api_token_has_project(p_token,p_project_id) and exists (
    select 1 from api_tokens t where t.token_hash=encode(extensions.digest(p_token,'sha256'),'hex')
      and t.project_id=p_project_id and t.revoked_at is null and 'write:automation'=any(t.scopes)
  );
$$ language sql security definer set search_path=public,extensions stable;

create or replace function mcp_map_automation_script(p_token text,p_project_id uuid,p_test_case_id uuid,p_script_ref text,p_runner_labels text[] default '{}')
returns jsonb as $$
declare v_script automation_scripts%rowtype; v_author uuid;
begin
  if not mcp_automation_write_allowed(p_token,p_project_id) then raise exception 'MCP_WRITE_FORBIDDEN'; end if;
  if char_length(trim(coalesce(p_script_ref,''))) not between 1 and 500 then raise exception 'INVALID_SCRIPT_REF'; end if;
  if not exists(select 1 from test_cases where id=p_test_case_id and project_id=p_project_id) then raise exception 'TEST_CASE_NOT_FOUND'; end if;
  select created_by into v_author from api_tokens where token_hash=encode(extensions.digest(p_token,'sha256'),'hex') and revoked_at is null;
  insert into automation_scripts(project_id,test_case_id,script_ref,runner_labels,created_by)
  values(p_project_id,p_test_case_id,trim(p_script_ref),coalesce(p_runner_labels,'{}'),v_author)
  on conflict(test_case_id) do update set script_ref=excluded.script_ref,runner_labels=excluded.runner_labels
  returning * into v_script;
  return jsonb_build_object('id',v_script.id,'testcase_id',v_script.test_case_id,'script_ref',v_script.script_ref,'runner_labels',v_script.runner_labels,'updated_at',v_script.updated_at);
end;
$$ language plpgsql security definer set search_path=public,extensions;

create or replace function mcp_enqueue_automation(p_token text,p_project_id uuid,p_test_case_id uuid default null,p_test_plan_id uuid default null,p_name text default null,p_runner_labels text[] default '{}',p_max_attempts integer default 1)
returns jsonb as $$
declare v_run test_runs%rowtype; v_author uuid; v_count integer; v_script automation_scripts%rowtype;
begin
  if not mcp_automation_write_allowed(p_token,p_project_id) then raise exception 'MCP_WRITE_FORBIDDEN'; end if;
  if (p_test_case_id is null)=(p_test_plan_id is null) then raise exception 'EXACTLY_ONE_AUTOMATION_TARGET_REQUIRED'; end if;
  if p_max_attempts not between 1 and 10 then raise exception 'INVALID_MAX_ATTEMPTS'; end if;
  select created_by into v_author from api_tokens where token_hash=encode(extensions.digest(p_token,'sha256'),'hex') and revoked_at is null;

  if p_test_plan_id is not null then
    if not exists(select 1 from test_plans where id=p_test_plan_id and project_id=p_project_id) then raise exception 'TEST_PLAN_NOT_FOUND'; end if;
    insert into test_runs(test_plan_id,name,status,ci_provider) values(p_test_plan_id,coalesce(nullif(trim(p_name),''),'Automation run'),'in_progress','automation') returning * into v_run;
    insert into test_results(test_run_id,test_case_id,test_case_code,test_case_title,test_case_objective,test_case_preconditions,test_case_steps,test_case_expected_result,test_case_priority,"order")
    select v_run.id,tc.id,tc.code,tc.title,tc.objective,tc.preconditions,tc.steps,tc.expected_result,tc.priority,tpc."order" from test_plan_cases tpc join test_cases tc on tc.id=tpc.test_case_id where tpc.test_plan_id=p_test_plan_id;
    insert into test_result_steps(test_result_id,test_case_step_id,step_number,action,expected_result)
    select r.id,s.id,s.step_number,s.action,s.expected_result from test_results r join test_case_steps s on s.test_case_id=r.test_case_id where r.test_run_id=v_run.id;
    insert into automation_jobs(project_id,test_run_id,test_case_id,script_ref,required_labels,max_attempts,created_by)
    select p_project_id,v_run.id,s.test_case_id,s.script_ref,(select array(select distinct x from unnest(s.runner_labels||coalesce(p_runner_labels,'{}')) x)),p_max_attempts,v_author
    from automation_scripts s join test_plan_cases tpc on tpc.test_case_id=s.test_case_id and tpc.test_plan_id=p_test_plan_id where s.project_id=p_project_id;
  else
    select * into v_script from automation_scripts where project_id=p_project_id and test_case_id=p_test_case_id;
    if not found then raise exception 'AUTOMATION_SCRIPT_NOT_MAPPED'; end if;
    insert into test_runs(custom_project_id,name,status,ci_provider) values(p_project_id,coalesce(nullif(trim(p_name),''),'Automation run'),'in_progress','automation') returning * into v_run;
    insert into test_results(test_run_id,test_case_id,test_case_code,test_case_title,test_case_objective,test_case_preconditions,test_case_steps,test_case_expected_result,test_case_priority,"order")
    select v_run.id,tc.id,tc.code,tc.title,tc.objective,tc.preconditions,tc.steps,tc.expected_result,tc.priority,1 from test_cases tc where tc.id=p_test_case_id and tc.project_id=p_project_id;
    if not found then raise exception 'TEST_CASE_NOT_FOUND'; end if;
    insert into test_result_steps(test_result_id,test_case_step_id,step_number,action,expected_result)
    select r.id,s.id,s.step_number,s.action,s.expected_result from test_results r join test_case_steps s on s.test_case_id=r.test_case_id where r.test_run_id=v_run.id;
    insert into automation_jobs(project_id,test_run_id,test_case_id,script_ref,required_labels,max_attempts,created_by)
    values(p_project_id,v_run.id,p_test_case_id,v_script.script_ref,(select array(select distinct x from unnest(v_script.runner_labels||coalesce(p_runner_labels,'{}')) x)),p_max_attempts,v_author);
  end if;
  get diagnostics v_count=row_count;
  return jsonb_build_object('run_id',v_run.id,'run_code',v_run.code,'job_count',v_count);
end;
$$ language plpgsql security definer set search_path=public,extensions;

create or replace function mcp_automation_job_status(p_token text,p_project_id uuid,p_job_id uuid)
returns jsonb as $$
  select jsonb_build_object('id',j.id,'test_run_id',j.test_run_id,'testcase_id',j.test_case_id,'script_ref',j.script_ref,'required_labels',j.required_labels,'status',j.status,'attempt',j.attempt,'max_attempts',j.max_attempts,'runner_id',j.runner_id,'error_message',j.error_message,'queued_at',j.queued_at,'started_at',j.started_at,'finished_at',j.finished_at)
  from automation_jobs j where mcp_api_token_has_project(p_token,p_project_id) and j.project_id=p_project_id and j.id=p_job_id;
$$ language sql security definer set search_path=public,extensions stable;

create or replace function mcp_automation_runner_list(p_token text,p_project_id uuid)
returns jsonb as $$
  select coalesce(jsonb_agg(jsonb_build_object('id',r.id,'name',r.name,'labels',r.labels,'active',r.active,'status',case when r.active and r.last_seen_at >= now()-interval '90 seconds' then 'online' else 'offline' end,'last_seen_at',r.last_seen_at) order by r.name),'[]'::jsonb)
  from automation_runners r where mcp_api_token_has_project(p_token,p_project_id) and r.project_id=p_project_id;
$$ language sql security definer set search_path=public,extensions stable;

revoke all on function mcp_automation_write_allowed(text,uuid),mcp_map_automation_script(text,uuid,uuid,text,text[]),mcp_enqueue_automation(text,uuid,uuid,uuid,text,text[],integer),mcp_automation_job_status(text,uuid,uuid),mcp_automation_runner_list(text,uuid) from public;
grant execute on function mcp_map_automation_script(text,uuid,uuid,text,text[]),mcp_enqueue_automation(text,uuid,uuid,uuid,text,text[],integer),mcp_automation_job_status(text,uuid,uuid),mcp_automation_runner_list(text,uuid) to anon;
