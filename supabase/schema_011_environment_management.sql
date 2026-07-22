-- Environment management and test-run execution context.
-- Run after schema_project_roles.sql (and existing later migrations).

create table if not exists environments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  name text not null,
  base_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint environments_name_not_blank check (length(trim(name)) > 0),
  constraint environments_unique_name unique (project_id, name)
);

create index if not exists idx_environments_project on environments(project_id, name);

drop trigger if exists trg_environments_updated_at on environments;
create trigger trg_environments_updated_at before update on environments
  for each row execute function set_updated_at();

alter table test_runs add column if not exists environment_id uuid references environments(id) on delete set null;
alter table test_runs add column if not exists browser text;
alter table test_runs add column if not exists device text;
alter table test_runs add column if not exists build_version text;
alter table test_runs add column if not exists release text;

create index if not exists idx_test_runs_environment on test_runs(environment_id);
create index if not exists idx_test_runs_release on test_runs(release);

alter table environments enable row level security;

drop policy if exists "project access - environments select" on environments;
create policy "project access - environments select" on environments for select
  using (has_project_access(project_id));

drop policy if exists "project content editors - environments insert" on environments;
create policy "project content editors - environments insert" on environments for insert
  with check (can_edit_project_content(project_id));

drop policy if exists "project content editors - environments update" on environments;
create policy "project content editors - environments update" on environments for update
  using (can_edit_project_content(project_id)) with check (can_edit_project_content(project_id));

drop policy if exists "project content deleters - environments delete" on environments;
create policy "project content deleters - environments delete" on environments for delete
  using (can_delete_project_content(project_id));

-- The existing test-run policies already resolve project access through test_plan_id.
-- Add an explicit project ownership check for the new foreign key on insert/update.
drop policy if exists "test runners - test_runs insert" on test_runs;
create policy "test runners - test_runs insert" on test_runs for insert
  with check (
    can_run_tests((select project_id from test_plans where id = test_plan_id))
    and (environment_id is null or exists (
      select 1 from environments e
      where e.id = environment_id and e.project_id = (select project_id from test_plans where id = test_plan_id)
    ))
  );

drop policy if exists "test runners - test_runs update" on test_runs;
create policy "test runners - test_runs update" on test_runs for update
  using (can_run_tests((select project_id from test_plans where id = test_plan_id)))
  with check (
    can_run_tests((select project_id from test_plans where id = test_plan_id))
    and (environment_id is null or exists (
      select 1 from environments e
      where e.id = environment_id and e.project_id = (select project_id from test_plans where id = test_plan_id)
    ))
  );
