-- P2 Webhook HTTP delivery (the piece schema_019 intentionally deferred).
-- Fully in-database dispatcher: no external worker, no service-role key handed
-- to an Edge Function. Outbound HTTPS via pg_net, HMAC-SHA256 via pgcrypto, the
-- raw signing secret kept server-side in Supabase Vault (only the SHA-256 hash
-- was ever persisted in `webhooks.secret_hash`, which cannot sign). A pg_cron
-- job runs the dispatch+reconcile loop every minute.
--
-- Delivery lifecycle:
--   pending ─dispatch─▶ sending ─reconcile─▶ delivered            (HTTP 2xx)
--                                         └▶ retrying ─▶ sending  (backoff, < max_retries)
--                                         └▶ failed              (>= max_retries / no secret)
-- Run after schema_027. Idempotent.

create extension if not exists pg_net;
create extension if not exists pg_cron;

-- ---------------------------------------------------------------------------
-- Schema additions: in-flight request id + the 'sending' state
-- ---------------------------------------------------------------------------
alter table webhook_deliveries add column if not exists request_id bigint;

alter table webhook_deliveries drop constraint if exists webhook_deliveries_status_check;
alter table webhook_deliveries add constraint webhook_deliveries_status_check
  check (status in ('pending', 'sending', 'delivered', 'retrying', 'failed'));

create index if not exists idx_webhook_deliveries_sending
  on webhook_deliveries(request_id) where status = 'sending';

-- ---------------------------------------------------------------------------
-- Vault-backed signing secret. `create_webhook` (schema_019) generated a secret
-- and returned it once; here we also stash it in Vault so the dispatcher can
-- sign. Recreated with the vault write appended; behaviour is otherwise identical.
-- ---------------------------------------------------------------------------
create or replace function create_webhook(p_project_id uuid, p_name text, p_url text, p_events text[], p_max_retries integer default 5)
returns jsonb as $$
declare v_secret text; v_id uuid;
begin
  if not is_project_manager(p_project_id) then raise exception 'forbidden'; end if;
  if p_name is null or char_length(trim(p_name)) = 0 then raise exception 'webhook name is required'; end if;
  if p_url is null or p_url !~* '^https://' then raise exception 'webhook URL must use HTTPS'; end if;
  if p_events is null or cardinality(p_events) = 0 then raise exception 'at least one event is required'; end if;
  if p_max_retries < 0 or p_max_retries > 10 then raise exception 'invalid retry count'; end if;
  v_secret := 'whsec_' || encode(gen_random_bytes(32), 'hex');
  insert into webhooks(project_id, name, url, secret_hash, events, max_retries, created_by)
  values (p_project_id, trim(p_name), trim(p_url), encode(digest(v_secret, 'sha256'), 'hex'), p_events, p_max_retries, auth.uid())
  returning id into v_id;
  perform vault.create_secret(v_secret, 'webhook_secret_' || v_id, 'HMAC signing secret for webhook ' || v_id);
  perform integration_audit('webhook_created', p_project_id, v_id, jsonb_build_object('name', trim(p_name), 'url', trim(p_url), 'events', p_events));
  return jsonb_build_object('id', v_id, 'name', trim(p_name), 'url', trim(p_url), 'events', p_events, 'secret', v_secret, 'is_active', true, 'max_retries', p_max_retries, 'created_at', now());
end;
$$ language plpgsql security definer set search_path = public, extensions, vault;

-- Rotate/backfill: gives a new signing secret (and creates the Vault entry for
-- webhooks made before this migration). Returned once, never stored client-side.
create or replace function rotate_webhook_secret(p_webhook_id uuid)
returns jsonb as $$
declare v_secret text; v_project uuid; v_existing uuid;
begin
  select project_id into v_project from webhooks where id = p_webhook_id;
  if v_project is null or not is_project_manager(v_project) then raise exception 'forbidden'; end if;
  v_secret := 'whsec_' || encode(gen_random_bytes(32), 'hex');
  update webhooks set secret_hash = encode(digest(v_secret, 'sha256'), 'hex'), updated_at = now() where id = p_webhook_id;
  select id into v_existing from vault.secrets where name = 'webhook_secret_' || p_webhook_id;
  if v_existing is null then
    perform vault.create_secret(v_secret, 'webhook_secret_' || p_webhook_id, 'HMAC signing secret for webhook ' || p_webhook_id);
  else
    perform vault.update_secret(v_existing, v_secret);
  end if;
  perform integration_audit('webhook_secret_rotated', v_project, p_webhook_id);
  return jsonb_build_object('id', p_webhook_id, 'secret', v_secret);
end;
$$ language plpgsql security definer set search_path = public, extensions, vault;

