-- Additive compatibility pieces from supabase-new, adapted to the local profiles model.

do $$
declare
  table_name text;
begin
  foreach table_name in array array['profiles', 'projects', 'modules', 'tags', 'test_cases', 'test_plan_cases', 'test_runs', 'test_results', 'issues', 'project_members']
  loop
    if to_regclass(format('public.%I', table_name)) is not null
      and not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = table_name)
    then
      execute format('alter publication supabase_realtime add table %I', table_name);
    end if;
  end loop;
end $$;

alter table test_runs add column if not exists started_by uuid references profiles(id) on delete set null;
alter table test_plans add column if not exists created_by uuid references profiles(id) on delete set null;
alter table issues add column if not exists created_by uuid references profiles(id) on delete set null;
alter table test_cases add column if not exists created_by uuid references profiles(id) on delete set null;
alter table test_cases add column if not exists external_links jsonb not null default '[]'::jsonb;
alter table issues add column if not exists target_role_id uuid references test_roles(id) on delete set null;
create index if not exists idx_issues_target_role on issues (target_role_id);

alter table issues drop constraint if exists issues_status_check;
alter table issues add constraint issues_status_check
  check (status in ('backlog', 'open', 'in_progress', 'resolved', 'verified', 'closed', 'rejected', 'duplicate'));
