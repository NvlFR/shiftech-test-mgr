-- Optional sample data for local exploration.
-- Seed can run from the SQL editor/CLI/MCP service context, where auth.uid()
-- is normally null, by impersonating an existing active approved profile only
-- for this transaction. The project trigger then creates the owner membership.
do $$
declare
  seed_owner_id uuid;
begin
  select id into seed_owner_id
  from profiles
  where role in ('admin', 'user') and deleted_at is null
  order by case role when 'admin' then 0 else 1 end, created_at
  limit 1;

  if seed_owner_id is null then
    raise exception 'Seed requires at least one active approved profile';
  end if;

  perform set_config('request.jwt.claim.sub', seed_owner_id::text, true);

  insert into projects (name, description, owner_id)
  select 'Sample Project', 'Project contoh untuk eksplorasi arsitektur', seed_owner_id
  where not exists (
    select 1 from projects
    where name = 'Sample Project'
      and description = 'Project contoh untuk eksplorasi arsitektur'
  );
end $$;