-- ---------------------------------------------------------------------------
-- Dispatch: claim due deliveries, sign, fire outbound (async via pg_net).
-- The signature is HMAC-SHA256 over the exact JSON body sent (payload::text).
-- ---------------------------------------------------------------------------
create or replace function dispatch_pending_webhooks(p_limit int default 20)
returns int as $$
declare r record; v_secret text; v_sig text; v_req bigint; v_count int := 0;
begin
  for r in
    select d.id, d.event, d.payload, d.webhook_id, w.url, w.is_active
    from webhook_deliveries d
    join webhooks w on w.id = d.webhook_id
    where d.status in ('pending', 'retrying') and d.next_attempt_at <= now()
    order by d.next_attempt_at
    limit greatest(1, least(p_limit, 100))
    for update of d skip locked
  loop
    if not r.is_active then
      update webhook_deliveries set status = 'failed', last_error = 'WEBHOOK_INACTIVE', updated_at = now() where id = r.id;
      continue;
    end if;
    select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'webhook_secret_' || r.webhook_id;
    if v_secret is null then
      update webhook_deliveries set status = 'failed', last_error = 'SECRET_UNAVAILABLE_ROTATE_WEBHOOK', updated_at = now() where id = r.id;
      continue;
    end if;
    v_sig := encode(hmac(r.payload::text, v_secret, 'sha256'), 'hex');
    v_req := net.http_post(
      url := r.url,
      body := r.payload,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'X-TM-Event', r.event,
        'X-TM-Delivery', r.id::text,
        'X-TM-Signature', 'sha256=' || v_sig
      ),
      timeout_milliseconds := 10000
    );
    update webhook_deliveries
      set status = 'sending', request_id = v_req, attempt_count = attempt_count + 1,
          next_attempt_at = now() + interval '5 minutes', updated_at = now()
      where id = r.id;
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$ language plpgsql security definer set search_path = public, extensions, vault, net;

-- Failure path shared by reconcile: retry with exponential backoff until the
-- webhook's max_retries is exhausted, then give up.
create or replace function _fail_webhook_delivery(p_id uuid, p_attempt int, p_max int, p_status int, p_error text)
returns void as $$
begin
  if p_attempt > p_max then
    update webhook_deliveries set status = 'failed', response_status = p_status, last_error = p_error, updated_at = now() where id = p_id;
  else
    update webhook_deliveries set status = 'retrying', response_status = p_status, last_error = p_error,
      next_attempt_at = now() + make_interval(secs => least(3600, 30 * power(2, p_attempt)::int)), updated_at = now()
    where id = p_id;
  end if;
end;
$$ language plpgsql security definer set search_path = public;

-- Reconcile: match in-flight ('sending') deliveries to their pg_net response.
create or replace function reconcile_webhook_deliveries()
returns int as $$
declare r record; v_status int; v_content text; v_found boolean; v_count int := 0;
begin
  for r in
    select d.id, d.request_id, d.attempt_count, d.next_attempt_at, w.max_retries
    from webhook_deliveries d
    join webhooks w on w.id = d.webhook_id
    where d.status = 'sending' and d.request_id is not null
    for update of d skip locked
  loop
    select true, status_code, content into v_found, v_status, v_content
    from net._http_response where id = r.request_id;
    if not v_found then
      -- still in flight; only give up once the lease expires
      if r.next_attempt_at <= now() then
        perform _fail_webhook_delivery(r.id, r.attempt_count, r.max_retries, null, 'NO_RESPONSE_TIMEOUT');
        v_count := v_count + 1;
      end if;
      continue;
    end if;
    if v_status between 200 and 299 then
      update webhook_deliveries set status = 'delivered', delivered_at = now(),
        response_status = v_status, response_body = left(v_content, 2000), last_error = null, updated_at = now()
      where id = r.id;
    else
      perform _fail_webhook_delivery(r.id, r.attempt_count, r.max_retries, v_status, 'HTTP_' || coalesce(v_status::text, 'ERR'));
    end if;
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$ language plpgsql security definer set search_path = public, net;

-- One-shot driver for the cron job: reconcile first (frees leases), then dispatch.
create or replace function run_webhook_dispatch()
returns jsonb as $$
declare v_sent int; v_rec int;
begin
  v_rec := reconcile_webhook_deliveries();
  v_sent := dispatch_pending_webhooks(20);
  return jsonb_build_object('dispatched', v_sent, 'reconciled', v_rec);
end;
$$ language plpgsql security definer set search_path = public;

-- Dispatcher internals are server-side only (invoked by pg_cron as the job owner).
revoke all on function dispatch_pending_webhooks(int) from public, anon, authenticated;
revoke all on function reconcile_webhook_deliveries() from public, anon, authenticated;
revoke all on function _fail_webhook_delivery(uuid, int, int, int, text) from public, anon, authenticated;
revoke all on function run_webhook_dispatch() from public, anon, authenticated;
-- Secret rotation is a project-manager action from the UI.
revoke all on function rotate_webhook_secret(uuid) from public, anon;
grant execute on function rotate_webhook_secret(uuid) to authenticated;

-- Every minute: reconcile + dispatch. cron.schedule upserts by job name.
select cron.schedule('webhook-dispatch', '* * * * *', 'select public.run_webhook_dispatch();');
