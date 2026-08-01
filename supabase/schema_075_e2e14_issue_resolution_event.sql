-- E2E-14: dedicated Issue resolution event and optional commit/PR reference.
-- Run after schema_074_e2e12_ai_issue_draft.sql. Idempotent; do not run automatically.

alter table issues
  add column if not exists fix_reference_url text;

alter table issues drop constraint if exists issues_fix_reference_url_check;
alter table issues add constraint issues_fix_reference_url_check
  check (fix_reference_url is null or fix_reference_url ~* '^https://[^[:space:]]+$');

alter table webhook_deliveries drop constraint if exists webhook_deliveries_event_check;
alter table webhook_deliveries add constraint webhook_deliveries_event_check
  check (event in (
    'test_run.created', 'test_run.updated', 'test_result.updated',
    'issue.created', 'issue.updated', 'issue.resolved'
  ));

create or replace function queue_issue_webhook() returns trigger as $$
declare v_project uuid; v_event text;
begin
  select coalesce(tp.project_id, tr.custom_project_id) into v_project
  from test_results r
  join test_runs tr on tr.id = r.test_run_id
  left join test_plans tp on tp.id = tr.test_plan_id
  where r.id = new.test_result_id;

  v_event := case
    when tg_op = 'INSERT' then 'issue.created'
    when new.status = 'resolved' and old.status is distinct from 'resolved' then 'issue.resolved'
    else 'issue.updated'
  end;
  perform enqueue_webhook_deliveries(v_project, v_event, new.id, to_jsonb(new));
  return new;
end;
$$ language plpgsql security definer set search_path = public;

comment on column issues.fix_reference_url is
  'Optional HTTPS commit or pull-request URL that claims to fix the Issue.';
