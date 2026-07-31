-- Project repository links and Vault credential references.
-- Run after schema_029_project_ownership_visibility.sql.
-- Credential values remain in Supabase Vault; this table stores only the
-- corresponding Vault secret UUID.

create table if not exists project_repositories (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  source_type text not null check (
    source_type in ('local_path', 'github_public', 'github_private', 'git_url')
  ),
  url_or_path text not null check (length(trim(url_or_path)) > 0),
  default_branch text,
  credential_id uuid references vault.secrets(id) on delete set null,
  subdirectory text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_project_repositories_project
  on project_repositories(project_id);
create index if not exists idx_project_repositories_active
  on project_repositories(project_id, is_active);

drop trigger if exists trg_project_repositories_updated_at on project_repositories;
create trigger trg_project_repositories_updated_at
before update on project_repositories
for each row execute function set_updated_at();

alter table project_repositories enable row level security;

drop policy if exists "project access - repositories select" on project_repositories;
create policy "project access - repositories select"
on project_repositories for select
using (has_project_access(project_id));

drop policy if exists "project managers - repositories insert" on project_repositories;
create policy "project managers - repositories insert"
on project_repositories for insert
with check (is_project_manager(project_id));

drop policy if exists "project managers - repositories update" on project_repositories;
create policy "project managers - repositories update"
on project_repositories for update
using (is_project_manager(project_id))
with check (is_project_manager(project_id));

drop policy if exists "project managers - repositories delete" on project_repositories;
create policy "project managers - repositories delete"
on project_repositories for delete
using (is_project_manager(project_id));
