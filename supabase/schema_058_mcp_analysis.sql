-- MCP-15 read-only analysis tools. Run after schema_057_mcp_repo_tools.sql.
-- All metrics are derived on demand; this migration adds no cached analysis columns.

create or replace function mcp_analysis_run_summary(p_token text,p_project_id uuid,p_test_run_id uuid)
returns jsonb as $$
  select jsonb_build_object(
    'run',jsonb_build_object('id',run.id,'project_id',coalesce(plan.project_id,run.custom_project_id),'test_plan_id',run.test_plan_id,
      'code',run.code,'name',run.name,'status',run.status,'started_at',run.started_at,'completed_at',run.completed_at,
      'summary',mcp_test_run_summary(run.id),'is_custom',run.is_custom,'notes',run.notes,'created_at',run.created_at,'updated_at',run.updated_at),
    'pass_rate',case when count(result.id) filter(where result.status<>'not_run')=0 then 0 else round(100.0*count(result.id) filter(where result.status='pass')/count(result.id) filter(where result.status<>'not_run'),2) end,
    'failure_rate',case when count(result.id) filter(where result.status<>'not_run')=0 then 0 else round(100.0*count(result.id) filter(where result.status='fail')/count(result.id) filter(where result.status<>'not_run'),2) end,
    'problematic_results',coalesce((select jsonb_agg(jsonb_build_object('test_result_id',test_result_id,'test_case_id',test_case_id,
      'code',code,'title',title,'priority',priority,'status',status) order by priority_rank desc,code,test_result_id) from (
      select result2.id test_result_id,result2.test_case_id,coalesce(result2.test_case_code,tc.code) code,
        coalesce(result2.test_case_title,tc.title) title,coalesce(result2.test_case_priority,tc.priority) priority,result2.status,
        case coalesce(result2.test_case_priority,tc.priority) when 'critical' then 4 when 'high' then 3 when 'medium' then 2 else 1 end priority_rank
      from test_results result2 left join test_cases tc on tc.id=result2.test_case_id
      where result2.test_run_id=run.id and result2.status in ('fail','blocked','skip')
      order by priority_rank desc,code,result2.id limit 100
    ) item),'[]'::jsonb)
  )
  from test_runs run left join test_plans plan on plan.id=run.test_plan_id left join test_results result on result.test_run_id=run.id
  where mcp_api_token_has_project(p_token,p_project_id) and coalesce(plan.project_id,run.custom_project_id)=p_project_id and run.id=p_test_run_id
  group by run.id,plan.project_id;
$$ language sql security definer set search_path=public,extensions stable;

create or replace function mcp_analysis_flaky_candidates(p_token text,p_project_id uuid,p_lookback_runs integer default 10,p_min_executions integer default 3,p_limit integer default 25)
returns table(test_case_id uuid,code text,title text,priority text,executions bigint,pass_count bigint,fail_count bigint,transitions bigint,flakiness_score numeric,latest_status text,latest_executed_at timestamptz) as $$
  with scoped as (
    select result.test_case_id,result.status,result.executed_at,run.started_at,
      row_number() over(partition by result.test_case_id order by run.started_at desc,run.id desc) recent_rank
    from test_results result join test_runs run on run.id=result.test_run_id left join test_plans plan on plan.id=run.test_plan_id
    where mcp_api_token_has_project(p_token,p_project_id) and coalesce(plan.project_id,run.custom_project_id)=p_project_id
      and result.status in ('pass','fail')
  ), windowed as (
    select *,lag(status) over(partition by test_case_id order by started_at) previous_status from scoped where recent_rank<=least(greatest(p_lookback_runs,2),50)
  ), stats as (
    select test_case_id,count(*) executions,count(*) filter(where status='pass') pass_count,count(*) filter(where status='fail') fail_count,
      count(*) filter(where previous_status is not null and previous_status<>status) transitions,
      (array_agg(status order by started_at desc))[1] latest_status,max(executed_at) latest_executed_at
    from windowed group by test_case_id
  )
  select tc.id,tc.code,tc.title,tc.priority,s.executions,s.pass_count,s.fail_count,s.transitions,
    round(s.transitions::numeric/nullif(s.executions-1,0),4),s.latest_status,s.latest_executed_at
  from stats s join test_cases tc on tc.id=s.test_case_id and tc.project_id=p_project_id
  where s.executions>=least(greatest(p_min_executions,2),50) and s.pass_count>0 and s.fail_count>0
  order by round(s.transitions::numeric/nullif(s.executions-1,0),4) desc,s.executions desc,tc.code
  limit least(greatest(p_limit,1),100);
