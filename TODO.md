# TODO — Sprint Board Aktif

Titik mulai sesi kerja. Update file ini setiap kali mulai/selesai mengerjakan sesuatu.

> Eksekusi task didelegasikan ke Codex lewat driver loop lokal di
> `scripts/codex-loop/` (tidak di-commit, ada di `.gitignore`). Antrean lengkap
> 96 task hasil breakdown `FEATURE_BACKLOG.md` ada di `scripts/codex-loop/queue.md`.
> File ini tetap jadi papan status tingkat tinggi.

## Siap Dikerjakan (next up)

- [ ] **Jalankan migrasi SQL yang belum dieksekusi di Supabase SQL Editor, berurutan:**
      (bagian dari daftar "Butuh Manusia" di `scripts/codex-loop/queue.md`)
  1. `supabase/schema_test_management_v2.sql` (jika belum)
  2. `supabase/schema_entity_codes.sql` (kolom `code` auto-generate — baru dibuat sesi ini)
- [ ] E02-T05 — Project selector/context global
- [ ] E03-T06 — Filter test case by priority/status di list
- [ ] E06-T14 — Status "rejected" terpisah dari "pending" (jika diperlukan)

## Sedang Dikerjakan

_(kosong)_

## Diblokir

- [ ] **SRC-ROLLOUT — Verifikasi integrasi source-new pada Supabase target**
  Butuh manusia dengan akses Supabase untuk menginventarisasi dan menjalankan
  schema lokal yang belum terpasang (termasuk hasil adaptasi sampai
  `schema_040`) secara berurutan, lalu memverifikasi table/column/function,
  trigger, index, RLS, Realtime, dan Storage. Setelah itu lakukan smoke test
  auth, project, test case/plan/run, issue, suite, notification, profile,
  import/export, AI, dan attachment. Migration tidak dijalankan oleh task
  dokumentasi ini.

## Selesai (recent)

- [x] APPNEW-03 — Pindah landing `/` ke `HomePage` dan daftar project ke `/projects` sesuai FEATURE_BACKLOG.md Section 17.3 (2026-08-02)
- [x] APPNEW-02 — Implementasi public profile sesuai FEATURE_BACKLOG.md Section 17.2 (2026-08-02)
- [x] APPNEW-01 — Implementasi halaman Settings user sesuai FEATURE_BACKLOG.md Section 17.1 (2026-08-02)

- [x] E08-T15 — Attachment Issue lengkap end-to-end: upload/list/hapus private
  Storage, clean layering, RLS, retention, dan cleanup object saat metadata
  terhapus cascade (`schema_042`) (2026-07-31)
- [x] SRC-EPIC — Integrasi source-new selesai secara selektif: SRC-01–SRC-12
  di-port ke kontrak aktif, SRC-13 diaudit dan promosi `App-new.tsx` ditolak,
  SRC-14 mengklasifikasikan seluruh migration tanpa menjalankannya ke target
  (2026-07-31)
- [x] Scaffold project + clean architecture layer + dokumentasi awal (2026-07-21)
- [x] Modul User Management + Google Login + RBAC (pending/user/admin) — kode & RLS lengkap (2026-07-21)
- [x] Dark/light/system theme toggle + primary color teal muted konsisten kedua tema (2026-07-21)
- [x] Test Management v2: Module, Tag, Test Run, Test Result, Issue — reshape besar dari model "last_result" ke riwayat eksekusi penuh (2026-07-21)
- [x] Restrukturisasi monorepo `frontend/` + `backend/` (2026-07-21)
- [x] Audit gap pasca-E08: tab Tags (list/rename/hapus) + halaman Test Runs lintas project + item sidebar (2026-07-22)
- [x] Kode entity auto-generate (MOD/TC/TP/TR-####) untuk Module, Test Case, Test Plan, Test Run — default otomatis, selalu bisa diedit (2026-07-22)
