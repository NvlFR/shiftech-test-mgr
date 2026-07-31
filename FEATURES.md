# FEATURES — Status Checklist

Ringkasan cepat status fitur per modul. Detail task-level ada di [`docs/TASKS.md`](docs/TASKS.md).

## Integrasi source-new (hasil akhir)

- [x] Port selektif SRC-01–SRC-12 selesai: dialog, Issue editor, layout
  responsif, notification center, profile lokal, shared UI/helper/hook,
  halaman utama, repository, service, dan domain telah diadaptasi ke kontrak
  aktif tanpa menghapus fitur lokal.
- [x] Audit 59 migration SRC-14 selesai. Bagian yang kompatibel diadaptasi ke
  rangkaian schema lokal sampai `schema_040`; migration tidak dijalankan ke
  Supabase target dalam pekerjaan integrasi ini.
- [x] `App-new.tsx` diaudit dan **ditolak untuk menggantikan** `App.tsx` aktif:
  route, auth/RBAC, pending approval, halaman lokal, dan kontrak profile belum
  parity. Route aktif dan model `profiles` lokal tetap menjadi keputusan akhir.
- [x] Kontrak source-new yang bertentangan ditolak: auto-approval/drop approval
  gate, pemisahan `public.users` dan `profiles`, username/public profile,
  entity attachment polymorphic, serta perubahan yang melanggar invariant Test
  Run/Test Result lokal.
- [ ] Rollout tersisa: jalankan/verifikasi schema lokal yang belum terpasang di
  Supabase target, lalu smoke test route dan workflow utama pada environment
  yang sudah dimigrasikan.

## Projects
- [x] List project (DataTable) — search, filter status, sortable
- [x] Create & Edit project (Dialog form)
- [x] Status lifecycle: Aktif / Nonaktif / Arsip (menu aksi per baris)
- [x] Hapus Permanen (dengan konfirmasi, cascade ke module/test plan/test case/test run/test result/issue)
- [x] Halaman detail project (`/projects/:id`) — info + tab Test Plans / Test Cases / Modules / Tags
- [ ] Project selector global (dipakai lintas halaman)

## Kode Entity (Module, Test Case, Test Plan, Test Run)
- [x] Auto-generate `MOD-####`/`TC-####`/`TP-####`/`TR-####` per project (trigger DB, race-safe)
- [x] Selalu bisa diedit manual dari field "Kode" di form masing-masing
- [x] Ditampilkan sebagai kolom di semua tabel terkait + judul halaman detail

## Modules & Tags
- [x] CRUD Module per project (tab "Modules" di Project Detail)
- [x] Tag creatable (dropdown Chips di form Test Case, otomatis buat tag baru per project)
- [x] Tab "Tags" di Project Detail — list, rename, hapus tag yang sudah ada

## Test Cases
- [x] CRUD lengkap per project (tab "Test Cases" di Project Detail): Module, Objective, Preconditions, Steps, Expected Result, Priority, Tags, Notes
- [x] Status `active`/`archived` (arsipkan alih-alih hapus untuk retensi riwayat)
- [x] List lintas project (`TestCasesPage`, read-only, pilih project via dropdown)
- [x] Delete + konfirmasi
- [ ] Filter by priority/status di list

## Test Plans
- [x] CRUD test plan per project (tab "Test Plans" di Project Detail)
- [x] Tab Test Cases: kelola cakupan (tambah/keluarkan test case dari plan — TANPA hasil, hanya cakupan)
- [x] Tab Test Runs: mulai run baru, lihat riwayat semua run

## Test Runs & Test Results
- [x] Halaman Test Runs lintas project (`/test-runs`, sidebar) — semua run dari semua plan dalam satu project
- [x] Mulai Test Run baru (snapshot cakupan test case plan saat itu)
- [x] Catat hasil per test case: status (pass/fail/skip/blocked), tester (dropdown user terdaftar), catatan
- [x] Ringkasan progress otomatis (pass/fail/skip/blocked/belum dites, persentase)
- [x] Selesaikan Run (manual) / Buka Kembali

## Issues
- [x] Buat issue dari Test Result FAIL (title, description, actual/expected result)
- [x] List issue per Test Run, ubah status & assignee inline
- [ ] Attachment/screenshot (skip untuk v1)

## User Management & Auth (RBAC)
- [x] Login via Google OAuth (Supabase Auth)
- [x] Auto-provisioning profile (role default `pending`) saat signup
- [x] RLS berbasis role (`pending`/`user`/`admin`) di semua tabel
- [x] Halaman Login & Pending Approval
- [x] Route guard (`ProtectedRoute`, `AdminRoute`)
- [x] Halaman User Management: approve, promote/demote admin↔user, cabut akses, hapus (soft-delete), lihat detail
- [x] Halaman detail user (`/users/:id`)
- [x] Layout: avatar, nama user, logout, menu khusus admin, dark mode toggle
- [x] Konfigurasi Google OAuth di Supabase Dashboard — selesai
- [x] Set admin pertama — selesai

## Infrastruktur
- [x] Supabase schema domain + RLS berbasis role (4 file migrasi berurutan)
- [x] Clean architecture layers (Repository/Service/Hook/Component)
- [x] PrimeReact + PrimeFlex setup, dark/light/system theme toggle
- [x] Restrukturisasi monorepo (`frontend/` + `backend/` disiapkan untuk migrasi PHP+SQLite)
- [ ] Test suite (Vitest)
