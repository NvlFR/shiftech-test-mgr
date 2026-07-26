-- Fixes for two latent bugs surfaced when the P2/P3 chain was first applied to a
-- real Supabase project (2026-07-26).
--
-- Bug 1: pgcrypto (digest/gen_random_bytes) lives in the `extensions` schema on
--        Supabase, but the token-hashing functions were created with
--        `search_path = public`, so `digest(...)` resolved to nothing at runtime
--        ("function digest(text, unknown) does not exist"). Fix: add `extensions`
--        to each affected function's search_path.
--
-- Bug 2: write_audit_log() inserted lower(tg_op) = 'insert'/'update'/'delete',
--        but audit_logs.action only allows 'created'/'updated'/'deleted', so the
--        AFTER trigger raised and rolled back every write to the audited tables
--        (projects, modules, tags, test_cases, test_plans, test_runs,
--        test_results, issues). Fix: map tg_op to the allowed verbs.

-- === Bug 1: pgcrypto search_path ===
alter function public.create_automation_runner(uuid, text, text[], text, uuid) set search_path = public, extensions;
alter function public.rotate_automation_runner_token(uuid, text) set search_path = public, extensions;
alter function public.poll_automation_job(text) set search_path = public, extensions;
alter function public.report_automation_job(text, uuid, jsonb) set search_path = public, extensions;
alter function public.heartbeat_automation_runner(text) set search_path = public, extensions;

alter function public.create_cicd_pipeline(uuid, uuid, text, text, text, uuid) set search_path = public, extensions;
alter function public.rotate_cicd_pipeline_token(uuid, text) set search_path = public, extensions;
alter function public.ingest_cicd_test_run(text, jsonb) set search_path = public, extensions;

alter function public.create_api_token(uuid, text, text[]) set search_path = public, extensions;
alter function public.create_webhook(uuid, text, text, text[], integer) set search_path = public, extensions;

-- === Bug 2: audit action verb mapping ===
create or replace function write_audit_log()
returns trigger as $$
declare record_id uuid := coalesce(new.id, old.id);
begin
  insert into audit_logs(table_name, record_id, project_id, action, changed_by, old_data, new_data)
  values (
    tg_table_name,
    record_id,
    audit_log_project_id(tg_table_name, record_id),
    case tg_op when 'INSERT' then 'created' when 'UPDATE' then 'updated' when 'DELETE' then 'deleted' else lower(tg_op) end,
    auth.uid(),
    case when tg_op = 'INSERT' then null else to_jsonb(old) end,
    case when tg_op = 'DELETE' then null else to_jsonb(new) end
  );
  return coalesce(new, old);
end;
$$ language plpgsql security definer set search_path = public;
revoke execute on function public.write_audit_log() from public, anon, authenticated;