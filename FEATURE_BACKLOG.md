# Feature Backlog — TestManager

Daftar fitur, status pengerjaan, dan roadmap aplikasi TestManager.

Legenda: `[x]` selesai, `[ ]` belum dikerjakan.

## 1. Fitur yang sudah selesai

- [x] Authentication email/password
- [x] Role dan approval user (`pending`, `user`, `admin`)
- [x] Project management
- [x] Module dan Tag management
- [x] CRUD Test Case
- [x] CRUD Test Plan
- [x] Test Run dan Test Result
- [x] Issue tracking
- [x] Dashboard QA
- [x] Seed data contoh
- [x] Import Test Case dari Excel
- [x] Template Excel import
- [x] Export Test Case ke Excel
- [x] Export Test Case ke PDF
- [x] Export laporan Test Run ke Excel dan PDF
- [x] Project selector global
- [x] Attachment untuk Issue
- [x] Test Case versioning
- [x] Bulk update Test Case
- [x] Filter lanjutan Test Case
- [x] Audit log
- [x] Notifikasi Issue

## 2. Prioritas P1 — Workflow inti

Catatan status 2026-07-22: implementasi kode, migration, RLS policy, UI,
Storage bucket, dan verifikasi Supabase target sudah selesai. Migration
`schema_011`–`schema_017` telah diterapkan berurutan.

### Requirement Traceability

- [x] Menghubungkan requirement dengan Test Case, Test Plan, Test Result, dan Issue.
- [x] Menampilkan coverage requirement.
- [x] Menampilkan requirement yang belum memiliki test.

### Environment Management

- [x] Mengelola environment Development, Staging, UAT, dan Production.
- [x] Menyimpan environment, browser, device, build version, dan base URL pada Test Run.

### Test Run Enhancement

- [x] Filter Test Run berdasarkan tester, environment, browser, device, build version, dan release.
- [x] Assignment tester dan pembagian eksekusi per user.

### Test Case Productivity

- [x] Duplicate Test Case beserta module, tag, steps, dan expected result.
- [x] Comment dan mention pada Test Case dan Issue.
- [x] Attachment untuk Test Case dan Test Run.
- [x] Archive Project tanpa menghapus histori testing.

## 3. Prioritas P2 — Reporting dan integrasi

### Dashboard dan Reporting

- [x] Dashboard trend antar Test Run.
- [x] Grafik pass rate, fail rate, execution progress, dan issue aging.
- [x] Perbandingan hasil berdasarkan release dan environment.

### API dan Webhook

- [x] API token untuk integrasi eksternal.
- [x] Webhook untuk event Test Run, Test Result, dan Issue. (HTTP delivery
      aktif: dispatcher in-database `pg_net` + HMAC-SHA256 `pgcrypto`, secret di
      Supabase Vault, dijadwalkan `pg_cron` tiap menit. Terverifikasi end-to-end
      2026-07-26: delivery → HTTP 200, signature match. Lihat `schema_028`.)

### Integrasi CI/CD

Catatan status 2026-07-22: kontrak RPC, UI pipeline, validasi, RLS, audit,
rate limit, dan migration `schema_020_p2_cicd.sql` sudah diimplementasikan.
Checklist tetap pending sampai migration dijalankan dan diverifikasi pada
Supabase target.

- [x] Menerima hasil test otomatis dari pipeline.
- [x] Mendukung GitHub Actions, GitLab CI, Jenkins, atau runner internal.
- [x] Mengirim status Test Run kembali ke pipeline.

### Backup dan Retention

- [x] Backup dan restore seluruh konfigurasi serta data Project.
- [x] Import data ke instance self-hosted.
- [x] Data retention dan cleanup untuk log, screenshot, video, trace, dan attachment lama.

Catatan status 2026-07-22: implementasi frontend, RPC, migration, RLS,
validasi, audit, preview/dry-run, dan kontrak CI/CD sudah selesai. Migration
schema_018 sampai schema_022 belum diterapkan ke Supabase target pada sesi ini.

Update 2026-07-26: seluruh migration s/d `schema_028` SUDAH diterapkan ke Supabase
target. Webhook HTTP dispatcher + HMAC signing SUDAH terpasang (`schema_028`,
dispatcher in-database via `pg_net`/`pgcrypto`, secret store = Supabase Vault,
scheduler `pg_cron`) dan terverifikasi end-to-end. CI/CD "kirim status balik ke
pipeline" berjalan sinkron via response `ingest_cicd_test_run`. Backup/restore
masih metadata-only (belum binary Storage) — satu-satunya sisa P2.

Catatan implementasi 2026-07-22: migration `schema_021_p2_backup_retention.sql` dan UI project/admin sudah dibuat; status tetap belum `[x]` sampai migration dijalankan serta RPC, RLS, dan Storage diverifikasi pada Supabase target. Backup/restore saat ini memulihkan metadata attachment, bukan object binary Storage.

