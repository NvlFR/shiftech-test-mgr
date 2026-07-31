-- Keep the private Storage bucket consistent when Issue attachment metadata is
-- removed by cascading deletes (Issue, Test Result, Test Run, or Project).
-- Run after schema_issue_attachments.sql.

create or replace function delete_issue_attachment_storage_object()
returns trigger
language plpgsql
security definer
set search_path = public, storage
as $$
begin
  delete from storage.objects
  where bucket_id = 'issue-attachments'
    and name = old.storage_path;
  return old;
end;
$$;

revoke all on function delete_issue_attachment_storage_object() from public, anon, authenticated;

drop trigger if exists trg_issue_attachment_storage_cleanup on issue_attachments;
create trigger trg_issue_attachment_storage_cleanup
before delete on issue_attachments
for each row execute function delete_issue_attachment_storage_object();
