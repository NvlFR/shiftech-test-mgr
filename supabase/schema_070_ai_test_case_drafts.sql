-- E2E-04: mark AI-generated test cases and keep them in human-review draft state.
-- Run manually after schema_069_pw19_step_commands.sql.

alter table test_cases
  add column if not exists source text not null default 'manual';

alter table test_cases drop constraint if exists test_cases_source_check;
alter table test_cases
  add constraint test_cases_source_check check (source in ('manual', 'ai'));

alter table test_cases drop constraint if exists test_cases_status_check;
alter table test_cases
  add constraint test_cases_status_check check (status in ('draft', 'active', 'archived'));
