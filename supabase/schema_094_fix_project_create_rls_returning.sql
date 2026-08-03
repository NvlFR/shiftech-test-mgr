-- Fix: non-admin user (role 'user') tidak bisa membuat project sama sekali.
--
-- projectRepository.create() selalu pakai `.select().single()` (RETURNING).
-- Postgres mengevaluasi SELECT policy terhadap row yang di-INSERT untuk
-- RETURNING, tapi trigger AFTER INSERT `handle_new_project()` yang membuat
-- baris `project_members` (dipakai `has_project_access()`) belum cukup untuk
-- membuat evaluasi itu lolos pada saat RETURNING dihitung — sehingga INSERT
-- sukses tapi RETURNING gagal dengan "new row violates row-level security
-- policy for table projects". Lolos tak terdeteksi sebelumnya karena semua
-- pembuatan project manual selama ini pakai akun admin (is_admin() = true,
-- bypass has_project_access() sepenuhnya).
--
-- Fix: pemilik project (owner_id = auth.uid(), sudah pasti terisi benar di
-- baris yang sama sejak awal INSERT, tidak bergantung timing trigger) selalu
-- boleh melihat project miliknya sendiri.

drop policy if exists "project access - projects select" on projects;

create policy "project access - projects select" on projects for select
  using (
    visibility = 'public'
    or owner_id = auth.uid()
    or (is_approved() and (is_admin() or has_project_access(id) or visibility = 'unlisted'))
  );
