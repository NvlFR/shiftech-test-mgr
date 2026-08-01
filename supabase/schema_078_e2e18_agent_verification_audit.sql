-- E2E-18: distinguish agent verification audit entries from human overrides.
-- Run after schema_077_e2e17_regression_verification.sql. Do not run automatically.

alter table audit_logs
  add column if not exists actor_type text;

update audit_logs
   set actor_type = case
     when table_name like 'mcp.%' and new_data ? 'agent_action' then 'agent'
     when changed_by is not null then 'human'
     else 'system'
   end
 where actor_type is null;

alter table audit_logs
  alter column actor_type set default 'human',
  alter column actor_type set not null;

alter table audit_logs drop constraint if exists audit_logs_actor_type_check;
alter table audit_logs add constraint audit_logs_actor_type_check
  check (actor_type in ('human', 'agent', 'system'));

create or replace function classify_audit_actor()
returns trigger as $$
begin
  new.actor_type := case
    when new.table_name like 'mcp.%' and new.new_data ? 'agent_action' then 'agent'
    when new.changed_by is not null then 'human'
    else 'system'
  end;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists trg_classify_audit_actor on audit_logs;
create trigger trg_classify_audit_actor
before insert on audit_logs
for each row execute function classify_audit_actor();

revoke execute on function classify_audit_actor() from public, anon, authenticated;

comment on column audit_logs.actor_type is
  'Origin of the action: human UI/user action, agent MCP action, or system automation.';
