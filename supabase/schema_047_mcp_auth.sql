-- MCP API-token authentication. Run after schema_025_fix_pgcrypto_and_audit.sql.
-- The raw token is accepted only by this narrow RPC and is never persisted.

create or replace function authenticate_mcp_api_token(p_token text)
returns table(token_id uuid, project_id uuid, scopes text[])
as $$
begin
  if p_token is null or p_token !~ '^tm_[0-9a-f]{64}$' then
    return;
  end if;

  return query
  select t.id, t.project_id, t.scopes
  from api_tokens t
  where t.token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex')
    and t.revoked_at is null;
end;
$$ language plpgsql security definer set search_path = public, extensions;

revoke all on function authenticate_mcp_api_token(text) from public;
grant execute on function authenticate_mcp_api_token(text) to anon;
