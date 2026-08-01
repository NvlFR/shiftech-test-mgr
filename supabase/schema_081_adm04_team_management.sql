-- ADM-04 team management. Run manually after schema_080.
-- This file is not executed automatically against any Supabase project.

create table if not exists teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  created_by uuid references profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint teams_name_not_blank check (length(trim(name)) > 0)
);
create unique index if not exists teams_name_unique_ci on teams (lower(trim(name)));

create table if not exists team_members (
  team_id uuid not null references teams(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (team_id, user_id)
);
create index if not exists idx_team_members_user on team_members(user_id, team_id);

-- Replace membership as one transaction so a failed insert cannot leave a
-- team empty after the previous rows have already been deleted.
create or replace function set_team_members(p_team_id uuid, p_user_ids uuid[])
returns void as $$
begin
  if not is_admin() then raise exception 'FORBIDDEN'; end if;
  delete from team_members where team_id = p_team_id;
  insert into team_members(team_id, user_id)
  select p_team_id, user_id from unnest(coalesce(p_user_ids, '{}'::uuid[])) user_id;
end;
$$ language plpgsql security definer set search_path = public;

revoke execute on function set_team_members(uuid, uuid[]) from public, anon;
grant execute on function set_team_members(uuid, uuid[]) to authenticated;

create table if not exists project_teams (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  team_id uuid not null references teams(id) on delete cascade,
  role text not null default 'member' check (role in ('manager', 'supervisor', 'tester', 'member')),
  permissions jsonb not null default default_project_permissions('member'),
  created_at timestamptz not null default now(),
  unique (project_id, team_id),
  constraint project_teams_permissions_object check (
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
  )
);
create index if not exists idx_project_teams_project on project_teams(project_id);
create index if not exists idx_project_teams_team on project_teams(team_id);

alter table teams enable row level security;
alter table team_members enable row level security;
alter table project_teams enable row level security;

drop policy if exists "approved users view teams" on teams;
create policy "approved users view teams" on teams for select using (is_approved());
drop policy if exists "admins manage teams" on teams;
create policy "admins manage teams" on teams for all using (is_admin()) with check (is_admin());

drop policy if exists "members view own team membership" on team_members;
create policy "members view own team membership" on team_members for select
  using (is_admin() or user_id = auth.uid());
drop policy if exists "admins manage team membership" on team_members;
create policy "admins manage team membership" on team_members for all
  using (is_admin()) with check (is_admin());

drop policy if exists "project users view project teams" on project_teams;
create policy "project users view project teams" on project_teams for select
  using (is_admin() or is_project_manager(project_id) or exists (
    select 1 from team_members where team_id = project_teams.team_id and user_id = auth.uid()
  ));
drop policy if exists "project managers manage project teams" on project_teams;
create policy "project managers manage project teams" on project_teams for all
  using (is_admin() or is_project_manager(project_id))
  with check (is_admin() or is_project_manager(project_id));

-- A permission is granted when either direct membership or one of the user's
-- teams grants it. security definer avoids RLS recursion in policy evaluation.
create or replace function has_project_permission(p_project_id uuid, p_permission text)
returns boolean as $$
  select is_admin()
    or exists (
      select 1 from project_members
      where project_id = p_project_id and user_id = auth.uid() and status = 'accepted'
        and coalesce((permissions ->> p_permission)::boolean, false)
    )
    or exists (
      select 1 from project_teams pt
      join team_members tm on tm.team_id = pt.team_id
      where pt.project_id = p_project_id and tm.user_id = auth.uid()
        and coalesce((pt.permissions ->> p_permission)::boolean, false)
    );
$$ language sql security definer set search_path = public stable;

revoke execute on function has_project_permission(uuid, text) from public, anon;
grant execute on function has_project_permission(uuid, text) to authenticated;

-- Keep project-management checks consistent with the effective role shown by
-- the frontend. A team assigned as manager may manage that project's teams.
create or replace function is_project_manager(p_project_id uuid)
returns boolean as $$
  select is_admin()
    or exists (
      select 1 from projects p
      where p.id = p_project_id and p.owner_id = auth.uid()
    )
    or exists (
      select 1 from project_members pm
      where pm.project_id = p_project_id and pm.user_id = auth.uid()
        and pm.role = 'manager' and pm.status = 'accepted'
    )
    or exists (
      select 1 from project_teams pt
      join team_members tm on tm.team_id = pt.team_id
      where pt.project_id = p_project_id and tm.user_id = auth.uid()
        and pt.role = 'manager'
    );
$$ language sql security definer set search_path = public stable;

-- Returns the union of direct and team access for the signed-in user. This is
-- the UI-facing counterpart of has_project_permission; authorization remains
-- enforced by RLS and the helpers above.
create or replace function get_my_project_access(p_project_id uuid)
returns table(role text, permissions jsonb) as $$
  with access_rows as (
    select pm.role, pm.permissions
    from project_members pm
    where pm.project_id = p_project_id and pm.user_id = auth.uid()
      and pm.status = 'accepted'
    union all
    select pt.role, pt.permissions
    from project_teams pt
    join team_members tm on tm.team_id = pt.team_id
    where pt.project_id = p_project_id and tm.user_id = auth.uid()
    union all
    select 'manager'::text, default_project_permissions('manager')
    where is_admin()
  )
  select
    (array_agg(ar.role order by case ar.role
      when 'manager' then 4 when 'supervisor' then 3
      when 'tester' then 2 else 1 end desc))[1],
    jsonb_build_object(
      'view', bool_or(coalesce((ar.permissions ->> 'view')::boolean, false)),
      'create', bool_or(coalesce((ar.permissions ->> 'create')::boolean, false)),
      'update', bool_or(coalesce((ar.permissions ->> 'update')::boolean, false)),
      'delete', bool_or(coalesce((ar.permissions ->> 'delete')::boolean, false)),
      'import', bool_or(coalesce((ar.permissions ->> 'import')::boolean, false)),
      'export', bool_or(coalesce((ar.permissions ->> 'export')::boolean, false)),
      'run_automation', bool_or(coalesce((ar.permissions ->> 'run_automation')::boolean, false))
    )
  from access_rows ar
  having count(*) > 0;
$$ language sql security definer set search_path = public stable;

revoke execute on function get_my_project_access(uuid) from public, anon;
grant execute on function get_my_project_access(uuid) to authenticated;

create or replace function set_team_updated_at()
returns trigger as $$ begin new.updated_at = now(); return new; end; $$
language plpgsql set search_path = public;
drop trigger if exists trg_teams_updated_at on teams;
create trigger trg_teams_updated_at before update on teams
for each row execute function set_team_updated_at();
