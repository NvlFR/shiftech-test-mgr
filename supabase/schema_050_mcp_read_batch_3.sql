-- MCP discovery/read batch 3. Run after schema_049_mcp_read_batch_2.sql.
-- Requirement coverage deliberately starts from requirements, so uncovered
-- requirements remain visible instead of disappearing through an inner join.

create or replace function mcp_search_issues(p_token text, p_project_id uuid, p_status text default null, p_priority text default null, p_assignee_id uuid default null, p_test_run_id uuid default null, p_test_case_id uuid default null, p_text text default null, p_after_code text default null, p_after_id uuid default null, p_limit integer default 51)
returns table(id uuid, project_id uuid, code text, title text, priority text, status text, assigned_to jsonb, test_result_id uuid, test_run jsonb, test_case jsonb, created_at timestamptz, updated_at timestamptz)
as $$
  select i.id, coalesce(tp.project_id, tr.custom_project_id), i.code, i.title, i.priority, i.status,
    case when p.id is null then null else jsonb_build_object('id', p.id, 'email', p.email, 'full_name', p.full_name) end,
    i.test_result_id, jsonb_build_object('id', tr.id, 'code', tr.code, 'name', tr.name),
    jsonb_build_object('id', tc.id, 'code', coalesce(r.test_case_code, tc.code), 'title', coalesce(r.test_case_title, tc.title)), i.created_at, i.updated_at
  from issues i join test_results r on r.id = i.test_result_id join test_runs tr on tr.id = r.test_run_id
  left join test_plans tp on tp.id = tr.test_plan_id left join test_cases tc on tc.id = r.test_case_id left join profiles p on p.id = i.assigned_to
  where mcp_api_token_has_project(p_token, p_project_id) and coalesce(tp.project_id, tr.custom_project_id) = p_project_id
    and (p_status is null or i.status = p_status) and (p_priority is null or i.priority = p_priority)
    and (p_assignee_id is null or i.assigned_to = p_assignee_id) and (p_test_run_id is null or tr.id = p_test_run_id)
    and (p_test_case_id is null or r.test_case_id = p_test_case_id)
    and (nullif(trim(p_text), '') is null or concat_ws(' ', i.code, i.title, i.description, i.actual_result, i.expected_result) ilike '%' || trim(p_text) || '%')
    and (p_after_code is null or (i.code, i.id) > (p_after_code, p_after_id))
  order by i.code, i.id limit least(greatest(coalesce(p_limit, 51), 1), 101);
$$ language sql security definer set search_path = public, extensions stable;

create or replace function mcp_get_issue(p_token text, p_project_id uuid, p_issue_id uuid)
returns table(id uuid, project_id uuid, code text, title text, description text, actual_result text, expected_result text, priority text, status text, assigned_to jsonb, test_result_id uuid, test_run jsonb, test_case jsonb, created_at timestamptz, updated_at timestamptz)
as $$
  select i.id, coalesce(tp.project_id, tr.custom_project_id), i.code, i.title, i.description, i.actual_result, i.expected_result, i.priority, i.status,
    case when p.id is null then null else jsonb_build_object('id', p.id, 'email', p.email, 'full_name', p.full_name) end,
    i.test_result_id, jsonb_build_object('id', tr.id, 'code', tr.code, 'name', tr.name),
    jsonb_build_object('id', tc.id, 'code', coalesce(r.test_case_code, tc.code), 'title', coalesce(r.test_case_title, tc.title)), i.created_at, i.updated_at
  from issues i join test_results r on r.id = i.test_result_id join test_runs tr on tr.id = r.test_run_id
  left join test_plans tp on tp.id = tr.test_plan_id left join test_cases tc on tc.id = r.test_case_id left join profiles p on p.id = i.assigned_to
  where mcp_api_token_has_project(p_token, p_project_id) and coalesce(tp.project_id, tr.custom_project_id) = p_project_id and i.id = p_issue_id;
$$ language sql security definer set search_path = public, extensions stable;

