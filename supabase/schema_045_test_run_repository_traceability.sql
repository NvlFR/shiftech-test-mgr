-- Link a Test Run to the exact repository revision under test.
-- Run after schema_029_project_repositories.sql and schema_044_repository_connection_test.sql.

alter table test_runs add column if not exists repository_id uuid;
alter table test_runs add column if not exists branch text;
alter table test_runs add column if not exists commit_sha text;

alter table test_runs
  drop constraint if exists test_runs_repository_fk;
alter table test_runs
  add constraint test_runs_repository_fk
  foreign key (repository_id) references project_repositories(id) on delete set null;

create index if not exists idx_test_runs_repository
  on test_runs(repository_id, started_at desc);
create index if not exists idx_test_runs_commit_sha
  on test_runs(commit_sha);

