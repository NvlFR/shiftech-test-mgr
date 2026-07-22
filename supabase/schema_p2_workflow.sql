-- P2 workflow improvements. Run after all existing schema files.

alter table test_cases add column if not exists assigned_to uuid references profiles(id) on delete set null;
create index if not exists idx_test_cases_assigned_to on test_cases (assigned_to);

create table if not exists test_case_versions (
  id uuid primary key default gen_random_uuid(),
  test_case_id uuid not null references test_cases(id) on delete cascade,
  version integer not null,
  steps text not null,
  expected_result text not null,
  changed_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (test_case_id, version)
);

create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  table_name text not null,
  record_id uuid,
  action text not null check (action in ('created', 'updated', 'deleted')),
  changed_by uuid references profiles(id) on delete set null,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_audit_logs_record on audit_logs (table_name, record_id, created_at desc);

create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references profiles(id) on delete cascade,
  issue_id uuid references issues(id) on delete cascade,
  kind text not null check (kind in ('issue_assigned', 'issue_status_changed')),
  message text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_notifications_recipient on notifications (recipient_id, read_at, created_at desc);

create or replace function record_test_case_version()
returns trigger as $$
declare next_version integer;
begin
  if tg_op = 'INSERT' or old.steps is distinct from new.steps or old.expected_result is distinct from new.expected_result then
    select coalesce(max(version), 0) + 1 into next_version from test_case_versions where test_case_id = new.id;
    insert into test_case_versions(test_case_id, version, steps, expected_result, changed_by)
    values (new.id, next_version, new.steps, new.expected_result, auth.uid());
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists trg_test_case_version on test_cases;
create trigger trg_test_case_version after insert or update of steps, expected_result on test_cases
  for each row execute function record_test_case_version();

create or replace function write_audit_log()
returns trigger as $$
begin
  insert into audit_logs(table_name, record_id, action, changed_by, old_data, new_data)
  values (tg_table_name, coalesce(new.id, old.id), lower(tg_op), auth.uid(),
    case when tg_op = 'INSERT' then null else to_jsonb(old) end,
    case when tg_op = 'DELETE' then null else to_jsonb(new) end);
  return coalesce(new, old);
end;
$$ language plpgsql security definer set search_path = public;

do $$ declare table_name text;
begin
  foreach table_name in array array['projects','modules','tags','test_cases','test_plans','test_runs','test_results','issues'] loop
    execute format('drop trigger if exists trg_audit_log on %I', table_name);
    execute format('create trigger trg_audit_log after insert or update or delete on %I for each row execute function write_audit_log()', table_name);
  end loop;
end $$;

create or replace function notify_issue_changes()
returns trigger as $$
begin
  if new.assigned_to is not null and new.assigned_to is distinct from old.assigned_to then
    insert into notifications(recipient_id, issue_id, kind, message)
    values (new.assigned_to, new.id, 'issue_assigned', 'Issue ' || coalesce(new.title, new.id::text) || ' ditugaskan kepada Anda.');
  end if;
  if new.status is distinct from old.status and new.assigned_to is not null then
    insert into notifications(recipient_id, issue_id, kind, message)
    values (new.assigned_to, new.id, 'issue_status_changed', 'Status issue ' || coalesce(new.title, new.id::text) || ' berubah menjadi ' || new.status || '.');
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists trg_issue_notifications on issues;
create trigger trg_issue_notifications after update of assigned_to, status on issues
  for each row execute function notify_issue_changes();

alter table test_case_versions enable row level security;
alter table audit_logs enable row level security;
alter table notifications enable row level security;
create policy "approved users - test case versions" on test_case_versions for select using (is_approved());
create policy "approved users - audit logs" on audit_logs for select using (is_approved());
create policy "users read own notifications" on notifications for select using (recipient_id = auth.uid());
create policy "users update own notifications" on notifications for update using (recipient_id = auth.uid()) with check (recipient_id = auth.uid());
