-- Lanjutan schema_094: policy select sudah benar (owner_id = auth.uid()),
-- tapi owner_id di-set lewat trigger AFTER INSERT (handle_new_project) —
-- dan RETURNING pada INSERT dievaluasi dari tuple SEBELUM trigger AFTER
-- berjalan, jadi owner_id masih NULL saat RLS SELECT untuk RETURNING
-- dicek. Fix sebenarnya: set owner_id di trigger BEFORE INSERT supaya
-- sudah ada di tuple sebelum RETURNING dievaluasi. project_members tetap
-- dibuat di AFTER INSERT (tidak perlu terlihat saat RETURNING, cukup untuk
-- select berikutnya).

create or replace function set_project_owner()
returns trigger as $$
begin
  new.owner_id := coalesce(new.owner_id, auth.uid());
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger trg_set_project_owner before insert on projects
  for each row execute function set_project_owner();

create or replace function handle_new_project()
returns trigger as $$
begin
  insert into public.project_members (project_id, user_id, role, status, accepted_at)
  values (new.id, new.owner_id, 'manager', 'accepted', now())
  on conflict (project_id, user_id) do update
    set role = 'manager', status = 'accepted', accepted_at = coalesce(project_members.accepted_at, now());
  return new;
end;
$$ language plpgsql security definer set search_path = public;
