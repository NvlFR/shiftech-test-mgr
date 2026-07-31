-- MCP discovery/read batch 1. Run after schema_047_mcp_auth.sql.
-- These narrow security-definer RPCs are the API-token boundary for the MCP
-- process. The plaintext token is never stored and every call revalidates that
-- the active token is bound to the requested project.

create or replace function mcp_api_token_has_project(p_token text, p_project_id uuid)
returns boolean
as $$
  select p_token is not null
    and p_token ~ '^tm_[0-9a-f]{64}$'
    and exists (
      select 1
      from api_tokens t
      where t.token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex')
        and t.project_id = p_project_id
        and t.revoked_at is null
    );
$$ language sql security definer set search_path = public, extensions stable;

revoke all on function mcp_api_token_has_project(text, uuid) from public;

create or replace function mcp_list_projects(p_token text, p_project_id uuid)
returns table(id uuid, name text, description text, status text, created_at timestamptz, updated_at timestamptz)
as $$
  select p.id, p.name, p.description, p.status, p.created_at, p.updated_at
  from projects p
  where p.id = p_project_id
    and mcp_api_token_has_project(p_token, p_project_id);
$$ language sql security definer set search_path = public, extensions stable;

create or replace function mcp_get_project(p_token text, p_project_id uuid)
returns table(id uuid, name text, description text, status text, created_at timestamptz, updated_at timestamptz)
as $$
  select * from mcp_list_projects(p_token, p_project_id);
$$ language sql security definer set search_path = public, extensions stable;

create or replace function mcp_search_test_cases(
  p_token text,
  p_project_id uuid,
  p_module_id uuid default null,
  p_module text default null,
  p_tag text default null,
  p_priority text default null,
  p_status text default null,
  p_text text default null,
  p_after_code text default null,
  p_after_id uuid default null,
  p_limit integer default 51
)
returns table(
  id uuid,
  project_id uuid,
  module jsonb,
  tags jsonb,
  code text,
  title text,
  priority text,
  status text,
  updated_at timestamptz
)
as $$
  select
    tc.id,
    tc.project_id,
    case when m.id is null then null else jsonb_build_object('id', m.id, 'code', m.code, 'name', m.name) end,
    coalesce((
      select jsonb_agg(jsonb_build_object('id', t.id, 'name', t.name) order by lower(t.name), t.id)
      from test_case_tags tct
      join tags t on t.id = tct.tag_id
      where tct.test_case_id = tc.id
    ), '[]'::jsonb),
    tc.code,
    tc.title,
    tc.priority,
    tc.status,
    tc.updated_at
  from test_cases tc
  left join modules m on m.id = tc.module_id and m.project_id = tc.project_id
  where mcp_api_token_has_project(p_token, p_project_id)
    and tc.project_id = p_project_id
    and (p_module_id is null or tc.module_id = p_module_id)
    and (nullif(trim(p_module), '') is null or lower(m.name) = lower(trim(p_module)) or lower(m.code) = lower(trim(p_module)))
    and (nullif(trim(p_tag), '') is null or exists (
      select 1 from test_case_tags tct join tags t on t.id = tct.tag_id
      where tct.test_case_id = tc.id and t.project_id = p_project_id and lower(t.name) = lower(trim(p_tag))
    ))
    and (p_priority is null or tc.priority = p_priority)
    and (p_status is null or tc.status = p_status)
    and (nullif(trim(p_text), '') is null or concat_ws(' ', tc.code, tc.title, tc.objective, tc.preconditions, tc.steps, tc.expected_result) ilike '%' || trim(p_text) || '%')
    and (p_after_code is null or (tc.code, tc.id) > (p_after_code, p_after_id))
  order by tc.code, tc.id
  limit least(greatest(coalesce(p_limit, 51), 1), 101);
$$ language sql security definer set search_path = public, extensions stable;

create or replace function mcp_get_test_case(p_token text, p_project_id uuid, p_test_case_id uuid)
returns table(
  id uuid,
  project_id uuid,
  module jsonb,
  tags jsonb,
  code text,
  title text,
  priority text,
  status text,
  updated_at timestamptz,
  objective text,
  preconditions text,
  steps text,
  expected_result text,
  detailed_steps jsonb,
  versions jsonb,
  notes text,
  created_at timestamptz
)
as $$
  select
    tc.id,
    tc.project_id,
    case when m.id is null then null else jsonb_build_object('id', m.id, 'code', m.code, 'name', m.name) end,
    coalesce((select jsonb_agg(jsonb_build_object('id', t.id, 'name', t.name) order by lower(t.name), t.id) from test_case_tags tct join tags t on t.id = tct.tag_id where tct.test_case_id = tc.id), '[]'::jsonb),
    tc.code,
    tc.title,
    tc.priority,
    tc.status,
    tc.updated_at,
    tc.objective,
    tc.preconditions,
    tc.steps,
    tc.expected_result,
    coalesce((select jsonb_agg(jsonb_build_object('id', s.id, 'step_number', s.step_number, 'action', s.action, 'expected_result', s.expected_result) order by s.step_number, s.id) from test_case_steps s where s.test_case_id = tc.id), '[]'::jsonb),
    coalesce((select jsonb_agg(jsonb_build_object('id', v.id, 'version', v.version, 'steps', v.steps, 'expected_result', v.expected_result, 'changed_by', v.changed_by, 'created_at', v.created_at) order by v.version desc) from test_case_versions v where v.test_case_id = tc.id), '[]'::jsonb),
    tc.notes,
    tc.created_at
  from test_cases tc
  left join modules m on m.id = tc.module_id and m.project_id = tc.project_id
  where mcp_api_token_has_project(p_token, p_project_id)
    and tc.project_id = p_project_id
    and tc.id = p_test_case_id;
$$ language sql security definer set search_path = public, extensions stable;

revoke all on function mcp_list_projects(text, uuid) from public;
revoke all on function mcp_get_project(text, uuid) from public;
revoke all on function mcp_search_test_cases(text, uuid, uuid, text, text, text, text, text, text, uuid, integer) from public;
revoke all on function mcp_get_test_case(text, uuid, uuid) from public;
grant execute on function mcp_list_projects(text, uuid) to anon;
grant execute on function mcp_get_project(text, uuid) to anon;
grant execute on function mcp_search_test_cases(text, uuid, uuid, text, text, text, text, text, text, uuid, integer) to anon;
grant execute on function mcp_get_test_case(text, uuid, uuid) to anon;
