# TODO — Sprint Board Aktif

Titik mulai sesi kerja. Update file ini setiap kali mulai/selesai mengerjakan sesuatu.

## Siap Dikerjakan (next up)

- [ ] **Jalankan migrasi SQL yang belum dieksekusi di Supabase SQL Editor, berurutan:**
  1. `supabase/schema_test_management_v2.sql` (jika belum)
  2. `supabase/schema_entity_codes.sql` (kolom `code` auto-generate — baru dibuat sesi ini)
- [ ] E02-T05 — Project selector/context global
- [ ] E03-T06 — Filter test case by priority/status di list
- [ ] E06-T14 — Status "rejected" terpisah dari "pending" (jika diperlukan)
- [ ] E08-T15 — Attachment Issue (jika diperlukan)

## Sedang Dikerjakan

_(kosong)_

## Diblokir

_(kosong)_

## Selesai (recent)

- [x] Scaffold project + clean architecture layer + dokumentasi awal (2026-07-21)
- [x] Modul User Management + Google Login + RBAC (pending/user/admin) — kode & RLS lengkap (2026-07-21)
- [x] Dark/light/system theme toggle + primary color teal muted konsisten kedua tema (2026-07-21)
- [x] Test Management v2: Module, Tag, Test Run, Test Result, Issue — reshape besar dari model "last_result" ke riwayat eksekusi penuh (2026-07-21)
- [x] Restrukturisasi monorepo `frontend/` + `backend/` (2026-07-21)
- [x] Audit gap pasca-E08: tab Tags (list/rename/hapus) + halaman Test Runs lintas project + item sidebar (2026-07-22)
- [x] Kode entity auto-generate (MOD/TC/TP/TR-####) untuk Module, Test Case, Test Plan, Test Run — default otomatis, selalu bisa diedit (2026-07-22)
