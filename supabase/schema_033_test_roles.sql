-- Test roles are roles inside the application under test, not TestManager user roles.
create table if not exists test_roles (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, name)
);

drop trigger if exists trg_test_roles_updated_at on test_roles;
create trigger trg_test_roles_updated_at before update on test_roles
  for each row execute function set_updated_at();

alter table test_cases add column if not exists target_role_id uuid references test_roles(id) on delete set null;
create index if not exists idx_test_cases_target_role on test_cases (target_role_id);

alter table test_roles enable row level security;
drop policy if exists "approved users - test_roles" on test_roles;
create policy "approved users - test_roles" on test_roles for all
  using (is_approved()) with check (is_approved());
