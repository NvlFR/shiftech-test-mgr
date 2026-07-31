-- MCP write tools for test cases and test plans. Run after schema_050_mcp_read_batch_3.sql.
-- Every mutation is API-token/project scoped. Plans remain drafts and RPC output
-- is explicitly review_only; test cases retain the domain's active/archived states.

create or replace function mcp_write_allowed(p_token text, p_project_id uuid)
returns boolean as $$
  select mcp_api_token_has_project(p_token, p_project_id) and exists (
    select 1 from api_tokens t
    where t.token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex')
      and t.project_id = p_project_id and t.revoked_at is null
      and (t.scopes && array['write:test-cases','write:test-plans']::text[])
  );
$$ language sql security definer set search_path = public, extensions stable;

create or replace function mcp_create_test_cases(p_token text, p_project_id uuid, p_cases jsonb)
returns jsonb as $$
declare v_item jsonb; v_rows jsonb := '[]'::jsonb; v_row test_cases%rowtype;
begin
  if not mcp_write_allowed(p_token, p_project_id) then raise exception 'MCP_WRITE_FORBIDDEN'; end if;
  if jsonb_typeof(p_cases) <> 'array' or jsonb_array_length(p_cases) not between 1 and 100 then raise exception 'INVALID_CASE_COUNT'; end if;
  for v_item in select value from jsonb_array_elements(p_cases) loop
    if nullif(trim(v_item->>'title'), '') is null or nullif(trim(v_item->>'steps'), '') is null or nullif(trim(v_item->>'expected_result'), '') is null then raise exception 'INVALID_TEST_CASE'; end if;
    if v_item->>'module_id' is not null and not exists (select 1 from modules where id=(v_item->>'module_id')::uuid and project_id=p_project_id) then raise exception 'MODULE_NOT_FOUND'; end if;
    insert into test_cases(project_id,module_id,title,objective,preconditions,steps,expected_result,priority,status,notes)
    values(p_project_id,(v_item->>'module_id')::uuid,trim(v_item->>'title'),v_item->>'objective',v_item->>'preconditions',v_item->>'steps',v_item->>'expected_result',coalesce(v_item->>'priority','medium'),'active',v_item->>'notes') returning * into v_row;
    v_rows := v_rows || jsonb_build_array(jsonb_build_object('id',v_row.id,'code',v_row.code,'title',v_row.title,'status',v_row.status));
  end loop;
  return v_rows;
end; $$ language plpgsql security definer set search_path=public,extensions;

create or replace function mcp_update_test_case(p_token text,p_project_id uuid,p_test_case_id uuid,p_changes jsonb)
returns jsonb as $$ declare v_row test_cases%rowtype;
begin
 if not mcp_write_allowed(p_token,p_project_id) then raise exception 'MCP_WRITE_FORBIDDEN'; end if;
 if not exists(select 1 from test_cases where id=p_test_case_id and project_id=p_project_id) then raise exception 'TEST_CASE_NOT_FOUND'; end if;
 if p_changes ? 'module_id' and p_changes->>'module_id' is not null and not exists(select 1 from modules where id=(p_changes->>'module_id')::uuid and project_id=p_project_id) then raise exception 'MODULE_NOT_FOUND'; end if;
 update test_cases set
  title=case when p_changes?'title' then trim(p_changes->>'title') else title end,
  module_id=case when p_changes?'module_id' then (p_changes->>'module_id')::uuid else module_id end,
  objective=case when p_changes?'objective' then p_changes->>'objective' else objective end,
  preconditions=case when p_changes?'preconditions' then p_changes->>'preconditions' else preconditions end,
  steps=case when p_changes?'steps' then p_changes->>'steps' else steps end,
  expected_result=case when p_changes?'expected_result' then p_changes->>'expected_result' else expected_result end,
  priority=case when p_changes?'priority' then p_changes->>'priority' else priority end,
  notes=case when p_changes?'notes' then p_changes->>'notes' else notes end
 where id=p_test_case_id and project_id=p_project_id returning * into v_row;
 return jsonb_build_object('id',v_row.id,'code',v_row.code,'title',v_row.title,'status',v_row.status);
end; $$ language plpgsql security definer set search_path=public,extensions;

create or replace function mcp_duplicate_test_case(p_token text,p_project_id uuid,p_test_case_id uuid,p_title text default null)
returns jsonb as $$ declare v_source test_cases%rowtype; v_row test_cases%rowtype;
begin
 if not mcp_write_allowed(p_token,p_project_id) then raise exception 'MCP_WRITE_FORBIDDEN'; end if;
 select * into v_source from test_cases where id=p_test_case_id and project_id=p_project_id;
 if not found then raise exception 'TEST_CASE_NOT_FOUND'; end if;
 insert into test_cases(project_id,module_id,title,objective,preconditions,steps,expected_result,priority,status,notes)
 values(p_project_id,v_source.module_id,coalesce(nullif(trim(p_title),''),v_source.title||' (Copy)'),v_source.objective,v_source.preconditions,v_source.steps,v_source.expected_result,v_source.priority,'active',v_source.notes) returning * into v_row;
 insert into test_case_tags(test_case_id,tag_id) select v_row.id,tct.tag_id from test_case_tags tct join tags t on t.id=tct.tag_id where tct.test_case_id=p_test_case_id and t.project_id=p_project_id on conflict do nothing;
 insert into test_case_steps(test_case_id,step_number,action,expected_result) select v_row.id,step_number,action,expected_result from test_case_steps where test_case_id=p_test_case_id;
 return jsonb_build_object('id',v_row.id,'code',v_row.code,'title',v_row.title,'status',v_row.status,'source_id',p_test_case_id);
