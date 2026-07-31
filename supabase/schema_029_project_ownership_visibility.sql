-- Project ownership, visibility, and invitation lifecycle.
-- Run after schema_028_webhook_dispatch.sql.
-- This migration extends the existing project_members/RBAC model; it does not
-- replace the application's existing AI, automation, or test-management tables.

alter table projects
  add column if not exists owner_id uuid references profiles(id) on delete restrict,
  add column if not exists visibility text not null default 'private';

alter table projects drop constraint if exists projects_visibility_check;
alter table projects add constraint projects_visibility_check
  check (visibility in ('private', 'unlisted', 'public'));

alter table project_members
  add column if not exists status text not null default 'accepted',
  add column if not exists invited_by uuid references profiles(id) on delete set null,
  add column if not exists invited_at timestamptz,
  add column if not exists accepted_at timestamptz;

alter table project_members alter column invited_by set default auth.uid();
alter table project_members alter column invited_at set default now();

alter table project_members drop constraint if exists project_members_status_check;
alter table project_members add constraint project_members_status_check
  check (status in ('invited', 'accepted', 'declined'));

update project_members
set accepted_at = coalesce(accepted_at, created_at)
where status = 'accepted' and accepted_at is null;

update projects p
set owner_id = members.user_id
from (
  select distinct on (project_id) project_id, user_id
  from project_members
  where role = 'manager' and status = 'accepted'
  order by project_id, created_at
) members
where p.id = members.project_id and p.owner_id is null;

create index if not exists idx_projects_owner on projects(owner_id);
create index if not exists idx_projects_visibility on projects(visibility);
create index if not exists idx_project_members_status on project_members(project_id, status);

create or replace function has_project_access(p_project_id uuid)
returns boolean as $$
  select is_admin()
    or exists (
      select 1 from projects p
      where p.id = p_project_id and p.owner_id = auth.uid()
    )
    or exists (
      select 1 from project_members pm
      where pm.project_id = p_project_id
        and pm.user_id = auth.uid()
        and pm.status = 'accepted'
    );
$$ language sql security definer set search_path = public stable;

create or replace function is_project_manager(p_project_id uuid)
returns boolean as $$
  select is_admin()
    or exists (
      select 1 from projects p
      where p.id = p_project_id and p.owner_id = auth.uid()
    )
    or exists (
      select 1 from project_members pm
      where pm.project_id = p_project_id
        and pm.user_id = auth.uid()
        and pm.role = 'manager'
        and pm.status = 'accepted'
    );
$$ language sql security definer set search_path = public stable;

create or replace function is_project_owner(p_project_id uuid)
returns boolean as $$
  select is_admin() or exists (
    select 1 from projects where id = p_project_id and owner_id = auth.uid()
  );
$$ language sql security definer set search_path = public stable;

-- Existing rows are accepted. New rows inserted by managers are invitations.
create or replace function handle_new_project()
returns trigger as $$
begin
  update projects set owner_id = auth.uid() where id = new.id and owner_id is null;
  insert into public.project_members (project_id, user_id, role, status, accepted_at)
  values (new.id, auth.uid(), 'manager', 'accepted', now())
  on conflict (project_id, user_id) do update
    set role = 'manager', status = 'accepted', accepted_at = coalesce(project_members.accepted_at, now());
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop policy if exists "project access - projects select" on projects;
create policy "project access - projects select" on projects for select
  using (
    visibility = 'public'
    or (is_approved() and (is_admin() or has_project_access(id) or visibility = 'unlisted'))
  );

drop policy if exists "project access - project_members select" on project_members;
create policy "project access - project_members select" on project_members for select
  using (user_id = auth.uid() or has_project_access(project_id));

drop policy if exists "project managers - project_members write" on project_members;
create policy "project managers - project_members write" on project_members for all
  using (is_project_manager(project_id))
  with check (is_project_manager(project_id));

create or replace function respond_to_project_invitation(p_membership_id uuid, p_accept boolean)
returns project_members
security definer
set search_path = public
language plpgsql
as $$
declare result_row project_members;
begin
  update project_members
  set status = case when p_accept then 'accepted' else 'declined' end,
      accepted_at = case when p_accept then now() else null end
  where id = p_membership_id and user_id = auth.uid() and status = 'invited'
  returning * into result_row;
  if result_row.id is null then
    raise exception 'Invitation tidak ditemukan atau sudah diproses';
  end if;
  return result_row;
end;
$$;

grant execute on function respond_to_project_invitation(uuid, boolean) to authenticated;
