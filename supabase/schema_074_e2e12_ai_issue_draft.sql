-- E2E-12: AI-generated Issues remain drafts until an authenticated human changes status.
-- Run manually after schema_073_e2e08_reviewed_test_plan.sql.

alter table issues drop constraint if exists issues_status_check;
alter table issues add constraint issues_status_check
  check (status in ('draft', 'backlog', 'open', 'in_progress', 'resolved', 'verified', 'closed', 'rejected', 'duplicate'));

create or replace function guard_issue_draft_verification()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if old.status = 'draft' and new.status <> 'draft' and auth.uid() is null then
    raise exception 'Issue draft hanya dapat diverifikasi oleh user terautentikasi';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_guard_issue_draft_verification on issues;
create trigger trg_guard_issue_draft_verification
before update of status on issues
for each row execute function guard_issue_draft_verification();
