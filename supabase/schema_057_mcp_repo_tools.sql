-- MCP-14 repository context tools. Run after schema_056_mcp_rerun_failed.sql
-- and schema_043_repository_credentials_vault.sql. Not executed automatically.

create or replace function mcp_get_repository_configuration(
  p_token text,
  p_project_id uuid,
  p_repository_id uuid
)
returns table (
  id uuid,
  name text,
  source_type text,
  url_or_path text,
  default_branch text,
  subdirectory text,
  credential text
)
language plpgsql
security definer
set search_path = public, vault, extensions, pg_temp
stable
as $$
begin
  if not mcp_api_token_has_project(p_token, p_project_id) then
    raise exception using errcode = '42501', message = 'MCP_READ_FORBIDDEN';
  end if;

  return query
  select r.id, r.name, r.source_type, r.url_or_path, r.default_branch,
         r.subdirectory, ds.decrypted_secret
  from project_repositories r
  left join vault.decrypted_secrets ds on ds.id = r.credential_id
  where r.id = p_repository_id
    and r.project_id = p_project_id
    and r.is_active;
end;
$$;

revoke all on function mcp_get_repository_configuration(text, uuid, uuid) from public;
grant execute on function mcp_get_repository_configuration(text, uuid, uuid) to anon;