$$ language sql security definer set search_path=public,extensions stable;

create or replace function mcp_analysis_suggest_retest(p_token text,p_project_id uuid,p_test_run_id uuid,p_lookback_runs integer default 10,p_limit integer default 25)
returns table(test_case_id uuid,code text,title text,priority text,latest_status text,score numeric,reasons text[],open_issue_count bigint,flakiness_score numeric) as $$
  with target as (
    select result.*,coalesce(result.test_case_code,tc.code) case_code,coalesce(result.test_case_title,tc.title) case_title,
      coalesce(result.test_case_priority,tc.priority) case_priority
    from test_results result join test_runs run on run.id=result.test_run_id left join test_plans plan on plan.id=run.test_plan_id left join test_cases tc on tc.id=result.test_case_id
    where mcp_api_token_has_project(p_token,p_project_id) and coalesce(plan.project_id,run.custom_project_id)=p_project_id and run.id=p_test_run_id
  ), history as (
    select result.test_case_id,result.status,run.started_at,row_number() over(partition by result.test_case_id order by run.started_at desc,run.id desc) rank
    from test_results result join test_runs run on run.id=result.test_run_id left join test_plans plan on plan.id=run.test_plan_id
    where coalesce(plan.project_id,run.custom_project_id)=p_project_id and result.status in ('pass','fail')
  ), windowed as (
    select *,lag(status) over(partition by test_case_id order by started_at) previous_status from history where rank<=least(greatest(p_lookback_runs,2),50)
  ), flaky as (
    select test_case_id,case when count(*)>1 and count(*) filter(where status='pass')>0 and count(*) filter(where status='fail')>0
      then round(count(*) filter(where previous_status is not null and previous_status<>status)::numeric/(count(*)-1),4) else 0 end flakiness_score
    from windowed group by test_case_id
  ), ranked as (
    select target.test_case_id,target.case_code code,target.case_title title,target.case_priority priority,target.status latest_status,
      (case target.status when 'fail' then 100 when 'blocked' then 80 when 'not_run' then 55 when 'skip' then 35 else 0 end
       +case target.case_priority when 'critical' then 30 when 'high' then 20 when 'medium' then 10 else 0 end
       +least(issue_stats.open_count,3)*10+coalesce(flaky.flakiness_score,0)*40)::numeric score,
      array_remove(array[case when target.status='fail' then 'failed_in_target_run' when target.status='blocked' then 'blocked_in_target_run' when target.status='not_run' then 'not_run_in_target_run' when target.status='skip' then 'skipped_in_target_run' end,
        case when issue_stats.open_count>0 then 'has_open_issue' end,case when coalesce(flaky.flakiness_score,0)>0 then 'recent_pass_fail_instability' end,
        case when target.case_priority in ('critical','high') then 'high_priority' end],null) reasons,
      issue_stats.open_count open_issue_count,coalesce(flaky.flakiness_score,0) flakiness_score
    from target left join flaky on flaky.test_case_id=target.test_case_id
    cross join lateral (select count(*) open_count from issues issue join test_results issue_result on issue_result.id=issue.test_result_id
      where issue_result.test_case_id=target.test_case_id and issue.status not in ('verified','closed','rejected','duplicate')) issue_stats
  )
  select * from ranked where latest_status<>'pass' or open_issue_count>0 or flakiness_score>0
  order by score desc,code,test_case_id limit least(greatest(p_limit,1),100);
$$ language sql security definer set search_path=public,extensions stable;

revoke all on function mcp_analysis_run_summary(text,uuid,uuid) from public;
revoke all on function mcp_analysis_flaky_candidates(text,uuid,integer,integer,integer) from public;
revoke all on function mcp_analysis_suggest_retest(text,uuid,uuid,integer,integer) from public;
grant execute on function mcp_analysis_run_summary(text,uuid,uuid) to anon;
grant execute on function mcp_analysis_flaky_candidates(text,uuid,integer,integer,integer) to anon;
grant execute on function mcp_analysis_suggest_retest(text,uuid,uuid,integer,integer) to anon;
