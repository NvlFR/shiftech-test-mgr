-- MCP-09 explicit human gate for Test Plan approval.
-- Run after schema_051_mcp_write_test_cases_plans.sql. This migration is not executed automatically.

create or replace function mcp_approve_test_plan(p_token text,p_project_id uuid,p_test_plan_id uuid,p_approver_id uuid,p_explicit_approval boolean)
returns jsonb as $$
declare v_plan test_plans%rowtype; v_token_id uuid;
begin
  if p_explicit_approval is distinct from true then raise exception 'EXPLICIT_HUMAN_APPROVAL_REQUIRED'; end if;
  select t.id into v_token_id from api_tokens t
  where t.token_hash=encode(extensions.digest(p_token,'sha256'),'hex') and t.project_id=p_project_id
    and t.revoked_at is null and 'write:test-plans'=any(t.scopes);
  if v_token_id is null then raise exception 'MCP_WRITE_FORBIDDEN'; end if;
  if not exists (
    select 1 from profiles profile where profile.id=p_approver_id and profile.role in ('user','admin') and profile.deleted_at is null
      and (profile.role='admin'
        or exists(select 1 from projects p where p.id=p_project_id and p.owner_id=profile.id)
        or exists(select 1 from project_members member where member.project_id=p_project_id and member.user_id=profile.id and member.status='accepted'))
  ) then raise exception 'INVALID_HUMAN_APPROVER'; end if;
  update test_plans set status='active',updated_at=now()
  where id=p_test_plan_id and project_id=p_project_id and status='draft' returning * into v_plan;
  if not found then raise exception 'DRAFT_PLAN_NOT_FOUND'; end if;
  insert into audit_logs(table_name,record_id,project_id,action,changed_by,new_data)
  values ('mcp.testplan.approve',v_plan.id,p_project_id,'updated',p_approver_id,
    jsonb_build_object('status',v_plan.status,'approval','explicit_human','api_token_id',v_token_id));
  return jsonb_build_object('id',v_plan.id,'code',v_plan.code,'name',v_plan.name,'status',v_plan.status,'approved_by',p_approver_id);
end;
$$ language plpgsql security definer set search_path=public,extensions;

revoke all on function mcp_approve_test_plan(text,uuid,uuid,uuid,boolean) from public;
grant execute on function mcp_approve_test_plan(text,uuid,uuid,uuid,boolean) to anon;