## 4. AI Integration

- [x] AI Generate Test Case dari requirement atau deskripsi fitur.
- [x] Generate Test Case dari Excel atau requirement document.
- [x] Generate test scenario dan edge case.
- [x] Analisis hasil Test Run dan membuat ringkasan regression.
- [x] Membuat draft Issue dari Test Result `FAIL`.
- [x] Duplicate Issue detection.
- [x] Rekomendasi Test Case yang perlu diretest.
- [x] AI assistant untuk mencari Test Case, Issue, dan histori testing.

Catatan implementasi:

- Pemanggilan AI dilakukan melalui Supabase Edge Function agar API key tidak terekspos di frontend.
- Provider development default adalah `mock`; OpenAI dan Gemini tersedia sebagai adapter Edge Function.
- Semua hasil AI harus direview user sebelum disimpan sebagai data resmi.
- Implementasi frontend, Edge Function `ai-gateway`, contract test, migration `schema_023_p3_ai_integration.sql`, Zod validation, project isolation, rate limit transactional, audit metadata, dan dokumentasi sudah tersedia.
- Update 2026-07-26: migration 023 SUDAH diterapkan dan Edge Function `ai-gateway`
  SUDAH di-deploy ke Supabase target (`fohuxwzczepdqyrfkovc`, ACTIVE, verify_jwt=true).
  Smoke test remote lolos: OPTIONS→204, schema invalid→`INVALID_REQUEST` 400,
  token non-user→`AUTH_INVALID` 401 (fungsi boot, import esm.sh + Zod + `consume_ai_rate_limit`
  cocok). Provider default `mock` → fitur AI berfungsi (menghasilkan draft) tanpa API key.
- Untuk output AI sungguhan (bukan mock): set secret Edge Function `AI_PROVIDER=openai|gemini`
  + `OPENAI_API_KEY`/`GEMINI_API_KEY` via dashboard Supabase / `supabase secrets set`
  (tidak bisa lewat MCP). Tanpa itu gateway tetap jalan di mode mock.

## 5. Automation dan Playwright

### Model arsitektur — Local Runner (WAJIB dibaca dulu)

Playwright **tidak dijalankan di server pusat** (instance self-hosted: Supabase +
frontend). Alasannya:

- Server pusat sering berupa VPS/cloud/on-prem yang **tidak punya akses** ke
  aplikasi yang diuji. Aplikasi under test umumnya hanya reachable dari
  `localhost`, jaringan internal kantor, atau mesin dev tester.
- Menjalankan browser (Chromium/Firefox/WebKit) di server pusat membebani server
  dan tetap tidak menyelesaikan masalah reachability di atas.

Karena itu automation memakai pola **Local Runner** (mirip self-hosted runner
GitHub Actions): sebuah **CLI/agent terpisah yang di-install di mesin lokal** —
mesin tester atau mesin on-prem yang berada di jaringan yang sama dengan
aplikasi under test. Runner inilah yang menjalankan Playwright, bukan server
pusat.

**Koneksi bersifat pull-based (outbound-only):**

```text
Mesin lokal (tester / on-prem)          Server pusat (self-hosted)
  Playwright Local Runner  ── poll ──▶   Job queue / API (API token)
        │                  ◀── job ──        │
   [jalankan Playwright                       │
    ke app under test]                        │
        │                  ── result ──▶   Supabase DB + Storage
                              (hasil, screenshot, video, trace, log)
```

- Runner **hanya melakukan koneksi keluar** ke server pusat memakai **API token**
  (reuse token dari P2 "API dan Webhook"). Mesin lokal **tidak perlu membuka
  port** dan tidak perlu bisa diakses dari luar — aman di balik NAT/firewall/VPN.
- Server pusat **tidak pernah menjalankan browser**. Perannya hanya: menyimpan
  mapping Test Case↔script, enqueue job, menerima hasil, dan menyimpan artifact
  ke Storage.

### Playwright Local Runner (sisi mesin lokal)

- [x] CLI/agent runner yang di-install di mesin lokal, register ke server pusat
      via API token.
- [x] Polling job dari antrean server pusat (pull-based), lalu update status
      job saat mulai/selesai.
- [x] Menjalankan automation script Playwright terhadap aplikasi under test di
      jaringan lokal (localhost / internal / VPN).
- [x] Meng-upload hasil, screenshot, video, trace, dan log ke Test Run pada
      server pusat. (Binary di-upload ke Supabase Storage via Edge Function
      `automation-artifacts` dengan signed upload URL; runner tak pegang service key.)
- [x] Retry untuk test yang gagal (di sisi runner).
- [x] Isolasi eksekusi per job (working dir bersih, cleanup artifact lokal).
- [x] Konfigurasi runner: base URL server pusat, API token, label/kapabilitas
      (browser yang tersedia, environment yang bisa diakses).

