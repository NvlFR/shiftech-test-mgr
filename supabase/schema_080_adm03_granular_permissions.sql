-- ADM-03 granular project permissions. Run after schema_079.
-- This migration is intentionally additive; apply it manually in Supabase SQL Editor.

alter table project_members
  add column if not exists permissions jsonb;

create or replace function default_project_permissions(p_role text)
returns jsonb as $$
  select case p_role
    when 'manager' then '{"view":true,"create":true,"update":true,"delete":true,"import":true,"export":true,"run_automation":true}'::jsonb
    when 'supervisor' then '{"view":true,"create":true,"update":true,"delete":false,"import":true,"export":true,"run_automation":false}'::jsonb
    when 'tester' then '{"view":true,"create":false,"update":true,"delete":false,"import":false,"export":true,"run_automation":true}'::jsonb
    else '{"view":true,"create":false,"update":false,"delete":false,"import":false,"export":false,"run_automation":false}'::jsonb
  end;
$$ language sql immutable;

update project_members
set permissions = default_project_permissions(role)
where permissions is null;

alter table project_members alter column permissions set not null;
alter table project_members alter column permissions set default '{"view":true,"create":false,"update":false,"delete":false,"import":false,"export":false,"run_automation":false}'::jsonb;
alter table project_members add constraint project_members_permissions_object
  check (
    jsonb_typeof(permissions) = 'object'
    and permissions ?& array['view', 'create', 'update', 'delete', 'import', 'export', 'run_automation']
    and permissions - array['view', 'create', 'update', 'delete', 'import', 'export', 'run_automation'] = '{}'::jsonb
    and jsonb_typeof(permissions -> 'view') = 'boolean'
    and jsonb_typeof(permissions -> 'create') = 'boolean'
    and jsonb_typeof(permissions -> 'update') = 'boolean'
    and jsonb_typeof(permissions -> 'delete') = 'boolean'
    and jsonb_typeof(permissions -> 'import') = 'boolean'
    and jsonb_typeof(permissions -> 'export') = 'boolean'
    and jsonb_typeof(permissions -> 'run_automation') = 'boolean'
  );

create or replace function has_project_permission(p_project_id uuid, p_permission text)
returns boolean as $$
  select is_admin() or exists (
    select 1 from project_members
    where project_id = p_project_id
      and user_id = auth.uid()
      and status = 'accepted'
      and coalesce((permissions ->> p_permission)::boolean, false)
  );
$$ language sql security definer set search_path = public stable;

revoke execute on function default_project_permissions(text) from public, anon;
grant execute on function default_project_permissions(text) to authenticated;
revoke execute on function has_project_permission(uuid, text) from public, anon;
grant execute on function has_project_permission(uuid, text) to authenticated;

-- Existing policies call these helpers, so replacing them upgrades all covered
-- project tables without duplicating their project-id lookup expressions.
create or replace function has_project_access(p_project_id uuid)
returns boolean as $$ select has_project_permission(p_project_id, 'view'); $$
language sql security definer set search_path = public stable;

create or replace function can_edit_project_content(p_project_id uuid)
returns boolean as $$ select has_project_permission(p_project_id, 'update'); $$
language sql security definer set search_path = public stable;

create or replace function can_create_project_content(p_project_id uuid)
returns boolean as $$ select has_project_permission(p_project_id, 'create'); $$
language sql security definer set search_path = public stable;

revoke execute on function can_create_project_content(uuid) from public, anon;
grant execute on function can_create_project_content(uuid) to authenticated;

create or replace function can_delete_project_content(p_project_id uuid)
returns boolean as $$ select has_project_permission(p_project_id, 'delete'); $$
language sql security definer set search_path = public stable;

create or replace function can_run_tests(p_project_id uuid)
returns boolean as $$ select has_project_permission(p_project_id, 'update'); $$
language sql security definer set search_path = public stable;

-- Automation RPCs and RLS already use can_edit_project_content. Tighten that
-- boundary independently for enqueue/run operations.
create or replace function can_run_automation(p_project_id uuid)
returns boolean as $$ select has_project_permission(p_project_id, 'run_automation'); $$
language sql security definer set search_path = public stable;

-- Browser-triggered automation writes are performed by security-definer RPCs,
-- so table RLS alone cannot distinguish them from ordinary content updates.
-- Keep runner/service-role traffic intact (auth.uid() is null) while enforcing
-- the dedicated permission for authenticated UI callers.
create or replace function enforce_automation_permission()
returns trigger as $$
begin
  if auth.uid() is not null and not can_run_automation(new.project_id) then
    raise exception 'FORBIDDEN';
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists trg_automation_jobs_permission on automation_jobs;
create trigger trg_automation_jobs_permission
  before insert or update on automation_jobs
  for each row execute function enforce_automation_permission();

revoke execute on function enforce_automation_permission() from public, anon, authenticated;

-- Entity creation must not inherit update permission. Existing update policies
-- continue to call can_edit_project_content(), which now maps only to `update`.
drop policy if exists "project content editors - test_plans insert" on test_plans;
drop policy if exists "project content creators - test_plans insert" on test_plans;
create policy "project content creators - test_plans insert" on test_plans for insert
  with check (can_create_project_content(project_id));

drop policy if exists "project content editors - test_cases insert" on test_cases;
drop policy if exists "project content creators - test_cases insert" on test_cases;
create policy "project content creators - test_cases insert" on test_cases for insert
  with check (can_create_project_content(project_id));

drop policy if exists "project content editors - modules insert" on modules;
drop policy if exists "project content creators - modules insert" on modules;
create policy "project content creators - modules insert" on modules for insert
  with check (can_create_project_content(project_id));

drop policy if exists "project content editors - tags insert" on tags;
drop policy if exists "project content creators - tags insert" on tags;
create policy "project content creators - tags insert" on tags for insert
  with check (can_create_project_content(project_id));

-- Permission changes are manager/admin-only and cannot be self-escalated.
drop policy if exists "project managers - project_members write" on project_members;
create policy "project managers - project_members write" on project_members for all
  using (is_admin() or can_manage_project(project_id))
  with check (is_admin() or can_manage_project(project_id));
