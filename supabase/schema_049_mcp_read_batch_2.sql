-- MCP discovery/read batch 2. Run after schema_048_mcp_read_batch_1.sql.
-- Result summaries are derived from test_results on every call; no summary or
-- pass/fail state is persisted on test_plans or test_runs.

create or replace function mcp_list_test_plans(p_token text, p_project_id uuid, p_after_code text default null, p_after_id uuid default null, p_limit integer default 51)
returns table(id uuid, project_id uuid, code text, name text, description text, status text, test_case_count bigint, created_at timestamptz, updated_at timestamptz)
as $$
  select tp.id, tp.project_id, tp.code, tp.name, tp.description, tp.status,
    (select count(*) from test_plan_cases tpc where tpc.test_plan_id = tp.id), tp.created_at, tp.updated_at
  from test_plans tp
  where mcp_api_token_has_project(p_token, p_project_id) and tp.project_id = p_project_id
    and (p_after_code is null or (tp.code, tp.id) > (p_after_code, p_after_id))
  order by tp.code, tp.id limit least(greatest(coalesce(p_limit, 51), 1), 101);
$$ language sql security definer set search_path = public, extensions stable;

create or replace function mcp_get_test_plan(p_token text, p_project_id uuid, p_test_plan_id uuid)
returns table(id uuid, project_id uuid, code text, name text, description text, status text, test_case_count bigint, created_at timestamptz, updated_at timestamptz, test_cases jsonb)
as $$
  select tp.id, tp.project_id, tp.code, tp.name, tp.description, tp.status,
    (select count(*) from test_plan_cases tpc where tpc.test_plan_id = tp.id), tp.created_at, tp.updated_at,
    coalesce((select jsonb_agg(jsonb_build_object(
      'order', tpc."order", 'test_case', jsonb_build_object(
        'id', tc.id, 'project_id', tc.project_id, 'module', case when m.id is null then null else jsonb_build_object('id', m.id, 'code', m.code, 'name', m.name) end,
        'tags', coalesce((select jsonb_agg(jsonb_build_object('id', t.id, 'name', t.name) order by lower(t.name), t.id) from test_case_tags tct join tags t on t.id = tct.tag_id where tct.test_case_id = tc.id), '[]'::jsonb),
        'code', tc.code, 'title', tc.title, 'priority', tc.priority, 'status', tc.status, 'updated_at', tc.updated_at,
        'objective', tc.objective, 'preconditions', tc.preconditions, 'steps', tc.steps, 'expected_result', tc.expected_result,
        'detailed_steps', coalesce((select jsonb_agg(jsonb_build_object('id', s.id, 'step_number', s.step_number, 'action', s.action, 'expected_result', s.expected_result) order by s.step_number, s.id) from test_case_steps s where s.test_case_id = tc.id), '[]'::jsonb),
        'versions', coalesce((select jsonb_agg(jsonb_build_object('id', v.id, 'version', v.version, 'steps', v.steps, 'expected_result', v.expected_result, 'changed_by', v.changed_by, 'created_at', v.created_at) order by v.version desc) from test_case_versions v where v.test_case_id = tc.id), '[]'::jsonb),
        'notes', tc.notes, 'created_at', tc.created_at)) order by tpc."order", tpc.id)
      from test_plan_cases tpc join test_cases tc on tc.id = tpc.test_case_id left join modules m on m.id = tc.module_id and m.project_id = tc.project_id
      where tpc.test_plan_id = tp.id), '[]'::jsonb)
  from test_plans tp
  where mcp_api_token_has_project(p_token, p_project_id) and tp.project_id = p_project_id and tp.id = p_test_plan_id;
$$ language sql security definer set search_path = public, extensions stable;

create or replace function mcp_test_run_summary(p_test_run_id uuid)
returns jsonb as $$
  select jsonb_build_object(
    'total', count(*), 'executed', count(*) filter (where status <> 'not_run'),
    'progress_percent', case when count(*) = 0 then 0 else round(100.0 * count(*) filter (where status <> 'not_run') / count(*), 2) end,
    'pass', count(*) filter (where status = 'pass'), 'fail', count(*) filter (where status = 'fail'),
    'skip', count(*) filter (where status = 'skip'), 'blocked', count(*) filter (where status = 'blocked'),
    'not_run', count(*) filter (where status = 'not_run')) from test_results where test_run_id = p_test_run_id;
$$ language sql security definer set search_path = public stable;
revoke all on function mcp_test_run_summary(uuid) from public;

