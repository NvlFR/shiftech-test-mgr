-- ADM-07: admin-only operational health and searchable error log.

create table if not exists operational_error_logs (
  id bigint generated always as identity primary key,
  source text not null check (source in ('worker', 'queue', 'storage', 'integration')),
  severity text not null default 'error' check (severity in ('warning', 'error', 'critical')),
  code text,
  message text not null check (char_length(message) <= 2000),
  project_id uuid references projects(id) on delete set null,
  resource_type text,
  resource_id text,
  context jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_operational_error_logs_occurred
  on operational_error_logs (occurred_at desc);
create index if not exists idx_operational_error_logs_source
  on operational_error_logs (source, occurred_at desc);

alter table operational_error_logs enable row level security;
drop policy if exists "Admins read operational error logs" on operational_error_logs;
create policy "Admins read operational error logs" on operational_error_logs
  for select to authenticated using (is_admin());

create or replace function redact_operational_message(p_message text)
returns text language sql immutable set search_path = public as $$
  select left(
    regexp_replace(
      regexp_replace(coalesce(p_message, 'Unknown operational error'),
        '(authorization|token|secret|password|api[_-]?key)\s*[:=]\s*[^\s,;]+',
        '\1=[REDACTED]', 'gi'),
      '(bearer)\s+[^\s,;]+', '\1 [REDACTED]', 'gi'),
    2000);
$$;

create or replace function capture_operational_failure()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_source text := tg_argv[0];
  v_message text;
  v_project_id uuid;
  v_resource_type text := tg_argv[1];
begin
  if v_source = 'queue' then
    if new.status <> 'failed' or old.status = 'failed' then return new; end if;
    v_message := new.error_message;
    v_project_id := new.project_id;
  elsif v_source = 'integration' then
    if new.status <> 'failed' or old.status = 'failed' then return new; end if;
    v_message := new.last_error;
    v_project_id := new.project_id;
  else
    return new;
  end if;

  insert into operational_error_logs
    (source, severity, code, message, project_id, resource_type, resource_id)
  values
    (v_source, 'error', upper(new.status), redact_operational_message(v_message),
     v_project_id, v_resource_type, new.id::text);
  return new;
end;
$$;

drop trigger if exists trg_log_automation_job_failure on automation_jobs;
create trigger trg_log_automation_job_failure
after update of status on automation_jobs for each row
execute function capture_operational_failure('queue', 'automation_job');

drop trigger if exists trg_log_webhook_delivery_failure on webhook_deliveries;
create trigger trg_log_webhook_delivery_failure
after update of status on webhook_deliveries for each row
execute function capture_operational_failure('integration', 'webhook_delivery');

create or replace function get_operational_health()
returns jsonb language plpgsql stable security definer set search_path = public, storage as $$
declare
  v_worker jsonb;
  v_queue jsonb;
  v_storage jsonb;
  v_integration jsonb;
begin
  if not is_admin() then raise exception 'Admin access required' using errcode = '42501'; end if;

  select jsonb_build_object(
    'status', case when count(*) filter (where active) = 0 then 'warning'
                   when count(*) filter (where active and last_seen_at >= now() - interval '2 minutes') = 0 then 'down'
                   else 'healthy' end,
    'summary', count(*) filter (where active and last_seen_at >= now() - interval '2 minutes') || ' runner online',
    'details', jsonb_build_object('active', count(*) filter (where active), 'online', count(*) filter (where active and last_seen_at >= now() - interval '2 minutes'), 'last_seen_at', max(last_seen_at)))
  into v_worker from automation_runners;

  select jsonb_build_object(
    'status', case when count(*) filter (where status = 'queued' and queued_at < now() - interval '15 minutes') > 0 then 'warning' else 'healthy' end,
    'summary', count(*) filter (where status = 'queued') || ' job antre',
    'details', jsonb_build_object('queued', count(*) filter (where status = 'queued'), 'running', count(*) filter (where status = 'running'), 'stale', count(*) filter (where status = 'queued' and queued_at < now() - interval '15 minutes')))
  into v_queue from automation_jobs;

  select jsonb_build_object(
    'status', case when count(*) filter (where id in ('test-attachments', 'issue-attachments', 'automation-artifacts')) = 3 then 'healthy' else 'down' end,
    'summary', count(*) filter (where id in ('test-attachments', 'issue-attachments', 'automation-artifacts')) || '/3 bucket tersedia',
    'details', jsonb_build_object('expected', 3, 'available', count(*) filter (where id in ('test-attachments', 'issue-attachments', 'automation-artifacts'))))
  into v_storage from storage.buckets;

  select jsonb_build_object(
    'status', case when count(*) filter (where status = 'failed' and created_at >= now() - interval '24 hours') > 0 then 'warning' else 'healthy' end,
    'summary', count(*) filter (where status = 'failed' and created_at >= now() - interval '24 hours') || ' webhook gagal (24 jam)',
    'details', jsonb_build_object('failed_24h', count(*) filter (where status = 'failed' and created_at >= now() - interval '24 hours'), 'retrying', count(*) filter (where status = 'retrying')))
  into v_integration from webhook_deliveries;

  return jsonb_build_object('checked_at', now(), 'components', jsonb_build_array(
    jsonb_build_object('name', 'worker', 'label', 'Worker', 'status', v_worker->>'status', 'summary', v_worker->>'summary', 'details', v_worker->'details'),
    jsonb_build_object('name', 'queue', 'label', 'Queue', 'status', v_queue->>'status', 'summary', v_queue->>'summary', 'details', v_queue->'details'),
    jsonb_build_object('name', 'storage', 'label', 'Storage', 'status', v_storage->>'status', 'summary', v_storage->>'summary', 'details', v_storage->'details'),
    jsonb_build_object('name', 'integration', 'label', 'Integrasi', 'status', v_integration->>'status', 'summary', v_integration->>'summary', 'details', v_integration->'details')
  ));
end;
$$;

revoke all on operational_error_logs from anon, authenticated;
grant select on operational_error_logs to authenticated;
revoke all on function get_operational_health() from public;
grant execute on function get_operational_health() to authenticated;
revoke all on function redact_operational_message(text) from public;