create or replace function mcp_list_requirements(p_token text, p_project_id uuid, p_status text default null, p_priority text default null, p_covered boolean default null, p_after_key text default null, p_after_id uuid default null, p_limit integer default 51)
returns table(id uuid, project_id uuid, key text, title text, description text, status text, priority text, test_case_count bigint, covered boolean, created_at timestamptz, updated_at timestamptz)
as $$
  select req.id, req.project_id, req.key, req.title, req.description, req.status, req.priority,
    count(distinct rl.test_case_id) filter (where rl.test_case_id is not null), count(distinct rl.test_case_id) filter (where rl.test_case_id is not null) > 0,
    req.created_at, req.updated_at
  from requirements req left join requirement_links rl on rl.requirement_id = req.id
  where mcp_api_token_has_project(p_token, p_project_id) and req.project_id = p_project_id
    and (p_status is null or req.status = p_status) and (p_priority is null or req.priority = p_priority)
    and (p_after_key is null or (req.key, req.id) > (p_after_key, p_after_id))
  group by req.id
  having p_covered is null or (count(distinct rl.test_case_id) filter (where rl.test_case_id is not null) > 0) = p_covered
  order by req.key, req.id limit least(greatest(coalesce(p_limit, 51), 1), 101);
$$ language sql security definer set search_path = public, extensions stable;

create or replace function mcp_get_requirement(p_token text, p_project_id uuid, p_requirement_id uuid)
returns table(id uuid, project_id uuid, key text, title text, description text, status text, priority text, test_case_count bigint, covered boolean, links jsonb, created_at timestamptz, updated_at timestamptz)
as $$
  select req.id, req.project_id, req.key, req.title, req.description, req.status, req.priority,
    count(distinct rl.test_case_id) filter (where rl.test_case_id is not null), count(distinct rl.test_case_id) filter (where rl.test_case_id is not null) > 0,
    coalesce(jsonb_agg(jsonb_build_object('id', rl.id, 'type', case when rl.test_case_id is not null then 'test_case' when rl.test_plan_id is not null then 'test_plan' when rl.test_result_id is not null then 'test_result' else 'issue' end,
      'target_id', coalesce(rl.test_case_id, rl.test_plan_id, rl.test_result_id, rl.issue_id))) filter (where rl.id is not null), '[]'::jsonb), req.created_at, req.updated_at
  from requirements req left join requirement_links rl on rl.requirement_id = req.id
  where mcp_api_token_has_project(p_token, p_project_id) and req.project_id = p_project_id and req.id = p_requirement_id
  group by req.id;
$$ language sql security definer set search_path = public, extensions stable;

create or replace function mcp_requirement_coverage(p_token text, p_project_id uuid)
returns table(total bigint, covered bigint, uncovered bigint, percentage numeric)
as $$
  select count(*), count(*) filter (where has_test), count(*) filter (where not has_test),
    case when count(*) = 0 then 0 else round(100.0 * count(*) filter (where has_test) / count(*), 2) end
  from (select exists(select 1 from requirement_links rl where rl.requirement_id = req.id and rl.test_case_id is not null) has_test
    from requirements req where mcp_api_token_has_project(p_token, p_project_id) and req.project_id = p_project_id) coverage;
$$ language sql security definer set search_path = public, extensions stable;

revoke all on function mcp_search_issues(text, uuid, text, text, uuid, uuid, uuid, text, text, uuid, integer) from public;
revoke all on function mcp_get_issue(text, uuid, uuid) from public;
revoke all on function mcp_list_requirements(text, uuid, text, text, boolean, text, uuid, integer) from public;
revoke all on function mcp_get_requirement(text, uuid, uuid) from public;
revoke all on function mcp_requirement_coverage(text, uuid) from public;
grant execute on function mcp_search_issues(text, uuid, text, text, uuid, uuid, uuid, text, text, uuid, integer) to anon;
grant execute on function mcp_get_issue(text, uuid, uuid) to anon;
grant execute on function mcp_list_requirements(text, uuid, text, text, boolean, text, uuid, integer) to anon;
grant execute on function mcp_get_requirement(text, uuid, uuid) to anon;
grant execute on function mcp_requirement_coverage(text, uuid) to anon;