create or replace function mcp_list_test_runs(p_token text, p_project_id uuid, p_test_plan_id uuid default null, p_status text default null, p_after_code text default null, p_after_id uuid default null, p_limit integer default 51)
returns table(id uuid, project_id uuid, test_plan_id uuid, code text, name text, status text, started_at timestamptz, completed_at timestamptz, summary jsonb)
as $$
  select tr.id, coalesce(tp.project_id, tr.custom_project_id), tr.test_plan_id, tr.code, tr.name, tr.status, tr.started_at, tr.completed_at, mcp_test_run_summary(tr.id)
  from test_runs tr left join test_plans tp on tp.id = tr.test_plan_id
  where mcp_api_token_has_project(p_token, p_project_id) and coalesce(tp.project_id, tr.custom_project_id) = p_project_id
    and (p_test_plan_id is null or tr.test_plan_id = p_test_plan_id) and (p_status is null or tr.status = p_status)
    and (p_after_code is null or (tr.code, tr.id) > (p_after_code, p_after_id))
  order by tr.code, tr.id limit least(greatest(coalesce(p_limit, 51), 1), 101);
$$ language sql security definer set search_path = public, extensions stable;

create or replace function mcp_get_test_run(p_token text, p_project_id uuid, p_test_run_id uuid)
returns table(id uuid, project_id uuid, test_plan_id uuid, code text, name text, status text, started_at timestamptz, completed_at timestamptz, summary jsonb, is_custom boolean, notes text, created_at timestamptz, updated_at timestamptz)
as $$
  select tr.id, coalesce(tp.project_id, tr.custom_project_id), tr.test_plan_id, tr.code, tr.name, tr.status, tr.started_at, tr.completed_at,
    mcp_test_run_summary(tr.id), tr.is_custom, tr.notes, tr.created_at, tr.updated_at
  from test_runs tr left join test_plans tp on tp.id = tr.test_plan_id
  where mcp_api_token_has_project(p_token, p_project_id) and coalesce(tp.project_id, tr.custom_project_id) = p_project_id and tr.id = p_test_run_id;
$$ language sql security definer set search_path = public, extensions stable;

create or replace function mcp_list_test_results(p_token text, p_project_id uuid, p_status text default null, p_tester_id uuid default null, p_test_run_id uuid default null, p_after_created_at timestamptz default null, p_after_id uuid default null, p_limit integer default 51)
returns table(id uuid, project_id uuid, test_run_id uuid, test_case_id uuid, test_case jsonb, tester jsonb, status text, executed_at timestamptz, notes text, created_at timestamptz, updated_at timestamptz)
as $$
  select r.id, coalesce(tp.project_id, run.custom_project_id), r.test_run_id, r.test_case_id,
    jsonb_build_object('code', coalesce(r.test_case_code, tc.code), 'title', coalesce(r.test_case_title, tc.title)),
    case when p.id is null then null else jsonb_build_object('id', p.id, 'email', p.email, 'full_name', p.full_name) end,
    r.status, r.executed_at, r.notes, r.created_at, r.updated_at
  from test_results r join test_runs run on run.id = r.test_run_id left join test_plans tp on tp.id = run.test_plan_id
  left join test_cases tc on tc.id = r.test_case_id left join profiles p on p.id = r.tester_id
  where mcp_api_token_has_project(p_token, p_project_id) and coalesce(tp.project_id, run.custom_project_id) = p_project_id
    and (p_status is null or r.status = p_status) and (p_tester_id is null or r.tester_id = p_tester_id)
    and (p_test_run_id is null or r.test_run_id = p_test_run_id)
    and (p_after_created_at is null or (r.created_at, r.id) > (p_after_created_at, p_after_id))
  order by r.created_at, r.id limit least(greatest(coalesce(p_limit, 51), 1), 101);
$$ language sql security definer set search_path = public, extensions stable;

revoke all on function mcp_list_test_plans(text, uuid, text, uuid, integer) from public;
revoke all on function mcp_get_test_plan(text, uuid, uuid) from public;
revoke all on function mcp_list_test_runs(text, uuid, uuid, text, text, uuid, integer) from public;
revoke all on function mcp_get_test_run(text, uuid, uuid) from public;
revoke all on function mcp_list_test_results(text, uuid, text, uuid, uuid, timestamptz, uuid, integer) from public;
grant execute on function mcp_list_test_plans(text, uuid, text, uuid, integer) to anon;
grant execute on function mcp_get_test_plan(text, uuid, uuid) to anon;
grant execute on function mcp_list_test_runs(text, uuid, uuid, text, text, uuid, integer) to anon;
grant execute on function mcp_get_test_run(text, uuid, uuid) to anon;
grant execute on function mcp_list_test_results(text, uuid, text, uuid, uuid, timestamptz, uuid, integer) to anon;
