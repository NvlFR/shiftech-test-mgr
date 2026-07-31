-- MCP-13 selective regression rerun. Run after schema_055_mcp_automation.sql.
-- This migration is not executed automatically.

create or replace function mcp_rerun_failed_automation(
  p_token text,
  p_project_id uuid,
  p_issue_id uuid,
  p_name text default null,
  p_runner_labels text[] default '{}',
  p_max_attempts integer default 1,
  p_selection_limit integer default 25,
  p_confirmed_by uuid default null,
  p_explicit_confirmation boolean default false
)
returns jsonb as $$
declare
  v_source_case test_cases%rowtype;
  v_run test_runs%rowtype;
  v_author uuid;
  v_case_ids uuid[];
  v_count integer;
  v_job_count integer;
begin
  if not mcp_automation_write_allowed(p_token,p_project_id) then raise exception 'MCP_WRITE_FORBIDDEN'; end if;
  if p_max_attempts not between 1 and 10 then raise exception 'INVALID_MAX_ATTEMPTS'; end if;
  if p_selection_limit not between 1 and 500 then raise exception 'INVALID_SELECTION_LIMIT'; end if;

  select tc.* into v_source_case
  from issues i
  join test_results result on result.id=i.test_result_id
  join test_runs run on run.id=result.test_run_id
  left join test_plans plan on plan.id=run.test_plan_id
  join test_cases tc on tc.id=result.test_case_id
  where i.id=p_issue_id and i.status='resolved' and result.status='fail'
    and coalesce(plan.project_id,run.custom_project_id)=p_project_id;
  if not found then raise exception 'RESOLVED_ISSUE_NOT_FOUND'; end if;

  select coalesce(array_agg(candidate.id order by candidate.code,candidate.id),'{}'::uuid[])
  into v_case_ids
  from test_cases candidate
  join automation_scripts script on script.test_case_id=candidate.id and script.project_id=p_project_id
  where candidate.project_id=p_project_id and candidate.status='active' and (
    candidate.id=v_source_case.id
    or (v_source_case.module_id is not null and candidate.module_id=v_source_case.module_id)
    or exists (
      select 1 from test_case_tags source_tag
      join test_case_tags candidate_tag on candidate_tag.tag_id=source_tag.tag_id
      where source_tag.test_case_id=v_source_case.id and candidate_tag.test_case_id=candidate.id
    )
    or exists (
      select 1 from requirement_links source_link
      join requirement_links candidate_link on candidate_link.requirement_id=source_link.requirement_id
      where source_link.test_case_id=v_source_case.id and candidate_link.test_case_id=candidate.id
    )
  );
  v_count:=cardinality(v_case_ids);
  if v_count=0 then raise exception 'NO_RELEVANT_AUTOMATED_TESTS'; end if;

  if v_count>p_selection_limit then
    if p_explicit_confirmation is distinct from true or p_confirmed_by is null then
      return jsonb_build_object('confirmation_required',true,'selected_count',v_count,'selection_limit',p_selection_limit);
    end if;
    if not exists (
      select 1 from profiles profile
      where profile.id=p_confirmed_by and profile.role in ('user','admin') and profile.deleted_at is null
        and (profile.role='admin'
          or exists(select 1 from projects p where p.id=p_project_id and p.owner_id=profile.id)
          or exists(select 1 from project_members member where member.project_id=p_project_id and member.user_id=profile.id and member.status='accepted'))
    ) then raise exception 'INVALID_HUMAN_CONFIRMER'; end if;
  end if;

  select created_by into v_author from api_tokens
  where token_hash=encode(extensions.digest(p_token,'sha256'),'hex') and revoked_at is null;
  insert into test_runs(custom_project_id,name,status,ci_provider)
  values(p_project_id,coalesce(nullif(trim(p_name),''),'Selective regression'),'in_progress','automation')
  returning * into v_run;

  insert into test_results(test_run_id,test_case_id,test_case_code,test_case_title,test_case_objective,test_case_preconditions,test_case_steps,test_case_expected_result,test_case_priority,"order")
  select v_run.id,tc.id,tc.code,tc.title,tc.objective,tc.preconditions,tc.steps,tc.expected_result,tc.priority,selected.ordinality
  from unnest(v_case_ids) with ordinality selected(id,ordinality)
  join test_cases tc on tc.id=selected.id;
  insert into test_result_steps(test_result_id,test_case_step_id,step_number,action,expected_result)
  select result.id,step.id,step.step_number,step.action,step.expected_result
  from test_results result join test_case_steps step on step.test_case_id=result.test_case_id
  where result.test_run_id=v_run.id;
  insert into automation_jobs(project_id,test_run_id,test_case_id,script_ref,required_labels,max_attempts,created_by)
  select p_project_id,v_run.id,script.test_case_id,script.script_ref,
    (select array(select distinct label from unnest(script.runner_labels||coalesce(p_runner_labels,'{}')) label)),p_max_attempts,v_author
  from automation_scripts script where script.project_id=p_project_id and script.test_case_id=any(v_case_ids);
  get diagnostics v_job_count=row_count;

  insert into audit_logs(table_name,record_id,project_id,action,changed_by,new_data)
  values('mcp.automation.rerun_failed',v_run.id,p_project_id,'created',coalesce(p_confirmed_by,v_author),
    jsonb_build_object('issue_id',p_issue_id,'source_test_case_id',v_source_case.id,'selected_count',v_count,
      'selection_limit',p_selection_limit,'explicit_human_confirmation',p_explicit_confirmation,'api_token_actor',v_author));
  return jsonb_build_object('run_id',v_run.id,'run_code',v_run.code,'job_count',v_job_count,
    'selected_count',v_count,'source_testcase_id',v_source_case.id,'confirmation_required',false);
end;
$$ language plpgsql security definer set search_path=public,extensions;

revoke all on function mcp_rerun_failed_automation(text,uuid,uuid,text,text[],integer,integer,uuid,boolean) from public;
grant execute on function mcp_rerun_failed_automation(text,uuid,uuid,text,text[],integer,integer,uuid,boolean) to anon;
