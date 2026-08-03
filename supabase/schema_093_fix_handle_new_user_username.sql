-- Fix: handle_new_user() never set profiles.username, but schema_092 made
-- profiles.username NOT NULL. Every signup since schema_092 (Google OAuth or
-- otherwise) fails with a not-null violation on the trigger insert. Generate
-- a fallback username the same way schema_092's backfill did, so the row
-- always satisfies the constraint; the user can still set a chosen username
-- later since only immutable-after-set is enforced, not immutable-on-insert.

create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url, username)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url',
    concat('user_', replace(substring(new.id::text from 1 for 8), '-', ''))
  );
  return new;
end;
$$ language plpgsql security definer set search_path = public;
