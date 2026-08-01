-- E2E-07: close every API-token path that can cross a mandatory human gate.
-- Run manually after schema_071_ai_test_case_review.sql.

-- An agent must never approve a Test Plan, even when it supplies a real user's ID.
drop function if exists mcp_approve_test_plan(text, uuid, uuid, uuid, boolean);

-- Preserve the gate at table level for every future AI-sourced row. NOT VALID
-- avoids blocking rollout on legacy rows while still enforcing new writes.
alter table test_cases drop constraint if exists test_cases_ai_review_gate_check;
alter table test_cases add constraint test_cases_ai_review_gate_check
  check (source is distinct from 'ai' or review_decision is not null or status = 'draft') not valid;

alter table test_cases drop constraint if exists test_cases_ai_reviewer_required_check;
alter table test_cases add constraint test_cases_ai_reviewer_required_check
  check (review_decision is null or (reviewed_by is not null and reviewed_at is not null)) not valid;

create or replace function enforce_ai_test_case_reviewer()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.source = 'ai'
    and new.review_decision is not null
    and old.review_decision is null then
    if auth.uid() is null then raise exception 'HUMAN_REVIEW_SESSION_REQUIRED'; end if;
    new.reviewed_by := auth.uid();
    new.reviewed_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_enforce_ai_test_case_reviewer on test_cases;
create trigger trg_enforce_ai_test_case_reviewer
before update of review_decision on test_cases
for each row execute function enforce_ai_test_case_reviewer();

revoke execute on function enforce_ai_test_case_reviewer() from public, anon, authenticated;

-- AI-created cases always enter the persistent human-review queue.
create or replace function mcp_create_test_cases(p_token text, p_project_id uuid, p_cases jsonb)
returns jsonb as $$
declare v_item jsonb; v_rows jsonb := '[]'::jsonb; v_row test_cases%rowtype; v_batch_id uuid := gen_random_uuid();
begin
  if not mcp_write_allowed(p_token, p_project_id) then raise exception 'MCP_WRITE_FORBIDDEN'; end if;
  if jsonb_typeof(p_cases) <> 'array' or jsonb_array_length(p_cases) not between 1 and 100 then raise exception 'INVALID_CASE_COUNT'; end if;
  for v_item in select value from jsonb_array_elements(p_cases) loop
    if nullif(trim(v_item->>'title'), '') is null or nullif(trim(v_item->>'steps'), '') is null or nullif(trim(v_item->>'expected_result'), '') is null then raise exception 'INVALID_TEST_CASE'; end if;
    if v_item->>'module_id' is not null and not exists (select 1 from modules where id=(v_item->>'module_id')::uuid and project_id=p_project_id) then raise exception 'MODULE_NOT_FOUND'; end if;
    insert into test_cases(project_id,module_id,title,objective,preconditions,steps,expected_result,priority,status,source,ai_batch_id,notes)
    values(p_project_id,(v_item->>'module_id')::uuid,trim(v_item->>'title'),v_item->>'objective',v_item->>'preconditions',v_item->>'steps',v_item->>'expected_result',coalesce(v_item->>'priority','medium'),'draft','ai',v_batch_id,v_item->>'notes') returning * into v_row;
    v_rows := v_rows || jsonb_build_array(jsonb_build_object('id',v_row.id,'code',v_row.code,'title',v_row.title,'status',v_row.status,'source',v_row.source,'ai_batch_id',v_row.ai_batch_id));
  end loop;
  return v_rows;
end; $$ language plpgsql security definer set search_path=public,extensions;

-- Agent duplication is also generation: the copy must be reviewed, never active.
create or replace function mcp_duplicate_test_case(p_token text,p_project_id uuid,p_test_case_id uuid,p_title text default null)
returns jsonb as $$ declare v_source test_cases%rowtype; v_row test_cases%rowtype;
begin
 if not mcp_write_allowed(p_token,p_project_id) then raise exception 'MCP_WRITE_FORBIDDEN'; end if;
 select * into v_source from test_cases where id=p_test_case_id and project_id=p_project_id;
 if not found then raise exception 'TEST_CASE_NOT_FOUND'; end if;
 insert into test_cases(project_id,module_id,title,objective,preconditions,steps,expected_result,priority,status,source,ai_batch_id,notes)
 values(p_project_id,v_source.module_id,coalesce(nullif(trim(p_title),''),v_source.title||' (Copy)'),v_source.objective,v_source.preconditions,v_source.steps,v_source.expected_result,v_source.priority,'draft','ai',gen_random_uuid(),v_source.notes) returning * into v_row;
 insert into test_case_tags(test_case_id,tag_id) select v_row.id,tct.tag_id from test_case_tags tct join tags t on t.id=tct.tag_id where tct.test_case_id=p_test_case_id and t.project_id=p_project_id on conflict do nothing;
 insert into test_case_steps(test_case_id,step_number,action,expected_result) select v_row.id,step_number,action,expected_result from test_case_steps where test_case_id=p_test_case_id;
 return jsonb_build_object('id',v_row.id,'code',v_row.code,'title',v_row.title,'status',v_row.status,'source',v_row.source,'ai_batch_id',v_row.ai_batch_id,'source_id',p_test_case_id);
end; $$ language plpgsql security definer set search_path=public,extensions;

revoke all on function mcp_create_test_cases(text,uuid,jsonb),mcp_duplicate_test_case(text,uuid,uuid,text) from public, authenticated;
grant execute on function mcp_create_test_cases(text,uuid,jsonb),mcp_duplicate_test_case(text,uuid,uuid,text) to anon;

-- review_ai_test_cases writes auth.uid() to reviewed_by/reviewed_at. The existing
-- test_cases audit trigger then stores the same actor in audit_logs.changed_by and
-- the review fields in new_data, leaving no approval without an approver record.