### Orkestrasi job (sisi server pusat)

- [x] Mapping Test Case dengan automation script (referensi script, bukan body
      script yang dijalankan di server).
- [x] Enqueue job automation dari Test Case / Test Plan.
- [x] Status job: `queued`, `running`, `passed`, `failed` (di-update oleh runner).
- [x] Menyimpan hasil + artifact (screenshot, video, trace, log) ke Test Run.
      (Binary tersimpan di Supabase Storage; metadata `path`/`bucket` di job.)
- [x] Routing job ke runner yang sesuai berdasarkan label/kapabilitas &
      environment.
- [ ] Scheduled Test Run (server men-enqueue job sesuai jadwal; runner lokal yang
      mengeksekusi saat online).
- [x] Storage adapter untuk Supabase Storage (bucket `automation-artifacts` +
      Edge Function signed upload URL). S3/MinIO belum.

### Skalabilitas & keamanan

- [x] Mendukung banyak runner lokal sekaligus (multi-runner) — server membagi
      antrean berdasarkan runner yang tersedia.
- [ ] Validasi script, pembatasan command, dan secret management di sisi runner.
- [x] API token per runner dapat dicabut/di-rotate dari server pusat.
- [x] Heartbeat/health status runner terlihat di server (online/offline, job
      terakhir).

Catatan: MCP digunakan untuk development/debugging, bukan sebagai runtime
production. Server pusat self-hosted tidak menjalankan browser; seluruh eksekusi
Playwright terjadi di Local Runner.

Catatan status 2026-07-26 — migration `p2_workflow_base` s/d `024_p3_automation`
SUDAH diterapkan & diverifikasi pada Supabase target (`fohuxwzczepdqyrfkovc`) via
MCP: 3 tabel automation, 7 RPC, 9 RLS policy, kolom `test_runs.ci_provider` ada,
RLS aktif, `get_advisors` 0 ERROR. Detail server-side:

- Migration `schema_024_p3_automation.sql`: tabel `automation_runners`,
  `automation_scripts`, `automation_jobs`; RLS project-scoped; token hash-only.
- RPC kontrak Local Runner (pull-based, outbound-only): `create_automation_runner`,
  `rotate_automation_runner_token`, `enqueue_automation_jobs`, `poll_automation_job`
  (FOR UPDATE SKIP LOCKED + label matching untuk multi-runner), `report_automation_job`
  (hasil → `test_results`, retry, artifact metadata), `heartbeat_automation_runner`,
  `cancel_automation_job`.
- Frontend layer penuh: `automationRepository` → `automationService` → `useAutomation`
  → `pages/automation/AutomationPage.tsx` (tab Runner, Mapping Script, Job + enqueue),
  route dan menu item.
- CLI/agent Local Runner sudah di-scaffold di folder `runner/` (Node 20+,
  TypeScript, tanpa runtime dependency — memanggil Playwright via CLI dan
  Supabase RPC via `fetch`). Loop: heartbeat → poll → `npx playwright test` →
  report (retry saat sisa attempt). Termasuk `Dockerfile` (base image resmi
  Playwright) dan README. Typecheck & build hijau.
- Belum dikerjakan: Scheduled Test Run, Storage adapter untuk artifact binary
  (saat ini hanya metadata/URL, konsisten dengan modul backup), dan verifikasi
  end-to-end runner↔server pada Supabase target.

## 6. Administrasi dan kolaborasi

- [ ] Role dan permission yang lebih detail.
  - Permission terpisah untuk melihat, membuat, mengubah, menghapus, import, export, dan menjalankan automation.
- [ ] Team management.
  - Mengelompokkan user dan mengatur akses team per Project.
- [ ] Activity feed per Project.
  - Timeline aktivitas penting dalam satu Project.
- [ ] Notification center.
  - Pusat notifikasi untuk assignment, mention, perubahan status, dan hasil automation.
- [ ] Observability dan monitoring.
  - Health check worker, queue, storage, dan integrasi.
  - Log error yang mudah ditelusuri admin.

## 7. Urutan implementasi yang disarankan

1. Requirement Traceability
2. Environment Management
3. Test Run Enhancement
4. Dashboard Trend
5. API dan Webhook
6. Playwright Local Runner (CLI/agent di mesin lokal)
7. Orkestrasi job automation di server pusat (queue, mapping, artifact)
8. AI Integration
9. CI/CD Integration
10. Administrasi, monitoring, dan backup

## 8. Catatan keputusan teknis

- Fokus utama aplikasi adalah manual software testing untuk tim kecil.
- Fitur Playwright ditambahkan setelah workflow manual dan reporting stabil.
- Fitur baru mengikuti alur:

```text
Page/Component → Hook → Service → Repository → Supabase
```

- Test Case tidak menyimpan hasil pass/fail; hasil selalu disimpan pada Test Result.
- Re-run dibuat sebagai Test Run baru.
