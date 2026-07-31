-- Reusable, user-owned Test Suite Library.
-- Run after schema_029_project_ownership_visibility.sql.

create table if not exists test_suites (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles(id) on delete cascade default auth.uid(),
  name text not null check (length(trim(name)) > 0),
  description text,
  visibility text not null default 'private' check (visibility in ('private', 'unlisted', 'public')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists test_suite_items (
  id uuid primary key default gen_random_uuid(),
  suite_id uuid not null references test_suites(id) on delete cascade,
  title text not null check (length(trim(title)) > 0),
  objective text,
  steps text not null default '',
  expected_result text not null default '',
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high', 'critical')),
  order_index integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_test_suites_owner on test_suites(owner_id);
create index if not exists idx_test_suite_items_suite on test_suite_items(suite_id, order_index);

alter table test_suites enable row level security;
alter table test_suite_items enable row level security;

create policy "suite visibility read" on test_suites for select
  using (owner_id = auth.uid() or visibility in ('unlisted', 'public') or is_admin());
create policy "suite owner write" on test_suites for all
  using (owner_id = auth.uid() or is_admin())
  with check (owner_id = auth.uid() or is_admin());
create policy "suite items read" on test_suite_items for select
  using (exists (select 1 from test_suites s where s.id = suite_id and (s.owner_id = auth.uid() or s.visibility in ('unlisted', 'public') or is_admin())));
create policy "suite items owner write" on test_suite_items for all
  using (exists (select 1 from test_suites s where s.id = suite_id and (s.owner_id = auth.uid() or is_admin())))
  with check (exists (select 1 from test_suites s where s.id = suite_id and (s.owner_id = auth.uid() or is_admin())));
