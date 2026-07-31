-- SRC-02: metadata from the integrated IssueEditor.
-- Run manually after schema_038_test_suite_structured_metadata.sql.

alter table issues add column if not exists type text not null default 'bug';
alter table issues add column if not exists external_links jsonb not null default '[]'::jsonb;

alter table issues drop constraint if exists issues_type_check;
alter table issues add constraint issues_type_check
  check (type in ('bug', 'feature', 'improvement', 'task'));
