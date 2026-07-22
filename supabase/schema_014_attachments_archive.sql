-- P1 attachments for Test Case/Test Run and project archive hardening.
-- Run after schema_project_roles.sql and schema_issue_attachments.sql.

create table if not exists attachments (
  id uuid primary key default gen_random_uuid(),
  entity_kind text not null check (entity_kind in ('test_case', 'test_run')),
  test_case_id uuid references test_cases(id) on delete cascade,
  test_run_id uuid references test_runs(id) on delete cascade,
  file_name text not null,
  storage_path text not null unique,
  mime_type text not null,
  size_bytes bigint not null check (size_bytes > 0),
  uploaded_by uuid not null references profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint attachments_single_parent check (
    (entity_kind = 'test_case' and test_case_id is not null and test_run_id is null)
    or (entity_kind = 'test_run' and test_run_id is not null and test_case_id is null)
  )
);

create index if not exists idx_attachments_test_case on attachments (test_case_id) where test_case_id is not null;
create index if not exists idx_attachments_test_run on attachments (test_run_id) where test_run_id is not null;

create or replace function attachment_project_id(p_kind text, p_entity_id uuid)
returns uuid as $$
  select case
    when p_kind = 'test_case' then (select project_id from test_cases where id = p_entity_id)
    when p_kind = 'test_run' then (select tp.project_id from test_runs tr join test_plans tp on tp.id = tr.test_plan_id where tr.id = p_entity_id)
    else null
  end;
$$ language sql security definer set search_path = public stable;

create or replace function can_upload_attachment(p_kind text, p_entity_id uuid)
returns boolean as $$
  select case
    when p_kind = 'test_case' then can_edit_project_content(attachment_project_id(p_kind, p_entity_id))
    when p_kind = 'test_run' then can_run_tests(attachment_project_id(p_kind, p_entity_id))
    else false
  end;
$$ language sql security definer set search_path = public stable;

create or replace function can_delete_attachment(p_kind text, p_entity_id uuid)
returns boolean as $$
  select can_delete_project_content(attachment_project_id(p_kind, p_entity_id));
$$ language sql security definer set search_path = public stable;

alter table attachments enable row level security;

create policy "project access - attachments select" on attachments
  for select using (has_project_access(attachment_project_id(entity_kind, coalesce(test_case_id, test_run_id))));

create policy "project editors - test case attachments insert" on attachments
  for insert with check (
    entity_kind = 'test_case'
    and uploaded_by = auth.uid()
    and can_upload_attachment(entity_kind, test_case_id)
  );

create policy "test runners - test run attachments insert" on attachments
  for insert with check (
    entity_kind = 'test_run'
    and uploaded_by = auth.uid()
    and can_upload_attachment(entity_kind, test_run_id)
  );

create policy "project managers - attachments delete" on attachments
  for delete using (can_delete_attachment(entity_kind, coalesce(test_case_id, test_run_id)));

insert into storage.buckets (id, name, public)
values ('test-attachments', 'test-attachments', false)
on conflict (id) do update set public = false;

create policy "test attachments storage select" on storage.objects
  for select using (
    bucket_id = 'test-attachments'
    and has_project_access(attachment_project_id(split_part(name, '/', 1), (split_part(name, '/', 2))::uuid))
  );

create policy "test attachments storage insert" on storage.objects
  for insert with check (
    bucket_id = 'test-attachments'
    and can_upload_attachment(split_part(name, '/', 1), (split_part(name, '/', 2))::uuid)
  );

create policy "test attachments storage delete" on storage.objects
  for delete using (
    bucket_id = 'test-attachments'
    and can_delete_attachment(split_part(name, '/', 1), (split_part(name, '/', 2))::uuid)
  );

-- Archive is a status transition only. Existing project manager/admin UPDATE RLS
-- remains the authorization boundary; no dependent rows are deleted.
comment on column projects.status is 'active/inactive/archived; archived projects retain all testing history';
