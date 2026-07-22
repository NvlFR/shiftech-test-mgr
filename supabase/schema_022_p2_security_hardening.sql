-- P2 security hardening. Run after all existing schema files and before
-- enabling any P2 integration tables.
--
-- This migration removes legacy broad policies that otherwise remain active
-- alongside project-role policies. It also scopes version history and audit
-- records to a project. No result column is added to test_cases or
-- test_plan_cases; execution state remains in test_results.

-- === Remove legacy approved-user bypass policies ===

drop policy if exists "approved users - projects" on projects;
drop policy if exists "approved users - test_plans" on test_plans;
drop policy if exists "approved users - test_cases" on test_cases;
drop policy if exists "approved users - test_plan_cases" on test_plan_cases;
drop policy if exists "approved users - modules" on modules;
drop policy if exists "approved users - tags" on tags;
drop policy if exists "approved users - test_case_tags" on test_case_tags;
drop policy if exists "approved users - test_runs" on test_runs;
drop policy if exists "approved users - test_results" on test_results;
drop policy if exists "approved users - issues" on issues;

-- These tables are created by schema_p2_workflow.sql.
alter table test_case_versions enable row level security;
alter table audit_logs enable row level security;

-- === Project scope for version history and audit records ===

alter table audit_logs add column if not exists project_id uuid references projects(id) on delete cascade;
create index if not exists idx_audit_logs_project_created
  on audit_logs (project_id, created_at desc);

-- schema_019 is applied before this migration, so its integration audit helper
-- initially cannot populate the later project_id column. Re-define it here so
-- token/webhook/CI actions are visible only within the owning project.
create or replace function integration_audit(p_action text, p_project_id uuid, p_record_id uuid, p_new_data jsonb default null)
returns void as $$
begin
  insert into audit_logs(table_name, record_id, project_id, action, changed_by, new_data)
  values ('p2_integrations.' || p_action, p_record_id, p_project_id, 'created', auth.uid(),
    jsonb_build_object('project_id', p_project_id) || coalesce(p_new_data, '{}'::jsonb));
end;
$$ language plpgsql security definer set search_path = public;

create or replace function audit_log_project_id(p_table_name text, p_record_id uuid)
returns uuid as $$
declare result_project_id uuid;
begin
  -- Keep the allow-list explicit: this function is called by a trigger and
  -- must never turn a caller-controlled table name into executable SQL.
  case p_table_name
    when 'projects' then
      select id into result_project_id from projects where id = p_record_id;
    when 'test_plans' then
      select project_id into result_project_id from test_plans where id = p_record_id;
    when 'test_cases' then
      select project_id into result_project_id from test_cases where id = p_record_id;
    when 'modules' then
      select project_id into result_project_id from modules where id = p_record_id;
    when 'tags' then
      select project_id into result_project_id from tags where id = p_record_id;
    when 'test_plan_cases' then
      select project_id into result_project_id
      from test_plans tp join test_plan_cases tpc on tpc.test_plan_id = tp.id
      where tpc.id = p_record_id;
    when 'test_runs' then
      select tp.project_id into result_project_id
      from test_runs tr join test_plans tp on tp.id = tr.test_plan_id
      where tr.id = p_record_id;
    when 'test_results' then
      select tp.project_id into result_project_id
      from test_results tres
      join test_runs tr on tr.id = tres.test_run_id
      join test_plans tp on tp.id = tr.test_plan_id
      where tres.id = p_record_id;
    when 'issues' then
      select tp.project_id into result_project_id
      from issues i
      join test_results tres on tres.id = i.test_result_id
      join test_runs tr on tr.id = tres.test_run_id
      join test_plans tp on tp.id = tr.test_plan_id
      where i.id = p_record_id;
    else
      result_project_id := null;
  end case;
  return result_project_id;
end;
$$ language plpgsql security definer set search_path = public stable;

create or replace function write_audit_log()
returns trigger as $$
declare record_id uuid := coalesce(new.id, old.id);
begin
  insert into audit_logs(table_name, record_id, project_id, action, changed_by, old_data, new_data)
  values (
    tg_table_name,
    record_id,
    audit_log_project_id(tg_table_name, record_id),
    lower(tg_op),
    auth.uid(),
    case when tg_op = 'INSERT' then null else to_jsonb(old) end,
    case when tg_op = 'DELETE' then null else to_jsonb(new) end
  );
  return coalesce(new, old);
end;
$$ language plpgsql security definer set search_path = public;

drop policy if exists "approved users - audit logs" on audit_logs;
create policy "project members - audit logs" on audit_logs for select
  using (is_admin() or (project_id is not null and has_project_access(project_id)));

drop policy if exists "approved users - test case versions" on test_case_versions;
create policy "project members - test case versions" on test_case_versions for select
  using (
    exists (
      select 1
      from test_cases tc
      where tc.id = test_case_id and (is_admin() or has_project_access(tc.project_id))
    )
  );

-- Trigger/helper functions are implementation details, not public RPC APIs.
revoke execute on function public.audit_log_project_id(text, uuid) from public, anon, authenticated;
revoke execute on function public.write_audit_log() from public, anon, authenticated;
revoke execute on function public.record_test_case_version() from public, anon, authenticated;
revoke execute on function public.notify_issue_changes() from public, anon, authenticated;
