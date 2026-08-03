-- Lanjutan schema_094/095: setelah project bisa dibuat, pemilik project baru
-- ternyata cuma dapat permission view-only pada project miliknya sendiri.
-- `handle_new_project()` insert ke project_members dengan role='manager'
-- tapi tidak mengisi kolom `permissions` eksplisit, jadi jatuh ke column
-- default (view-only) — bukan DEFAULT_PROJECT_PERMISSIONS.manager di
-- frontend (`projectMemberService.ts`) yang seharusnya full akses. Lolos tak
-- terdeteksi karena testing manual selama ini selalu pakai akun admin
-- (isAdmin bypass semua pengecekan permission di useProjectRole).

create or replace function handle_new_project()
returns trigger as $$
begin
  insert into public.project_members (project_id, user_id, role, status, accepted_at, permissions)
  values (
    new.id, new.owner_id, 'manager', 'accepted', now(),
    '{"view": true, "create": true, "update": true, "delete": true, "import": true, "export": true, "run_automation": true}'::jsonb
  )
  on conflict (project_id, user_id) do update
    set role = 'manager', status = 'accepted', accepted_at = coalesce(project_members.accepted_at, now()),
        permissions = excluded.permissions;
  return new;
end;
$$ language plpgsql security definer set search_path = public;
