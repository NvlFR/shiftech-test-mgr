-- MCP-11 Issue workflow. Run after schema_053_mcp_test_run_workflow.sql.
-- This migration is not executed automatically.

create or replace function mcp_issue_write_allowed(p_token text, p_project_id uuid)
returns boolean as $$
  select mcp_api_token_has_project(p_token,p_project_id) and exists (
    select 1 from api_tokens t
    where t.token_hash=encode(extensions.digest(p_token,'sha256'),'hex')
      and t.project_id=p_project_id and t.revoked_at is null
      and 'write:issues'=any(t.scopes)
  );
$$ language sql security definer set search_path=public,extensions stable;

create or replace function mcp_create_issue(p_token text,p_project_id uuid,p_test_result_id uuid,p_title text,p_description text default null,p_actual_result text default null,p_expected_result text default null,p_priority text default 'medium')
returns jsonb as $$
declare v_issue issues%rowtype; v_author uuid;
begin
  if not mcp_issue_write_allowed(p_token,p_project_id) then raise exception 'MCP_WRITE_FORBIDDEN'; end if;
  if nullif(trim(p_title),'') is null then raise exception 'INVALID_ISSUE_TITLE'; end if;
  if p_priority not in ('low','medium','high','critical') then raise exception 'INVALID_ISSUE_PRIORITY'; end if;
  if not exists (
    select 1 from test_results r join test_runs tr on tr.id=r.test_run_id left join test_plans tp on tp.id=tr.test_plan_id
    where r.id=p_test_result_id and coalesce(tp.project_id,tr.custom_project_id)=p_project_id
  ) then raise exception 'TEST_RESULT_NOT_FOUND'; end if;
  select created_by into v_author from api_tokens where token_hash=encode(extensions.digest(p_token,'sha256'),'hex') and revoked_at is null;
  insert into issues(test_result_id,title,description,actual_result,expected_result,priority,status,created_by)
  values(p_test_result_id,trim(p_title),p_description,p_actual_result,p_expected_result,p_priority,'backlog',v_author)
  returning * into v_issue;
  return jsonb_build_object('id',v_issue.id,'code',v_issue.code,'test_result_id',v_issue.test_result_id,'title',v_issue.title,'priority',v_issue.priority,'status',v_issue.status);
end;
$$ language plpgsql security definer set search_path=public,extensions;

create or replace function mcp_comment_issue(p_token text,p_project_id uuid,p_issue_id uuid,p_body text)
returns jsonb as $$
declare v_comment comments%rowtype; v_author uuid;
begin
  if not mcp_issue_write_allowed(p_token,p_project_id) then raise exception 'MCP_WRITE_FORBIDDEN'; end if;
  if char_length(trim(coalesce(p_body,''))) not between 1 and 5000 then raise exception 'INVALID_COMMENT_BODY'; end if;
  if not exists(select 1 from issues i join test_results r on r.id=i.test_result_id join test_runs tr on tr.id=r.test_run_id left join test_plans tp on tp.id=tr.test_plan_id where i.id=p_issue_id and coalesce(tp.project_id,tr.custom_project_id)=p_project_id) then raise exception 'ISSUE_NOT_FOUND'; end if;
  select created_by into v_author from api_tokens where token_hash=encode(extensions.digest(p_token,'sha256'),'hex') and revoked_at is null;
  insert into comments(project_id,target_type,target_id,author_id,body) values(p_project_id,'issue',p_issue_id,v_author,trim(p_body)) returning * into v_comment;
  return jsonb_build_object('id',v_comment.id,'issue_id',v_comment.target_id,'author_id',v_comment.author_id,'body',v_comment.body,'created_at',v_comment.created_at);
end;
$$ language plpgsql security definer set search_path=public,extensions;

create or replace function mcp_update_issue_status(p_token text,p_project_id uuid,p_issue_id uuid,p_status text)
returns jsonb as $$
declare v_issue issues%rowtype;
begin
  if not mcp_issue_write_allowed(p_token,p_project_id) then raise exception 'MCP_WRITE_FORBIDDEN'; end if;
  if p_status not in ('backlog','open','in_progress','resolved','verified','closed','rejected','duplicate') then raise exception 'INVALID_ISSUE_STATUS'; end if;
  update issues i set status=p_status
  from test_results r join test_runs tr on tr.id=r.test_run_id left join test_plans tp on tp.id=tr.test_plan_id
  where i.id=p_issue_id and r.id=i.test_result_id and coalesce(tp.project_id,tr.custom_project_id)=p_project_id
  returning i.* into v_issue;
  if not found then raise exception 'ISSUE_NOT_FOUND'; end if;
  return jsonb_build_object('id',v_issue.id,'code',v_issue.code,'status',v_issue.status,'updated_at',v_issue.updated_at);
end;
$$ language plpgsql security definer set search_path=public,extensions;

create or replace function mcp_issue_duplicate_candidates(p_token text,p_project_id uuid)
returns jsonb as $$
  select coalesce(jsonb_agg(jsonb_build_object('id',q.id,'code',q.code,'testResultId',q.test_result_id,'title',q.title,'description',q.description,'actualResult',q.actual_result,'expectedResult',q.expected_result,'priority',q.priority,'status',q.status) order by q.updated_at desc),'[]'::jsonb)
  from (select i.* from issues i join test_results r on r.id=i.test_result_id join test_runs tr on tr.id=r.test_run_id left join test_plans tp on tp.id=tr.test_plan_id where mcp_api_token_has_project(p_token,p_project_id) and coalesce(tp.project_id,tr.custom_project_id)=p_project_id order by i.updated_at desc limit 300) q;
$$ language sql security definer set search_path=public,extensions stable;

revoke all on function mcp_issue_write_allowed(text,uuid),mcp_create_issue(text,uuid,uuid,text,text,text,text,text),mcp_comment_issue(text,uuid,uuid,text),mcp_update_issue_status(text,uuid,uuid,text),mcp_issue_duplicate_candidates(text,uuid) from public;
grant execute on function mcp_create_issue(text,uuid,uuid,text,text,text,text,text),mcp_comment_issue(text,uuid,uuid,text),mcp_update_issue_status(text,uuid,uuid,text),mcp_issue_duplicate_candidates(text,uuid) to anon;
