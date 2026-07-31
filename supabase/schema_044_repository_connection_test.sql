-- Service-role-only credential lookup for repository connection tests.
-- Run after schema_043_repository_credentials_vault.sql.

create or replace function get_repository_connection(
  p_project_id uuid,
  p_repository_id uuid,
  p_actor_id uuid
)
returns table (source_type text, url_or_path text, token text)
language plpgsql
security definer
set search_path = public, vault, pg_temp
as $$
begin
  if not (
    exists (select 1 from profiles where id = p_actor_id and role = 'admin' and deleted_at is null)
    or exists (select 1 from projects where id = p_project_id and owner_id = p_actor_id)
    or exists (
      select 1 from project_members
      where project_id = p_project_id and user_id = p_actor_id
        and role = 'manager' and status = 'accepted'
    )
  ) then
    raise exception using errcode = '42501', message = 'forbidden';
  end if;

  return query
  select r.source_type, r.url_or_path, s.decrypted_secret
  from project_repositories r
  left join vault.decrypted_secrets s on s.id = r.credential_id
  where r.id = p_repository_id and r.project_id = p_project_id;
end;
$$;

revoke all on function get_repository_connection(uuid, uuid, uuid) from public, anon, authenticated;
grant execute on function get_repository_connection(uuid, uuid, uuid) to service_role;
