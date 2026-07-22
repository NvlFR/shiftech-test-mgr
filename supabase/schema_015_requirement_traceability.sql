-- P1 Requirement Traceability. Run after the project-scoped RLS schemas.
create table if not exists requirements (
  id uuid primary key default gen_random_uuid(), project_id uuid not null references projects(id) on delete cascade,
  key text not null, title text not null, description text,
  status text not null default 'draft' check (status in ('draft', 'approved', 'deprecated')),
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high', 'critical')),
  created_by uuid references profiles(id) on delete set null, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (project_id, key), check (length(trim(key)) > 0), check (length(trim(title)) > 0)
);
create table if not exists requirement_links (
  id uuid primary key default gen_random_uuid(), requirement_id uuid not null references requirements(id) on delete cascade,
  test_case_id uuid references test_cases(id) on delete cascade, test_plan_id uuid references test_plans(id) on delete cascade,
  test_result_id uuid references test_results(id) on delete cascade, issue_id uuid references issues(id) on delete cascade,
  created_by uuid references profiles(id) on delete set null, created_at timestamptz not null default now(),
  check (((test_case_id is not null)::integer + (test_plan_id is not null)::integer + (test_result_id is not null)::integer + (issue_id is not null)::integer) = 1)
);
create unique index if not exists uq_requirement_link_case on requirement_links (requirement_id, test_case_id) where test_case_id is not null;
create unique index if not exists uq_requirement_link_plan on requirement_links (requirement_id, test_plan_id) where test_plan_id is not null;
create unique index if not exists uq_requirement_link_result on requirement_links (requirement_id, test_result_id) where test_result_id is not null;
create unique index if not exists uq_requirement_link_issue on requirement_links (requirement_id, issue_id) where issue_id is not null;
create index if not exists idx_requirements_project on requirements (project_id, key);
create index if not exists idx_requirement_links_requirement on requirement_links (requirement_id);

create or replace function validate_requirement_link_project() returns trigger as $$
declare requirement_project uuid; target_project uuid;
begin
  select project_id into requirement_project from requirements where id = new.requirement_id;
  if new.test_case_id is not null then select project_id into target_project from test_cases where id = new.test_case_id;
  elsif new.test_plan_id is not null then select project_id into target_project from test_plans where id = new.test_plan_id;
  elsif new.test_result_id is not null then select tp.project_id into target_project from test_results r join test_runs tr on tr.id = r.test_run_id join test_plans tp on tp.id = tr.test_plan_id where r.id = new.test_result_id;
  elsif new.issue_id is not null then select tp.project_id into target_project from issues i join test_results r on r.id = i.test_result_id join test_runs tr on tr.id = r.test_run_id join test_plans tp on tp.id = tr.test_plan_id where i.id = new.issue_id;
  end if;
  if requirement_project is null or target_project is null or requirement_project <> target_project then raise exception 'Requirement dan target harus berada pada project yang sama'; end if;
  return new;
end; $$ language plpgsql security definer set search_path = public;
drop trigger if exists trg_validate_requirement_link_project on requirement_links;
create trigger trg_validate_requirement_link_project before insert or update on requirement_links for each row execute function validate_requirement_link_project();
drop trigger if exists trg_requirements_updated_at on requirements;
create trigger trg_requirements_updated_at before update on requirements for each row execute function set_updated_at();

alter table requirements enable row level security; alter table requirement_links enable row level security;
drop policy if exists "project access - requirements" on requirements;
create policy "project access - requirements" on requirements for all using (has_project_access(project_id)) with check (has_project_access(project_id));
drop policy if exists "project access - requirement links" on requirement_links;
create policy "project access - requirement links" on requirement_links for all using (has_project_access((select project_id from requirements where id = requirement_id))) with check (has_project_access((select project_id from requirements where id = requirement_id)));