end; $$ language plpgsql security definer set search_path=public,extensions;

create or replace function mcp_archive_test_case(p_token text,p_project_id uuid,p_test_case_id uuid)
returns jsonb as $$ declare v_row test_cases%rowtype; begin
 if not mcp_write_allowed(p_token,p_project_id) then raise exception 'MCP_WRITE_FORBIDDEN'; end if;
 update test_cases set status='archived' where id=p_test_case_id and project_id=p_project_id returning * into v_row;
 if not found then raise exception 'TEST_CASE_NOT_FOUND'; end if;
 return jsonb_build_object('id',v_row.id,'code',v_row.code,'title',v_row.title,'status',v_row.status);
end; $$ language plpgsql security definer set search_path=public,extensions;

create or replace function mcp_create_test_plan(p_token text,p_project_id uuid,p_name text,p_description text default null)
returns jsonb as $$ declare v_row test_plans%rowtype; begin
 if not mcp_write_allowed(p_token,p_project_id) then raise exception 'MCP_WRITE_FORBIDDEN'; end if;
 if nullif(trim(p_name),'') is null then raise exception 'INVALID_PLAN_NAME'; end if;
 insert into test_plans(project_id,name,description,status) values(p_project_id,trim(p_name),p_description,'draft') returning * into v_row;
 return jsonb_build_object('id',v_row.id,'code',v_row.code,'name',v_row.name,'status',v_row.status);
end; $$ language plpgsql security definer set search_path=public,extensions;

create or replace function mcp_add_test_plan_cases(p_token text,p_project_id uuid,p_test_plan_id uuid,p_test_case_ids uuid[])
returns jsonb as $$ declare v_added integer; begin
 if not mcp_write_allowed(p_token,p_project_id) then raise exception 'MCP_WRITE_FORBIDDEN'; end if;
 if not exists(select 1 from test_plans where id=p_test_plan_id and project_id=p_project_id and status='draft') then raise exception 'DRAFT_PLAN_NOT_FOUND'; end if;
 if exists(select 1 from unnest(p_test_case_ids) x where not exists(select 1 from test_cases tc where tc.id=x and tc.project_id=p_project_id)) then raise exception 'TEST_CASE_NOT_FOUND'; end if;
 insert into test_plan_cases(test_plan_id,test_case_id,"order") select p_test_plan_id,x,coalesce((select max("order") from test_plan_cases where test_plan_id=p_test_plan_id),0)+row_number() over() from unnest(p_test_case_ids) x on conflict do nothing;
 get diagnostics v_added=row_count; return jsonb_build_object('testplan_id',p_test_plan_id,'added',v_added);
end; $$ language plpgsql security definer set search_path=public,extensions;

create or replace function mcp_remove_test_plan_cases(p_token text,p_project_id uuid,p_test_plan_id uuid,p_test_case_ids uuid[])
returns jsonb as $$ declare v_removed integer; begin
 if not mcp_write_allowed(p_token,p_project_id) then raise exception 'MCP_WRITE_FORBIDDEN'; end if;
 if not exists(select 1 from test_plans where id=p_test_plan_id and project_id=p_project_id and status='draft') then raise exception 'DRAFT_PLAN_NOT_FOUND'; end if;
 delete from test_plan_cases where test_plan_id=p_test_plan_id and test_case_id=any(p_test_case_ids);
 get diagnostics v_removed=row_count; return jsonb_build_object('testplan_id',p_test_plan_id,'removed',v_removed);
end; $$ language plpgsql security definer set search_path=public,extensions;

revoke all on function mcp_write_allowed(text,uuid) from public;
revoke all on function mcp_create_test_cases(text,uuid,jsonb) from public;
revoke all on function mcp_update_test_case(text,uuid,uuid,jsonb) from public;
revoke all on function mcp_duplicate_test_case(text,uuid,uuid,text) from public;
revoke all on function mcp_archive_test_case(text,uuid,uuid) from public;
revoke all on function mcp_create_test_plan(text,uuid,text,text) from public;
revoke all on function mcp_add_test_plan_cases(text,uuid,uuid,uuid[]) from public;
revoke all on function mcp_remove_test_plan_cases(text,uuid,uuid,uuid[]) from public;
grant execute on function mcp_create_test_cases(text,uuid,jsonb),mcp_update_test_case(text,uuid,uuid,jsonb),mcp_duplicate_test_case(text,uuid,uuid,text),mcp_archive_test_case(text,uuid,uuid),mcp_create_test_plan(text,uuid,text,text),mcp_add_test_plan_cases(text,uuid,uuid,uuid[]),mcp_remove_test_plan_cases(text,uuid,uuid,uuid[]) to anon;
