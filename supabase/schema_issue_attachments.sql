-- Issue attachments — run after schema_project_members.sql and schema_issue_code.sql.

create table if not exists issue_attachments (
  id uuid primary key default gen_random_uuid(),
  issue_id uuid not null references issues(id) on delete cascade,
  file_name text not null,
  storage_path text not null unique,
  mime_type text not null,
  size_bytes bigint not null,
  uploaded_by uuid not null references profiles(id) on delete restrict,
  created_at timestamptz not null default now()
);

create index if not exists idx_issue_attachments_issue on issue_attachments (issue_id);

create or replace function has_issue_access(p_issue_id uuid)
returns boolean as $$
  select has_project_access((
    select tp.project_id
    from issues i
    join test_results res on res.id = i.test_result_id
    join test_runs run on run.id = res.test_run_id
    join test_plans tp on tp.id = run.test_plan_id
    where i.id = p_issue_id
  ));
$$ language sql security definer set search_path = public stable;

alter table issue_attachments enable row level security;

create policy "project access - issue attachments select" on issue_attachments
  for select using (has_issue_access(issue_id));

create policy "issue managers - issue attachments insert" on issue_attachments
  for insert with check (
    can_manage_issues((
      select tp.project_id
      from issues i
      join test_results res on res.id = i.test_result_id
      join test_runs run on run.id = res.test_run_id
      join test_plans tp on tp.id = run.test_plan_id
      where i.id = issue_id
    ))
    and uploaded_by = auth.uid()
  );

create policy "issue managers - issue attachments delete" on issue_attachments
  for delete using (
    can_manage_issues((
      select tp.project_id
      from issues i
      join test_results res on res.id = i.test_result_id
      join test_runs run on run.id = res.test_run_id
      join test_plans tp on tp.id = run.test_plan_id
      where i.id = issue_id
    ))
  );

insert into storage.buckets (id, name, public)
values ('issue-attachments', 'issue-attachments', false)
on conflict (id) do update set public = false;

create policy "issue attachments storage select" on storage.objects
  for select using (
    bucket_id = 'issue-attachments'
    and has_issue_access((split_part(storage.objects.name, '/', 1))::uuid)
  );

create policy "issue attachments storage insert" on storage.objects
  for insert with check (
    bucket_id = 'issue-attachments'
    and can_manage_issues((
      select tp.project_id
      from issues i
      join test_results res on res.id = i.test_result_id
      join test_runs run on run.id = res.test_run_id
      join test_plans tp on tp.id = run.test_plan_id
      where i.id = (split_part(storage.objects.name, '/', 1))::uuid
    ))
  );

create policy "issue attachments storage delete" on storage.objects
  for delete using (
    bucket_id = 'issue-attachments'
    and can_manage_issues((
    select tp.project_id
    from issues i
      join test_results res on res.id = i.test_result_id
      join test_runs run on run.id = res.test_run_id
      join test_plans tp on tp.id = run.test_plan_id
      where i.id = (split_part(storage.objects.name, '/', 1))::uuid
    ))
  );
