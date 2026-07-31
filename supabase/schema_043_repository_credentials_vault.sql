-- Repository credential lifecycle backed by Supabase Vault.
-- Run after schema_029_project_repositories.sql and schema_042_issue_attachment_storage_cleanup.sql.
-- The functions are service-role-only: browsers cannot call Vault RPCs directly.

alter table project_repositories
  add column if not exists credential_mask text,
  add column if not exists credential_created_at timestamptz,
  add column if not exists credential_expires_at timestamptz;

create or replace function manage_repository_credential(
  p_action text,
  p_project_id uuid,
  p_repository_id uuid,
  p_actor_id uuid,
  p_token text default null,
  p_mask text default null,
  p_expires_at timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, vault, pg_temp
as $$
declare
  v_repository project_repositories%rowtype;
  v_credential_id uuid;
  v_created_at timestamptz := now();
  v_authorized boolean;
begin
  select (
    exists (
      select 1 from profiles
      where id = p_actor_id and role = 'admin' and deleted_at is null
    )
    or exists (
      select 1 from projects
      where id = p_project_id and owner_id = p_actor_id
    )
    or exists (
      select 1 from project_members
      where project_id = p_project_id
        and user_id = p_actor_id
        and role = 'manager'
        and status = 'accepted'
    )
  ) into v_authorized;

  if not coalesce(v_authorized, false) then
    raise exception using errcode = '42501', message = 'forbidden';
  end if;

  select * into v_repository
  from project_repositories
  where id = p_repository_id and project_id = p_project_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'repository_not_found';
  end if;

  if p_action in ('store', 'rotate') then
    if p_token is null or length(p_token) < 8 or p_mask is null then
      raise exception using errcode = '22023', message = 'invalid_credential';
    end if;

    if p_action = 'store' and v_repository.credential_id is not null then
      raise exception using errcode = '23505', message = 'credential_already_exists';
    end if;
    if p_action = 'rotate' and v_repository.credential_id is null then
      raise exception using errcode = 'P0002', message = 'credential_not_found';
    end if;

    if v_repository.credential_id is null then
      v_credential_id := vault.create_secret(
        p_token,
        'repo-' || p_repository_id::text,
        'TestManager repository credential'
      );
    else
      v_credential_id := v_repository.credential_id;
      perform vault.update_secret(v_credential_id, p_token);
    end if;

    update project_repositories
    set credential_id = v_credential_id,
        credential_mask = p_mask,
        credential_created_at = v_created_at,
        credential_expires_at = p_expires_at
    where id = p_repository_id;

    insert into audit_logs(table_name, record_id, project_id, action, changed_by, new_data)
    values (
      'repository_credentials.' || p_action,
      p_repository_id,
      p_project_id,
      'updated',
      p_actor_id,
      jsonb_build_object('expires_at', p_expires_at)
    );

    return jsonb_build_object(
      'credential_id', v_credential_id,
      'mask', p_mask,
      'created_at', v_created_at,
      'expires_at', p_expires_at
    );
  elsif p_action = 'revoke' then
    v_credential_id := v_repository.credential_id;

    update project_repositories
    set credential_id = null,
        credential_mask = null,
        credential_created_at = null,
        credential_expires_at = null
    where id = p_repository_id;

    if v_credential_id is not null then
      delete from vault.secrets where id = v_credential_id;
    end if;

    insert into audit_logs(table_name, record_id, project_id, action, changed_by, new_data)
    values ('repository_credentials.revoke', p_repository_id, p_project_id, 'updated', p_actor_id, '{}'::jsonb);

    return jsonb_build_object(
      'credential_id', null,
      'mask', null,
      'created_at', null,
      'expires_at', null
    );
  end if;

  raise exception using errcode = '22023', message = 'invalid_action';
end;
$$;

revoke all on function manage_repository_credential(text, uuid, uuid, uuid, text, text, timestamptz)
  from public, anon, authenticated;
grant execute on function manage_repository_credential(text, uuid, uuid, uuid, text, text, timestamptz)
  to service_role;

