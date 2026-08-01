-- BOOT-01: short-lived, single-use bootstrap codes for local automation runners.
-- Run manually after schema_084_agent10_unified_heartbeat.sql.
--
-- Bootstrap codes and runner tokens are secrets. Only SHA-256 hashes are stored.
-- The bootstrap code is returned once by issue_agent_bootstrap_code(). The local
-- agent generates its runner token and submits it only to redeem the code.

create extension if not exists pgcrypto;

create table if not exists agent_bootstrap_codes (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  code_hash text not null unique,
  issued_by uuid not null references profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '10 minutes'),
  used_at timestamptz,
  runner_id uuid references automation_runners(id) on delete set null,
  constraint agent_bootstrap_codes_hash_format check (code_hash ~ '^[0-9a-f]{64}$'),
  constraint agent_bootstrap_codes_expiry_after_creation check (expires_at > created_at),
  constraint agent_bootstrap_codes_usage_consistent check (
    (used_at is null and runner_id is null)
    or used_at is not null
  )
);

create index if not exists idx_agent_bootstrap_codes_project
  on agent_bootstrap_codes(project_id, created_at desc);
create index if not exists idx_agent_bootstrap_codes_redeemable
  on agent_bootstrap_codes(code_hash, expires_at)
  where used_at is null;

alter table agent_bootstrap_codes enable row level security;

-- Issuance is project-scoped. Raw codes are never readable from this table and
-- redemption is performed only through the narrowly scoped security-definer RPC.
drop policy if exists "project members - agent bootstrap codes insert" on agent_bootstrap_codes;
create policy "project members - agent bootstrap codes insert"
  on agent_bootstrap_codes for insert to authenticated
  with check (has_project_access(project_id) and issued_by = auth.uid());

create or replace function issue_agent_bootstrap_code(p_project_id uuid)
returns jsonb as $$
declare
  v_code text;
  v_bootstrap agent_bootstrap_codes%rowtype;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;
  if not has_project_access(p_project_id) then
    raise exception 'FORBIDDEN';
  end if;

  v_code := 'tmb_' || encode(extensions.gen_random_bytes(24), 'hex');

  insert into agent_bootstrap_codes(project_id, code_hash, issued_by)
  values (
    p_project_id,
    encode(extensions.digest(v_code, 'sha256'), 'hex'),
    auth.uid()
  )
  returning * into v_bootstrap;

  return jsonb_build_object(
    'bootstrap_code', v_code,
    'expires_at', v_bootstrap.expires_at,
    'project_id', v_bootstrap.project_id
  );
end;
$$ language plpgsql security definer set search_path = public, extensions;

create or replace function redeem_agent_bootstrap_code(
  p_code text,
  p_runner_token text,
  p_runner_name text default 'Local Agent',
  p_runner_labels text[] default '{}'
)
returns jsonb as $$
declare
  v_bootstrap agent_bootstrap_codes%rowtype;
  v_runner automation_runners%rowtype;
begin
  if p_code is null or p_code !~ '^tmb_[0-9a-f]{48}$' then
    raise exception 'INVALID_OR_EXPIRED_BOOTSTRAP_CODE';
  end if;
  if p_runner_token is null
     or p_runner_token !~ '^tm_[a-zA-Z0-9]{32,}$'
     or length(p_runner_token) > 512 then
    raise exception 'INVALID_RUNNER_TOKEN';
  end if;
  if length(trim(coalesce(p_runner_name, ''))) not between 1 and 120 then
    raise exception 'INVALID_RUNNER_NAME';
  end if;

  select * into v_bootstrap
  from agent_bootstrap_codes
  where code_hash = encode(extensions.digest(p_code, 'sha256'), 'hex')
    and used_at is null
    and expires_at > now()
  for update;

  if not found then
    raise exception 'INVALID_OR_EXPIRED_BOOTSTRAP_CODE';
  end if;

  insert into automation_runners(
    project_id,
    name,
    labels,
    token_prefix,
    token_hash,
    created_by
  )
  values (
    v_bootstrap.project_id,
    trim(p_runner_name),
    coalesce(p_runner_labels, '{}'),
    left(p_runner_token, 11),
    encode(extensions.digest(p_runner_token, 'sha256'), 'hex'),
    v_bootstrap.issued_by
  )
  returning * into v_runner;

  update agent_bootstrap_codes
  set used_at = now(), runner_id = v_runner.id
  where id = v_bootstrap.id;

  return jsonb_build_object(
    'runner', to_jsonb(v_runner) - 'token_hash',
    'project_id', v_runner.project_id
  );
end;
$$ language plpgsql security definer set search_path = public, extensions;

revoke all on table agent_bootstrap_codes from public, anon, authenticated;
grant insert on table agent_bootstrap_codes to authenticated;

revoke all on function issue_agent_bootstrap_code(uuid) from public, anon;
grant execute on function issue_agent_bootstrap_code(uuid) to authenticated;

revoke all on function redeem_agent_bootstrap_code(text, text, text, text[]) from public;
grant execute on function redeem_agent_bootstrap_code(text, text, text, text[]) to anon, authenticated;
