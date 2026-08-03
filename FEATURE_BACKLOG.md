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
pipeline" berjalan sinkron via response `ingest_cicd_test_run`.

Update 2026-08-01 (ADM-08): backup format versi 2 menyertakan object binary dari
bucket attachment dan restore memulihkannya setelah metadata. Backup versi 1
metadata-only tetap dapat dipulihkan untuk kompatibilitas.

Catatan implementasi 2026-07-22: migration `schema_021_p2_backup_retention.sql` dan UI project/admin sudah dibuat; migration, RPC, RLS, dan Storage kemudian diverifikasi pada Supabase target. Binary Storage dilengkapi oleh ADM-08 tanpa migration baru.

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
- [x] Scheduled Test Run (server men-enqueue job sesuai jadwal; runner lokal yang
      mengeksekusi saat online).
- [x] Storage adapter untuk Supabase Storage (bucket `automation-artifacts` +
      Edge Function signed upload URL). S3/MinIO belum.

### Skalabilitas & keamanan

- [x] Mendukung banyak runner lokal sekaligus (multi-runner) — server membagi
      antrean berdasarkan runner yang tersedia.
- [x] Validasi script, pembatasan command, dan secret management di sisi runner.
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

- [x] Role dan permission yang lebih detail. (Bukti:
      `supabase/schema_080_adm03_granular_permissions.sql`,
      `frontend/src/pages/projects/ProjectSettingsPage.tsx`.)
  - Permission terpisah untuk melihat, membuat, mengubah, menghapus, import, export, dan menjalankan automation.
- [x] Team management.
  - Mengelompokkan user dan mengatur akses team per Project.
- [x] Activity feed per Project.
  - Timeline aktivitas penting dalam satu Project.
- [x] Notification center.
  - Pusat notifikasi untuk assignment, mention, perubahan status, dan hasil automation.
- [x] Observability dan monitoring.
  - Health check worker, queue, storage, dan integrasi.
  - Log error yang mudah ditelusuri admin.

## 7. Integrasi penuh source-new ke aplikasi aktif

Task ini menyelesaikan proses porting seluruh aset pada `source-new` ke aplikasi
aktif tanpa menghapus fitur lokal. Folder `source-new` diperlakukan sebagai
referensi implementasi dan tidak boleh diaktifkan mentah apabila kontrak auth,
React Query, routing, domain, atau Supabase-nya berbeda.

### Tujuan

- Menyamakan UX dan struktur fitur dengan source-new secara bertahap.
- Memindahkan kontrak yang valid ke layer aktif: domain → mapper → repository →
  service → hook → page/component.
- Menghapus exclusion TypeScript hanya setelah modul benar-benar kompatibel.
- Menjaga seluruh fitur lokal tetap berjalan, termasuk AI, import/export,
  attachment, comments, activity, custom run, dan RBAC.

### Checklist per folder

- [x] **SRC-01 — `components/dialogs`**
  Aktifkan seluruh dialog yang relevan dari source-new. Pastikan dialog Test
  Plan, Test Suite, Custom Test Run, Issue, import, dan attachment memakai
  service lokal, validasi error, loading state, dan callback yang konsisten.

- [x] **SRC-02 — `components/issues`**
  Integrasikan IssueEditor, issue metadata, linked test result, target role,
  external links, comments, attachment, dan status transition tanpa merusak
  flow Issue lokal.

- [x] **SRC-03 — `components/layout-new`**
  Bandingkan layout-new dengan layout aktif. Port sidebar, topbar, breadcrumb,
  responsive behavior, theme, project context, dan menu secara bertahap.
  `AppLayout` aktif hanya boleh diganti setelah seluruh route utama lulus.

- [x] **SRC-04 — `components/notifications`**
  Selesaikan NotificationPanel, unread count, mark-as-read, clear/remove,
  realtime refresh, dan navigasi notification menggunakan notification service
  lokal serta RLS yang sesuai.

- [x] **SRC-05 — `components/profile`**
  Aktifkan halaman/profile view penuh dengan field lokal `fullName`, `email`,
  `avatarUrl`, role, approval status, dan route `/users/:id`. Jangan
  mengaktifkan kontrak `username`/`bio` source-new tanpa migration pendukung.

- [x] **SRC-06 — `components/ui-new`**
  Audit dan port komponen shared seperti search, filter, markdown, mention,
  activity, owner label, hover card, attachment, pagination, dan bulk action.
  Setiap komponen harus punya kontrak props yang kompatibel dengan pemakai aktif.

- [x] **SRC-07 — `helpers/helpers-new`**
  Port helper yang belum tersedia di active, terutama mapper utility, date,
  error/toast, validation, export/import, dan URL helper. Mapping snake_case ↔
  camelCase tetap terpusat di `helpers/mappers.ts`.

- [x] **SRC-08 — `hooks/hooks-new`**
  Sinkronkan auth, project context, screen size, breadcrumb, query keys,
  realtime, notifications, activity, dan feature-specific hooks. Jangan
  mengganti hook aktif sebelum lifecycle dan permission behavior terverifikasi.

- [x] **SRC-09 — `pages/pages-new`** (Bukti: halaman hasil port aktif di
      `frontend/src/pages/` dan audit batch SRC-09a/b/c di `WORKLOG.md`.)
  Port page dan tab utama: Projects, Project Detail, Test Cases, Test Plans,
  Test Runs, Issues, Test Suites, Dashboard, Requirements, Integrations,
  Automation, User/Profile, serta execution detail. Pertahankan route dan
  fitur lokal; jangan mengganti `App.tsx` dengan `App-new.tsx` sekaligus.

- [x] **SRC-10 — `repositories/repositories-new`**
  Sinkronkan query repository untuk project, test case, test plan, test run,
  result, issue, suite, activity, notification, profile, attachment, dan
  integration. Repository hanya boleh berisi query Supabase dan mapper.

- [x] **SRC-11 — `services/services-new`**
  Sinkronkan validasi dan business rule service. Pastikan invariant tetap
  berlaku: run baru untuk re-run, status completed manual, summary dihitung
  on-the-fly, dan Issue hanya dibuat dari Test Result FAIL.

- [x] **SRC-12 — `types/domain-new`** (Bukti: sumber domain tunggal
      `frontend/src/types/domain.ts` dan rekonsiliasi SRC-12 di `WORKLOG.md`.)
  Bandingkan seluruh type dengan `types/domain.ts`, gabungkan field yang valid,
  hapus duplikasi, dan pastikan mapper/repository/service memakai satu sumber
  domain aktif.

- [x] **SRC-13 — `App-new.tsx`** (Bukti: audit route/guard dan keputusan tidak
      mempromosikan kandidat dicatat di `WORKLOG.md`; route aktif tetap di
      `frontend/src/App.tsx`.)
  Audit route, guard, layout, lazy loading, fallback, dan redirect. App-new
  baru boleh dijadikan `App.tsx` setelah route parity, RBAC, auth, dan smoke
  test seluruh halaman lulus.

- [x] **SRC-14 — `supabase-new`**
  Audit seluruh migration, pilih migration yang kompatibel, adaptasikan ke
  `supabase/schema_*.sql` bernomor urut, jalankan di Supabase SQL Editor, lalu
  verifikasi table, column, function, trigger, index, RLS, realtime, dan
  Storage. Jangan menyalin migration users/profiles atau entity attachment
  apabila bertentangan dengan schema lokal.

### Definition of Done

- [x] Tidak ada folder source-new yang masih dikecualikan TypeScript tanpa
      alasan tertulis di `WORKLOG.md`. (Bukti: exclusion di
      `frontend/tsconfig.app.json` direkonsiliasi pada entri SRC-DOD
      `WORKLOG.md`.)
- [x] Seluruh route aktif dapat dibuka tanpa error console utama. (Bukti:
      smoke Playwright terautentikasi 33 route pada `2026-08-02`, lihat
      `WORKLOG.md`. Ditemukan dan diperbaiki dua defect nyata: hook `useEffect`
      dipanggil lewat `import('react').then()` di `SettingsPage.tsx`, dan
      embed Supabase ambigu `profiles(*)` pada `issueRepository.ts`,
      `projectMemberRepository.ts`, `commentRepository.ts` setelah
      `issues.created_by`/`project_members` punya >1 FK ke `profiles`.)
- [x] `npx tsc -b --force`, `npm run build`, `npm run lint`, dan
      `git diff --check` lulus. (Bukti: dijalankan ulang pada audit AUDIT-01;
      hasilnya dicatat di `WORKLOG.md`.)
- [x] Smoke test auth, project, test case, test plan, test run, issue, suite,
  notification, profile, import/export, AI, dan attachment lulus. (Bukti:
  33 route diuji dengan sesi terautentikasi sungguhan lewat Playwright,
  `2026-08-02`, lihat `WORKLOG.md`. Alur Google OAuth interaktif itu sendiri
  tetap manual sesuai `docs/MANUAL_SMOKE.md`.)
- [x] Migration Supabase sudah dijalankan dan diverifikasi pada target. (Bukti:
      `schema_034_source_new_compatibility.sql` — migration yang relevan untuk
      integrasi source-new — sudah diverifikasi ada di target lewat MCP
      Supabase pada `2026-08-02`, kolom dan constraint dikonfirmasi via query.
      33 migration lain di luar scope Section 7 [`schema_060_pw02` s/d
      `schema_092`] turut diterapkan pada sesi yang sama; lihat `WORKLOG.md`.)
- [x] Tidak ada fitur existing yang terhapus atau kehilangan akses RBAC. (Bukti:
      `npx tsc -b --force` 0 error, `npm run lint` hanya 8 warning pre-existing,
      vitest 172/178 lulus — 6 kegagalan tersisa terbatas pada
      `mappers.test.ts` soal field `username` baru [APPNEW-02, belum
      di-commit], tidak menyentuh RBAC/invariant. Smoke Playwright terautentikasi
      mengonfirmasi seluruh route admin/RBAC-gated dapat diakses.)
- [x] `WORKLOG.md`, `FEATURES.md`, dan `TODO.md` sudah diperbarui. (Bukti:
      ringkasan hasil akhir dan rollout source-new pada ketiga berkas tersebut.)

## 8. MCP Server TestManager (multi-tool)

**Tujuan.** Membuka seluruh workflow TestManager sebagai *tools* yang bisa dipanggil
AI agent (Claude Code, Cursor, Claude Desktop, agent internal) lewat protokol MCP.
Tanpa ini, AI hanya bisa dipakai dari dalam UI (`ai-gateway`, Section 4); dengan ini
AI bisa menjalankan seluruh siklus Requirement → Test Case → Test Run → Issue →
Regression dari luar aplikasi.

**Posisi arsitektur.** MCP server adalah **proses terpisah** (folder `mcp/`, Node 20+
TypeScript, `@modelcontextprotocol/sdk`, transport stdio untuk lokal + HTTP/SSE untuk
remote). Ia **bukan** layer baru di frontend — ia memanggil Supabase RPC/PostgREST
memakai **API token yang sudah ada** (P2 "API dan Webhook") atau JWT user, sehingga
RLS project-scoped tetap jadi batas keamanan sesungguhnya. Aturan `Page → Hook →
Service → Repository → Supabase` tidak berubah; MCP server duduk sejajar dengan
frontend sebagai *client* dari Supabase.

```text
AI Agent (Claude/Cursor)  ──MCP──▶  TestManager MCP Server  ──RPC/REST──▶  Supabase (RLS)
                                            │
                                            └──▶ enqueue job ──▶ Playwright Local Runner
```

### 8.1 Fondasi MCP server

- [x] Scaffold `mcp/` — Node 20+, TypeScript, MCP SDK, transport **stdio** (dev lokal).
      (Bukti: `mcp/package.json`, `mcp/tsconfig.json`, `mcp/src/index.ts`.)
- [x] Transport **HTTP/SSE** untuk pemakaian remote/self-hosted.
- [x] Autentikasi: API token TestManager (reuse tabel token P2) atau Supabase JWT.
      Token disimpan di env (`TM_API_TOKEN`), tidak pernah di argumen tool.
      (Bukti: `mcp/src/config.ts`, `mcp/src/repositories/authRepository.ts`,
      `mcp/src/services/authService.ts`.)
- [x] **Project scoping wajib**: satu sesi MCP terikat pada satu `project_id`;
      semua tool menolak akses lintas project (dijaga RLS, divalidasi ulang di server).
      (Bukti: `mcp/src/services/authService.ts` dan
      `mcp/src/services/authService.test.ts`.)
- [x] Rate limit + audit: setiap pemanggilan tool tercatat di `ai_audit_events`
      (tool name, latency, status — bukan payload mentah).
- [x] Mode **read-only** (flag `TM_MCP_READONLY=1`) supaya agent bisa dipakai untuk
      analisis tanpa risiko menulis data.
      (Bukti: `mcp/src/config.ts` dan `mcp/src/tools/registry.ts`.)
- [x] Dokumentasi setup di `docs/MCP_SERVER.md` + contoh konfigurasi client
      (`claude_desktop_config.json`, `.mcp.json`).
      (Bukti: `docs/MCP_SERVER.md`.)

### 8.2 Katalog tools

Dikelompokkan per domain, penamaan `testmanager.<domain>.<action>`.

**Discovery / read**

- [x] `project.list`, `project.get` — daftar & detail project yang bisa diakses token.
- [x] `requirement.list`, `requirement.get`, `requirement.coverage` — termasuk
      requirement yang belum punya test (reuse Section 2 Traceability).
- [x] `testcase.search` — filter module, tag, priority, status, free-text.
- [x] `testcase.get` — detail lengkap + steps + expected result + versi.
- [x] `testplan.list`, `testplan.get` — beserta isi test case-nya.
- [x] `testrun.list`, `testrun.get` — summary dihitung on-the-fly (tidak ada kolom hasil).
- [x] `testresult.list` — filter status PASS/FAIL/SKIP/BLOCKED, tester, run.
- [x] `issue.search`, `issue.get` — filter status, priority, assignee, relasi ke run/case.
- [x] `artifact.get_url` — signed URL screenshot/video/trace/log dari Storage.

**Write / workflow**

- [x] `testcase.create_bulk` — import banyak test case sekaligus (dipakai alur CSV, §11).
      (Bukti: `mcp/src/tools/writeTools.ts` dan
      `supabase/schema_051_mcp_write_test_cases_plans.sql`.)
- [x] `testcase.update`, `testcase.duplicate`, `testcase.archive`. (Bukti:
      `mcp/src/tools/writeTools.ts`, `mcp/src/services/writeService.ts`, dan
      `supabase/schema_051_mcp_write_test_cases_plans.sql`.)
- [x] `testplan.create`, `testplan.add_cases`, `testplan.remove_cases`. (Bukti:
      `mcp/src/tools/writeTools.ts`, `mcp/src/repositories/writeRepository.ts`,
      dan `supabase/schema_051_mcp_write_test_cases_plans.sql`.)
- [x] `testplan.approve` tidak diekspos ke agent — **gate manusia** wajib dilakukan
      dari sesi user di UI; API token/MCP tidak memiliki jalur approval.
- [x] `testrun.create` — selalu run baru, tidak pernah menimpa run lama.
- [x] `testrun.record_result` — tulis satu `test_result`.
- [x] `testrun.complete` — set `completed` (tetap aksi eksplisit).
- [x] `issue.create` — wajib menyertakan `test_result_id` (relasi ke Test Run + Test Case).
- [x] `issue.comment`, `issue.update_status`.
- [x] `issue.detect_duplicate` — bungkus AI action yang sudah ada (Section 4).

**Automation**

- [x] `automation.map_script` — petakan Test Case ↔ `script_ref`.
- [x] `automation.enqueue` — enqueue job dari Test Case / Test Plan, dengan label runner.
- [x] `automation.job_status` — poll status job (`queued`/`running`/`passed`/`failed`).
- [x] `automation.runner_list` — runner online/offline + kapabilitas.
- [x] `automation.rerun_failed` — enqueue ulang **hanya** test yang relevan (regression, §11).

**Repo / konteks kode** (butuh Section 10)

- [x] `repo.list_files`, `repo.read_file`, `repo.search` — baca source aplikasi under
      test untuk membantu generate test case yang akurat.
- [x] `repo.diff` — perubahan sejak commit/tag tertentu, dipakai memilih test regression.

**Analisis**

- [x] `analysis.run_summary` — ringkasan regression satu run.
- [x] `analysis.flaky_candidates` — test yang hasilnya tidak stabil antar run.
- [x] `analysis.suggest_retest` — rekomendasi test case yang perlu diretest.

### 8.3 Guardrail

- [x] Tool **destruktif** (hapus project, hapus test case, hapus run) tidak diekspos
      sama sekali di MCP — hanya lewat UI.
      (Bukti: katalog registrar di `mcp/src/tools/`; archive tersedia tanpa tool delete.)
- [x] Semua output AI tetap berstatus `draft`/`review_only`; approval selalu manusia.
      (Bukti: `mcp/src/services/writeService.ts` dan
      `mcp/src/services/writeService.test.ts`.)
- [x] Pagination + batas ukuran response supaya tidak meledakkan context agent.
      (Bukti: `mcp/src/helpers/response.ts` dan `mcp/src/services/readService.ts`.)
- [x] Error terstruktur (`code`, `message`, `hint`) agar agent bisa recover sendiri.
      (Bukti: `McpToolError`/`errorResponse` di `mcp/src/helpers/response.ts`.)

---

## 9. Playwright lokal yang lebih interaktif

Runner saat ini (Section 5) sudah jalan tapi **headless dan buta**: `npx playwright
test` → exit code → report. Tester tidak bisa melihat, mengarahkan, atau merekam
langkah secara langsung. Tujuan section ini adalah membuat pengalaman lokal jadi
interaktif — untuk *authoring* test dan untuk *debugging* kegagalan.

Prinsip arsitektur tidak berubah: **server pusat tetap tidak menjalankan browser**.
Semua mode interaktif berjalan di mesin lokal, dikendalikan dari CLI runner atau dari
MCP tool yang menargetkan runner lokal.

### 9.1 Mode eksekusi interaktif (sisi runner)

- [x] `--headed` — jalankan dengan browser terlihat, opsional `--slow-mo` untuk demo.
- [x] Mode **UI Mode** (`playwright test --ui`) untuk eksplorasi & re-run per test.
- [x] Mode **debug** (`PWDEBUG=1` / `--debug`) dengan Playwright Inspector, breakpoint
      per step.
- [x] `--watch` — re-run otomatis saat file test berubah (loop authoring cepat).
- [x] Pilih browser & device profile saat run (`chromium|firefox|webkit`, emulasi mobile).
- [x] Jalankan **satu test case saja** dari UI TestManager ("Run locally") tanpa
      harus lewat antrean job penuh.

### 9.2 Authoring & codegen

- [x] `runner codegen <url>` — buka Playwright codegen, hasil script langsung
      di-attach sebagai `script_ref` ke Test Case yang dipilih.
- [x] **Record-from-test-case**: ambil `steps` manual sebuah Test Case, tampilkan
      sebagai checklist saat codegen, lalu simpan script hasil rekaman.
- [x] Sinkronisasi dua arah: script baru di repo terdeteksi → tawarkan mapping ke
      Test Case yang belum ter-automate.
- [x] Scaffold project Playwright baru (`runner init`) kalau tester belum punya.

### 9.3 Observability saat gagal (paket bukti lengkap)

Setiap kegagalan **wajib** menghasilkan bundle berikut, di-upload ke Storage dan
tertaut ke `test_result`:

- [x] **Screenshot** pada titik gagal (+ screenshot per step opsional).
- [x] **Video** eksekusi (`video: retain-on-failure`).
- [x] **Trace** Playwright (`trace: retain-on-failure`) — timeline + network + DOM.
- [x] **Console log** browser (semua level, dengan timestamp).
- [x] **Network log** (HAR): request/response, status code, timing.
- [x] **DOM snapshot** pada titik gagal (HTML + computed style penting).
- [x] Metadata lingkungan: browser + versi, OS, viewport, base URL, build version,
      commit SHA (dari Section 10).

### 9.4 Viewer di aplikasi

- [x] Halaman detail Test Result menampilkan tab bukti: Screenshot / Video / Console /
      Network / DOM, bukan sekadar daftar link.
- [x] Embed **trace viewer** (`trace.playwright.dev` self-hosted atau link ke trace file).
- [x] Diff screenshot antar run (before/after) untuk regresi visual.
- [x] Live log streaming saat job `running` (runner mengirim log chunk berkala).

### 9.5 Interaktivitas terarah

- [x] **Pause & inspect**: job bisa di-set `pauseOnFailure` — browser tetap terbuka di
      mesin lokal supaya tester bisa memeriksa state saat itu juga.
- [x] **Step-through** dari UI: kirim perintah next/continue ke runner lokal (channel
      lokal, tetap outbound-only ke server).
- [x] Retry manual satu test dari halaman Test Result tanpa membuat run baru.
- [x] Sanity check sebelum run: cek base URL reachable dari mesin runner, laporkan
      jelas kalau tidak (bukan gagal generik).

---

## 10. Link repository (GitHub / local path / private repo)

**Tujuan.** Menghubungkan sebuah Project TestManager ke source code aplikasi yang
diuji, supaya: (a) AI punya konteks kode saat generate test case, (b) automation
script bisa diambil dari repo, (c) Issue bisa menyertakan commit/branch, dan
(d) regression bisa dipilih berdasarkan file yang berubah.

### 10.1 Model data

- [x] Tabel `project_repositories` — satu project bisa punya >1 repo (mis. FE + BE):
      `id`, `project_id`, `name`, `source_type`, `url_or_path`, `default_branch`,
      `credential_id`, `subdirectory`, `is_active`, timestamps.
- [x] `source_type`: `local_path` | `github_public` | `github_private` | `git_url`.
- [x] Domain type + row mapper mengikuti konvensi repo (`snake_case` → `camelCase`).

### 10.2 Mode `local_path`

- [x] Isi path absolut di mesin runner (mis. `/home/tester/app`) — dipakai runner dan
      MCP server yang jalan di mesin yang sama.
- [x] Validasi: path ada, terbaca, dan merupakan git repo (`.git` terdeteksi).
- [x] Baca metadata git lokal: branch aktif, commit SHA, dirty/clean.
- [x] **Tidak** dikirim ke server pusat sebagai isi file — hanya path + metadata.
      Server pusat tidak pernah menyimpan source code.

### 10.3 Mode GitHub (public & private)

- [x] Repo public: cukup URL, akses read tanpa kredensial.
- [x] Repo private: **Personal Access Token (fine-grained)** dengan scope minimal
      `contents: read` (+ `metadata: read`), opsional `issues: write` untuk sinkronisasi Issue.
- [ ] Alternatif yang lebih aman untuk tim: **GitHub App installation token**
      (auto-expire, per-repo) — didukung sebagai opsi kedua.
- [x] Uji koneksi ("Test connection") saat menyimpan: tampilkan nama repo, default
      branch, dan permission yang terdeteksi.
- [x] Dukungan self-hosted GitHub Enterprise / GitLab lewat `git_url` + token generik.

### 10.4 Penyimpanan kredensial (kritis)

- [x] Token **tidak pernah** disimpan plaintext di tabel dan **tidak pernah** dikirim
      ke browser. Disimpan di **Supabase Vault**, tabel hanya menyimpan `credential_id`.
- [x] Akses token hanya dari Edge Function / MCP server (service context), bukan dari
      frontend.
- [x] UI hanya menampilkan mask (`ghp_••••••abcd`), tanggal dibuat, dan tanggal
      kedaluwarsa; nilai penuh tidak bisa dibaca ulang setelah disimpan.
- [ ] Rotate & revoke token dari UI project settings; audit event tercatat.
- [x] RLS: hanya admin project yang bisa membuat/mengubah kredensial repo.
- [x] Peringatan eksplisit di UI kalau token yang dipakai punya scope berlebihan.

### 10.5 Pemanfaatan

- [x] **Konteks AI**: `repo.read_file` / `repo.search` (§8.2) memberi AI potongan kode
      relevan saat generate test case — hasil jauh lebih akurat daripada dari
      requirement teks saja.
- [x] **Sumber automation script**: `script_ref` bisa menunjuk file di repo; runner
      melakukan clone/pull (private repo memakai token) sebelum eksekusi.
- [x] **Traceability commit**: Test Run menyimpan `commit_sha` + `branch`; Issue
      menampilkan commit yang diuji.
- [x] **Regression selection**: `repo.diff` antara commit terakhir yang lulus dan
      commit sekarang → petakan file berubah ke Test Case (via module/tag/path mapping)
      → hanya test itu yang di-enqueue ulang (§11).
- [ ] Opsional: sinkronisasi dua arah Issue TestManager ↔ GitHub Issue (link, bukan copy).

### 10.6 UI

- [x] Tab **Repository** di Project Settings: daftar repo, tambah/edit/hapus, test
      connection, status koneksi terakhir.
- [x] Indikator di Test Run: repo + branch + commit yang diuji.

---

## 11. Alur end-to-end: Requirement → Verified (AI-assisted QA loop)

Ini adalah *acceptance scenario* yang menyatukan Section 4 (AI), 5 (Runner),
7 (MCP), 8 (Playwright interaktif), dan 9 (Repo). Section ini bukan fitur terpisah —
ia adalah kontrak alur yang harus bisa dijalankan utuh.

```text
Requirement
      ▼
AI → Generate Test Case CSV
      ▼
Import ke TestManager
      ▼
Review manusia (5–10 menit)          ← GATE WAJIB
      ▼
Test Plan disetujui
      ▼
AI menjalankan Test Run (via MCP → enqueue job → Local Runner)
      ▼
Jika gagal → Screenshot, Video, Console log, Network log, DOM snapshot, Trace
      ▼
AI membuat Issue (relasi ke Test Run + Test Case + Test Result)
      ▼
Developer memperbaiki
      ▼
AI membaca Issue yang sudah Resolved
      ▼
AI menjalankan ulang HANYA test yang relevan (regression)
      ▼
Passed → Verified          |          Failed → Issue tetap terbuka + komentar baru
```

### 11.1 Tahap 1 — Requirement → Test Case CSV

- [x] Input requirement: teks bebas, file (Excel/CSV/dokumen), atau **link repo**
      (§10) untuk konteks kode.
- [x] AI menghasilkan draft test case dalam **format CSV yang kolomnya persis sama**
      dengan template import yang sudah ada (`title`, `objective`, `precondition`,
      `steps`, `expected_result`, `priority`, `module`, `tags`).
- [x] Sertakan skenario negatif & edge case, bukan hanya happy path.
- [x] Setiap baris membawa `requirement_ref` supaya traceability langsung terbentuk.
- [x] Preview CSV di UI sebelum diunduh/diimpor.

### 11.2 Tahap 2 — Import & review manusia (gate wajib)

- [x] Import CSV masuk sebagai draft dengan penanda `source = ai`, bukan langsung aktif.
- [x] Halaman review: bulk approve/reject/edit, target **5–10 menit** untuk satu batch.
- [x] Deteksi duplikat terhadap test case yang sudah ada sebelum menyimpan.
- [x] **Tidak ada jalur bypass**: AI tidak bisa menandai test case sebagai approved,
      dan tidak bisa meng-approve Test Plan. Approver tercatat di audit log.

### 11.3 Tahap 3 — Test Plan disetujui → Test Run dijalankan AI

- [x] Test Plan dibentuk dari test case yang lolos review; status approval eksplisit.
- [x] AI (via MCP `testrun.create` + `automation.enqueue`) membuat **Test Run baru**
      dan mengantre job automation. Test case yang belum punya script tetap muncul
      sebagai eksekusi manual — AI tidak boleh menebak hasilnya.
- [x] Runner lokal mengeksekusi; status job terpantau real-time di UI.
- [x] Test Run menyimpan environment, browser, build version, branch, commit SHA.

### 11.4 Tahap 4 — Kegagalan → bukti lengkap

- [x] Setiap `test_result` FAIL membawa bundle bukti §9.3 secara utuh (screenshot,
      video, console, network/HAR, DOM snapshot, trace).
- [x] Artifact tersimpan di Storage dengan retention sesuai kebijakan Section 3.
- [x] Bukti dapat dibuka langsung dari halaman Test Result, tanpa unduh manual.

### 11.5 Tahap 5 — AI membuat Issue

- [x] Issue dibuat dari `test_result` FAIL, **wajib** membawa relasi
      `test_result_id` → `test_run_id` + `test_case_id`.
- [x] Isi otomatis: langkah reproduksi (dari steps), actual vs expected, ringkasan
      error, tautan ke semua artifact, environment + commit SHA.
- [x] Duplicate detection dijalankan lebih dulu: kalau kandidat duplikat ditemukan,
      AI menambah **komentar pada Issue lama** alih-alih membuat Issue baru.
- [x] Issue hasil AI berstatus draft sampai diverifikasi manusia (konsisten Section 4).

### 11.6 Tahap 6 — Developer memperbaiki

- [x] Issue menampilkan konteks kode dari repo (file/commit terkait) bila tersedia.
- [x] Perubahan status Issue ke `resolved` memicu event (webhook/notifikasi).
- [x] Opsional: link commit/PR yang mengklaim memperbaiki Issue.

### 11.7 Tahap 7 — Regression selektif

- [ ] AI memantau Issue berstatus `resolved` yang belum diverifikasi.
- [x] **Pemilihan test yang relevan** (bukan seluruh suite), dari gabungan sinyal:
      1. Test Case yang tertaut langsung ke Issue tersebut.
      2. Test Case satu module/tag dengan yang gagal.
      3. Test Case yang tertaut ke requirement yang sama.
      4. Test Case yang terdampak `repo.diff` commit perbaikan (§10.5).
- [x] Enqueue **Test Run regression baru** (tidak pernah menimpa run lama).
- [x] Batas aman: kalau jumlah test terpilih melebihi ambang, minta konfirmasi manusia.

### 11.8 Tahap 8 — Verifikasi

- [x] PASS → Issue ditandai `verified`, dengan tautan ke Test Run pembuktinya.
- [x] FAIL → Issue **tetap terbuka**, AI menambah komentar berisi bukti baru dan
      perbandingan dengan kegagalan sebelumnya (regresi lama vs baru).
- [x] Status `verified` boleh di-set AI, tapi tercatat sebagai aksi agent di audit log
      dan bisa di-override manusia.
- [x] Dashboard menampilkan siklus: berapa Issue masuk loop, berapa yang verified,
      berapa yang bolak-balik (reopen rate).

### 11.9 Kriteria selesai (definition of done alur ini)

- [ ] Satu requirement bisa berjalan dari teks sampai `verified` tanpa langkah manual
      selain **review test case** dan **approve test plan**.
- [x] Tidak ada tahap yang membuat AI mengubah data resmi tanpa jejak audit.
- [x] Seluruh eksekusi browser tetap terjadi di Local Runner, bukan server pusat.

---

## 12. Halaman "Connect your agent" (MCP + Skills + Prompt)

**Tujuan.** Menyatukan semua cara menyambungkan AI agent ke sebuah Project
TestManager dalam satu halaman generator, meniru pola modal "Connect to your
project" milik Supabase. User memilih opsi, halaman **menghasilkan** perintah dan
konfigurasi siap tempel — bukan dokumentasi statis yang harus diedit manual.

**Kenapa perlu.** Section 8 membangun MCP server, tapi tanpa ini setiap tester
harus mengarang sendiri `claude mcp add ...`, menebak nama tool, dan menyalin
token dengan cara yang rawan. Halaman ini yang mengubah MCP dari fitur developer
jadi fitur produk.

**Tahap 1 hanya Claude Code.** Client lain (Cursor, Claude Desktop, VS Code,
Windsurf) disiapkan di struktur data tapi ditandai "coming soon" di UI. Alasannya
tiap client punya format konfigurasi berbeda dan menambah permukaan uji sebelum
alur intinya terbukti.

### 12.1 Kerangka halaman

- [x] Route `/projects/:id/connect` + tombol **Connect Agent** di Project Detail
      dan Project Settings.
- [x] Tab bar mode koneksi, meniru struktur Supabase — tahap 1 hanya **MCP** yang
      aktif; sisanya placeholder disabled dengan label alasan:
      `MCP (aktif)` · `API Token` · `Webhook` · `CI/CD` · `Runner`.
- [x] Semua nilai yang ditampilkan **project-scoped**: project id, nama, dan URL
      diambil dari project yang sedang dibuka, bukan diketik user.
- [x] Halaman ini read-only terhadap data project — ia hanya membaca konfigurasi
      dan membuat token; tidak mengubah test case/plan/run apa pun.

### 12.2 Panel konfigurasi MCP

- [x] **Client selector** — dropdown. Tahap 1: `Claude Code` (satu-satunya
      enabled). Entri `Cursor`, `Claude Desktop`, `VS Code`, `Windsurf` tampil
      disabled + badge "segera".
- [x] **Read-only toggle** — memetakan langsung ke `TM_MCP_READONLY=1` (Section
      8.1). Saat aktif, tool tulis tidak diregistrasikan sama sekali, dan UI
      menampilkan berapa tool yang akan tersedia.
- [x] **Feature groups** — multiselect chip yang memilih grup tool mana yang
      diaktifkan, memakai pengelompokan Section 8.2:
      `DISCOVERY` · `TEST-CASE` · `TEST-PLAN` · `TEST-RUN` · `ISSUE` ·
      `AUTOMATION` · `REPO` · `ANALYSIS` · `DOCS`.
- [x] Grup yang berat/berisiko (`AUTOMATION`, `REPO`) **off secara default** —
      alasan sama dengan Supabase mematikan Storage: menjaga jumlah tool tetap
      terkelola dan mengurangi permukaan risiko.
- [x] Penghitung live: "N tool akan aktif" + peringatan kalau N melewati ambang
      yang bikin context agent membengkak.
- [x] Preview daftar nama tool yang akan teregistrasi, bisa dilipat.

### 12.3 Langkah bernomor + perintah siap salin

- [x] **Langkah 1 — Add MCP server.** Menghasilkan perintah lengkap, contoh
      bentuknya:
      `claude mcp add --scope project --transport http testmanager <url>`
      dengan URL dan header yang sudah terisi sesuai project + opsi terpilih.
- [x] **Langkah 2 — Authenticate.** Instruksi `claude /mcp` lalu pilih server dan
      jalankan flow auth. Sertakan catatan bahwa ini harus dijalankan di terminal
      biasa, bukan di dalam ekstensi IDE.
- [x] **Langkah 3 — Install Agent Skills (opsional).** Perintah pemasangan skill
      pack TestManager (lihat 12.4).
- [x] Tombol **Copy** per langkah + tombol **Copy semua** di header panel.
- [x] Setiap perintah yang disalin ikut menyesuaikan pilihan read-only dan feature
      group — bukan template statis.
- [x] Blok perintah bisa di-scroll horizontal dan tidak pernah memotong isi
      diam-diam (perintah terpotong = user menempel perintah rusak).

### 12.4 Agent Skills pack

Skill = instruksi + resource siap pakai supaya agent memakai TestManager dengan
benar tanpa harus diajari ulang tiap sesi.

- [x] Folder `skills/` berisi skill pack TestManager, dapat dipasang ke project
      user (pola `npx skills add ...` atau salin ke `.claude/skills/`).
- [x] Skill **`testmanager-workflow`** — aturan main domain: re-run selalu Test Run
      baru, Test Case tidak pernah menyimpan hasil, Issue hanya dari Test Result
      FAIL, approval selalu manusia.
- [x] Skill **`testmanager-authoring`** — cara menulis Test Case yang baik:
      struktur steps, expected result, skenario negatif, edge case.
- [x] Skill **`testmanager-triage`** — cara membaca Test Run gagal, membaca bundle
      bukti, dan menyusun Issue yang actionable.
- [x] Skill **`testmanager-regression`** — cara memilih test regression yang
      relevan (sinyal Section 11.7) dan kapan harus minta konfirmasi manusia.
- [x] Halaman menampilkan daftar skill + deskripsi singkat, dengan checkbox mana
      yang ikut dipasang.
- [x] Skill pack diversipkan dan dicatat versinya, supaya bisa diperbarui tanpa
      menebak-nebak.

### 12.5 Prompt starter

- [x] Panel **Prompt** berisi prompt siap pakai yang sudah terisi konteks project
      (nama, id, module, environment aktif).
- [x] Kategori prompt minimal: *generate test case dari requirement*, *analisis
      Test Run terakhir*, *triage Issue terbuka*, *pilih regression untuk Issue
      resolved*, *audit coverage requirement*.
- [x] Tombol **Copy prompt** per item (sejajar dengan tombol "Copy prompt" di pola
      Supabase).
- [x] Prompt disimpan sebagai data, bukan hardcode di komponen, supaya bisa
      ditambah tanpa menyentuh UI.
- [ ] Opsional: user bisa menyimpan prompt sendiri per project (butuh tabel baru —
      putuskan dulu apakah masuk scope tahap 1).

### 12.6 Keamanan (jangan dilewat)

- [x] Token **tidak pernah ditanam di dalam string perintah yang ditampilkan**.
      Perintah yang disalin merujuk ke variabel environment atau flow auth
      interaktif; kalau token harus muncul, tampilkan sekali dengan peringatan
      eksplisit.
- [x] Alasannya: perintah yang ditempel ke shell masuk ke `~/.bash_history`, dan
      screenshot halaman ini akan beredar di grup chat. Dua-duanya membocorkan
      token permanen.
- [x] Token yang dibuat dari halaman ini **project-scoped**, punya masa berlaku,
      dan bisa dicabut dari halaman yang sama.
- [x] Tampilkan daftar token aktif yang pernah dibuat lewat halaman ini beserta
      pemakaian terakhir, supaya token menganggur bisa dicabut.
- [x] Pembuatan/pencabutan token tercatat di audit log.
- [x] Peringatan eksplisit saat read-only dimatikan: agent akan bisa menulis data
      project.

### 12.7 Kualitas UI

- [x] Status koneksi: deteksi apakah project ini sudah pernah dipakai lewat MCP
      (dari `ai_audit_events`) dan tampilkan "terakhir dipakai <waktu>".
- [x] Empty state yang mengajari, bukan sekadar "belum ada data".
- [x] Seluruh perintah punya fallback teks yang bisa diseleksi manual kalau
      clipboard API diblokir browser.
- [x] Konsisten dengan `PageHeader` dan tema light/dark yang sudah ada.

---

### 12.8 Bootstrap runner lewat agent (satu perintah)

Tester tidak boleh disuruh membuka dokumentasi terpisah untuk memasang runner.
Dari sudut pandang agent, memasang dan menyambungkan runner harus **satu
perintah**, dan prompt di halaman Connect yang membawanya.

- [x] Prompt starter menyertakan varian **"Pasang & sambungkan runner"** yang
      menginstruksikan agent memasang Local Runner lalu menyambungkannya ke
      project ini.
- [x] Perintah yang dihasilkan berbentuk satu baris, contoh bentuknya:
      `npx @testmanager/runner init --code <BOOTSTRAP_CODE>`
- [x] `BOOTSTRAP_CODE` adalah **kode sekali pakai berumur pendek** (default 10
      menit), bukan runner token. Lihat 14.4 — ini yang membuat perintahnya aman
      ditempel ke prompt, di-screenshot, atau dikirim lewat chat.
- [x] Setelah `init` berhasil, halaman Connect mendeteksi heartbeat pertama dan
      berpindah sendiri ke status "Runner terhubung" (sinkron dengan wizard 13.1 —
      satu alur, bukan dua yang mirip).
- [x] Agent diberi tahu apa yang harus dilaporkan balik ke user: nama runner,
      label, dan project yang tersambung. Tidak boleh menampilkan token.
- [x] Skill `testmanager-workflow` (12.4) memuat instruksi setup runner ini,
      supaya agent tahu caranya tanpa harus diberi prompt panjang tiap kali.

---

## 13. Runner UI/UX yang lebih ramah

**Masalah sekarang.** `pages/automation/AutomationPage.tsx` menyajikan tiga tab
tabel mentah (Runner, Mapping Script, Job). Ini cukup untuk yang sudah paham
arsitekturnya, tapi tester baru tidak tahu harus mulai dari mana, kenapa runner-nya
`offline`, atau kenapa job-nya menggantung di `queued`. Section ini membuat modul
automation bisa dipakai tanpa harus membaca `runner/README.md` lebih dulu.

Section 9 mengurus *kemampuan* runner. Section ini mengurus *pengalaman memakainya*.

### 13.1 Onboarding runner

- [x] Wizard **"Hubungkan Runner"** berlangkah: beri nama runner → pilih label
      kapabilitas → dapatkan token sekali tampil → salin perintah instalasi →
      halaman menunggu heartbeat pertama dan mengonfirmasi "Runner terhubung".
- [x] Deteksi otomatis heartbeat pertama tanpa perlu refresh manual.
- [x] Perintah instalasi siap salin untuk dua jalur: **npm** (`npm install` +
      `npm start`) dan **Docker** (`docker run` dengan `--env-file`).
- [x] Empty state di tab Runner yang mengarah langsung ke wizard, bukan tabel kosong.
- [x] Penjelasan singkat satu paragraf di halaman: kenapa runner harus di mesin
      lokal dan kenapa tidak perlu buka port.

### 13.2 Status runner yang terbaca

- [x] Indikator status jelas: `Online` · `Idle` · `Sibuk` · `Offline`, dengan
      warna dan waktu heartbeat terakhir dalam bahasa manusia ("2 menit lalu").
- [x] Kartu runner (bukan hanya baris tabel) di layar lebar: nama, label, versi
      runner, OS, browser tersedia, job terakhir, dan uptime.
- [x] Peringatan kalau runner offline > ambang tertentu padahal masih ada job antre.
- [x] Tombol rotate/revoke token per runner dengan konfirmasi eksplisit.
- [x] Tampilkan **kenapa** sebuah job tidak diambil runner mana pun (label tidak
      cocok, semua runner offline, atau environment tidak terjangkau) — ini
      penyebab kebingungan paling umum pada pola pull-based.

### 13.3 Papan job

- [x] Tampilan papan berkolom status: `Queued` → `Running` → `Passed`/`Failed`,
      sebagai alternatif tabel.
- [x] Progres per job: langkah yang sedang jalan, durasi berjalan, dan perkiraan
      selesai berdasarkan run sebelumnya.
- [x] Live log streaming saat job `running` (bergantung pada Section 9.4).
- [x] Filter cepat: per runner, per environment, per test plan, per status.
- [x] Aksi baris: batalkan job antre, ulangi job gagal, buka Test Result terkait.
- [x] Badge jumlah job antre di menu sidebar supaya terlihat tanpa membuka halaman.

### 13.4 Mapping script yang tidak membingungkan

- [x] Tampilkan Test Case yang **belum** punya script secara menonjol — inilah
      pekerjaan yang tersisa, bukan daftar yang sudah selesai.
- [x] Validasi `script_ref` saat disimpan: beri tahu kalau file tidak ditemukan di
      runner mana pun yang online.
- [x] Bulk mapping: pilih banyak Test Case sekaligus lalu petakan berdasarkan pola
      penamaan file.
- [x] Tampilkan label runner yang dibutuhkan beserta runner mana yang memenuhi,
      dievaluasi saat itu juga.

### 13.5 Diagnostik & troubleshooting

- [x] Panel **Diagnostik** per runner: hasil sanity check terakhir (base URL
      reachable, browser terpasang, versi Playwright, ruang disk).
- [x] Daftar penyebab kegagalan umum beserta cara memperbaikinya, ditampilkan
      kontekstual saat kondisinya terdeteksi — bukan halaman FAQ terpisah.
- [x] Tombol "Uji koneksi" yang mengirim job no-op ke runner untuk membuktikan
      jalur end-to-end hidup.
- [x] Tampilkan versi runner dan peringatkan kalau tertinggal dari versi server.

### 13.6 Responsif & konsisten

- [x] Layout mobile: kartu, bukan tabel yang harus digeser horizontal.
- [x] Ikuti konvensi `PageHeader` untuk halaman list (lihat CLAUDE.md) dan tema
      light/dark.
- [x] Semua state (loading, kosong, error, offline) punya tampilan yang dirancang,
      tidak ada spinner tanpa konteks.

---

## 14. Distribusi & arsitektur Local Agent

**Konteks keputusan.** Aplikasi ini akan di-deploy **self-hosted lebih dulu**, dan
ke depan direncanakan punya **backend custom** (bukan Supabase langsung). Karena
itu runner dan MCP server dijalankan sebagai **dua proses terpisah untuk sekarang**,
tapi dirancang supaya bisa disatukan jadi satu **Local Agent** tanpa menulis ulang.

**Kenapa akhirnya harus disatukan.** Runner dan MCP server hidup di mesin yang sama,
butuh identitas yang sama, dan melayani orang yang sama. Kalau dibiarkan terpisah
selamanya, kita membangun dua kali: dua auth, dua heartbeat, dua onboarding, dua
jalur update. Yang lebih penting, agent baru bisa menjalankan test ke `localhost`
secara langsung kalau ia berada di proses yang sama dengan eksekutor.

```text
SEKARANG (self-hosted, dua proses)        NANTI (satu Local Agent)
┌──────────────┐  ┌──────────────┐        ┌────────────────────────┐
│ MCP server   │  │ Runner       │        │  TestManager Agent     │
│ (mcp/)       │  │ (runner/)    │   ──▶  │   ├── MCP server       │
└──────┬───────┘  └──────┬───────┘        │   ├── Job executor     │
       │  token A        │  token B       │   └── Repo reader      │
       ▼                 ▼                └───────────┬────────────┘
   Supabase RPC      Supabase RPC                     │ satu token
                                                      ▼
                                          Supabase RPC / Backend API
```

### 14.1 Adapter pattern (wajib, ini yang bikin penyatuan nanti murah)

Semua akses keluar dari runner dan MCP harus lewat adapter. Ini bukan kerapian —
ini syarat supaya backend custom nanti bisa masuk tanpa membongkar isi.

- [x] **`TransportAdapter`** — cara bicara ke server pusat.
      `SupabaseRpcTransport` (sekarang) → `BackendHttpTransport` (setelah backend ada).
      Tidak boleh ada pemanggilan Supabase langsung di luar adapter ini.
- [x] **`ExecutorAdapter`** — cara menjalankan test.
      `PlaywrightLocalExecutor` (sekarang) → `CloudExecutor` (kalau cloud runner jadi).
- [x] **`ArtifactStorageAdapter`** — tempat menyimpan bukti.
      `SupabaseStorage` (sekarang) → `S3`/`MinIO`/`BackendUpload`.
- [x] **`AuthAdapter`** — cara runner membuktikan identitas.
      `RunnerTokenAuth` (sekarang) → OAuth device flow / mTLS (kalau jadi SaaS).
- [x] **`RepoAdapter`** — cara membaca source (Section 10).
      `LocalPathRepo` · `GitCloneRepo` — dipakai bersama oleh runner dan MCP.
- [x] Kontrak adapter didefinisikan di satu paket bersama (`packages/agent-core`
      atau sejenis) yang diimpor `runner/` dan `mcp/`, sehingga saat disatukan
      tinggal menggabungkan entry point.
- [ ] Aturan review: PR yang menambah `fetch` ke Supabase di luar adapter ditolak.

### 14.2 Jahitan bersama sejak sekarang

Yang harus sudah dipakai bareng oleh `runner/` dan `mcp/` sebelum penyatuan:

- [x] Konfigurasi: satu skema env dengan prefix `TM_`, satu loader, satu validator.
- [ ] Identitas: satu format token dan satu mekanisme pencabutan.
- [x] Logging: format sama, dengan **redaksi rahasia terpusat** (14.4).
- [x] Telemetri/heartbeat: satu bentuk payload, sehingga server melihat satu jenis
      "agent" walau saat ini datang dari dua proses.
- [x] Versioning: `runner/` dan `mcp/` dirilis dengan nomor versi yang sama.

### 14.3 Cara install

Local Agent dipakai developer, dan developer sudah punya Node. Jadi jalur utamanya
npm. Runner sendiri **tidak memuat Playwright** — ia memanggil Playwright milik
project yang diuji, jadi paket yang didistribusikan tetap kecil.

| Jalur | Untuk siapa | Bentuk perintah |
|---|---|---|
| **`npx`** (utama) | developer, pemakai MCP | `npx @testmanager/runner init --code <CODE>` |
| **npm global** | mesin tester tetap | `npm i -g @testmanager/runner` |
| **Tarball self-hosted** | instance tertutup tanpa akses registry | `npm i -g https://<instance>/runner/tm-runner-<ver>.tgz` |
| **Docker** | mesin bersama / on-prem | `docker run --env-file .env -v <project>:/project ...` |
| **Binary tertandatangani** | QA non-developer (nanti) | `brew install` / `winget install` |

- [x] Jalur `npx` didahulukan: tidak ada instalasi permanen, selalu versi terbaru,
      paling sedikit langkahnya.
- [x] Tarball self-hosted disajikan oleh instance itu sendiri beserta **SHA256**
      yang ditampilkan di halaman Connect, supaya bisa diverifikasi.
- [x] **Tidak memakai `curl | bash`** selama belum ada penandatanganan rilis.
      Kalau nanti dipakai, wajib: domain sendiri, binary tertandatangani,
      checksum dipublikasikan, dan script bisa diunduh dulu sebelum dijalankan.
- [x] **Nol runtime dependency dipertahankan.** Ini bukan estetika — setiap
      dependency adalah pintu masuk supply chain ke mesin developer pelanggan.
      Penambahan dependency harus keputusan sadar dan tercatat.
- [ ] Publikasi paket wajib memakai npm provenance + 2FA.
- [x] Catat matriks kompatibilitas versi runner ↔ versi server, dan runner
      memperingatkan kalau tertinggal terlalu jauh.
- [x] Catatan Docker: dari dalam container, `localhost` adalah container itu
      sendiri. Untuk menguji aplikasi di host perlu `--network host` (Linux) atau
      `host.docker.internal`. Docker karena itu **bukan** jalur default untuk
      laptop tester.

### 14.4 Setup yang tidak membocorkan rahasia

Ini syarat utama yang harus dipenuhi supaya "satu perintah" (12.8) tidak berubah
jadi kebocoran token.

- [x] **Bootstrap code**, bukan token, yang ditampilkan dan ditempel:
      sekali pakai, berumur pendek (default 10 menit), hanya berwenang menukar diri
      menjadi runner token, dan mati begitu dipakai.
- [x] Runner token asli **dibuat di sisi mesin lokal** hasil penukaran bootstrap
      code, lalu ditulis ke file konfigurasi dengan permission `0600`. Token tidak
      pernah muncul di layar, di prompt, di clipboard, maupun di riwayat shell.
- [x] Alasan desain ini ditulis eksplisit: perintah yang ditempel masuk ke
      `~/.bash_history`, dan halaman Connect akan di-screenshot lalu dibagikan.
      Dua hal itu membocorkan token permanen, tapi tidak membocorkan bootstrap code
      yang sudah kedaluwarsa.
- [x] Redaksi terpusat: token, bootstrap code, dan kredensial repo di-mask di
      seluruh log runner, MCP, dan output error — termasuk saat crash.
- [x] `.env` runner masuk `.gitignore` bawaan template, dan runner menolak jalan
      kalau file konfigurasinya world-readable.
- [x] Token per runner dapat dicabut dan dirotasi dari UI; pencabutan langsung
      berlaku pada poll berikutnya.
- [x] Peringatan eksplisit saat setup: **runner menjalankan kode dari repo yang
      kamu tautkan, di mesin ini**. Ini batas kepercayaan yang wajar, tapi harus
      dinyatakan, bukan diasumsikan.
- [x] Trust repo eksplisit sekali di sisi runner (pola "trust this folder"), dan
      runner menolak `script_ref` di luar repo yang di-trust.
- [x] Catatan yang mudah terlewat: `npx playwright test` **memuat
      `playwright.config.ts` sebelum satu test pun jalan**, dan file itu kode Node
      biasa. Jadi memvalidasi `script_ref` saja tidak cukup — kepercayaan harus di
      level repo, bukan level file.

### 14.5 Kriteria penyatuan jadi satu Local Agent

Penyatuan dikerjakan setelah semua ini terpenuhi, bukan sebelumnya:

- [ ] Backend custom sudah ada dan `BackendHttpTransport` sudah terbukti jalan.
- [ ] Seluruh akses keluar sudah lewat adapter (14.1), nol pemanggilan langsung.
- [ ] Format token dan konfigurasi sudah sama antara `runner/` dan `mcp/` (14.2).
- [ ] Ada jalur migrasi untuk pemasangan lama: agent baru membaca konfigurasi
      runner lama, dan runner lama tetap didukung minimal satu versi mayor.
- [ ] Setelah disatukan: satu perintah install, satu token, satu status koneksi,
      dan agent dapat menjalankan test lokal tanpa melewati antrean server.

---

## 15. Urutan implementasi yang disarankan

Sudah selesai (1–9): Requirement Traceability → Environment Management → Test Run
Enhancement → Dashboard Trend → API dan Webhook → Playwright Local Runner →
Orkestrasi job automation → AI Integration → CI/CD Integration.

Berikutnya:

10. **Integrasi source-new** (Section 7, SRC-01–SRC-14) — merapikan basis kode dulu
    supaya fitur baru tidak dibangun di atas dua struktur yang bersaing.
11. **Link repository** (Section 10) — prasyarat konteks kode untuk MCP & regression.
12. **MCP server fondasi + tools read-only** (8.1, bagian read dari 8.2).
13. **Playwright interaktif: bukti kegagalan lengkap** (9.3 + 9.4) — ini yang
    membuat Issue hasil AI berguna.
14. **MCP tools write + automation** (sisa 8.2, 8.3).
15. **Adapter pattern + jahitan bersama** (14.1, 14.2) — dikerjakan SEBELUM
    Connect page dan Runner UI, karena keduanya membangun di atas kontrak ini.
    Menunda langkah ini berarti membayarnya dua kali.
16. **Bootstrap code + setup anti-bocor** (14.4) — prasyarat teknis untuk 12.8.
17. **Halaman "Connect your agent"** (Section 12) termasuk bootstrap satu perintah
    (12.8) — begitu tool MCP-nya ada, inilah yang membuatnya bisa dipakai orang
    lain tanpa dituntun manual.
18. **Runner UI/UX** (Section 13) — onboarding + status + papan job (13.1–13.3).
19. **Distribusi npx + tarball self-hosted** (14.3).
20. **Alur end-to-end tahap 1–5** (11.1–11.5): CSV → review → run → bukti → Issue.
21. **Regression selektif + verifikasi** (11.6–11.8).
22. **Playwright interaktif: codegen, UI mode, pause & inspect** (9.1, 9.2, 9.5).
23. Sisa Runner UI/UX (13.4–13.6) + Scheduled Test Run + Administrasi (Section 5, 6).
24. **Penyatuan jadi satu Local Agent** (14.5) — hanya setelah backend custom ada
    dan kriterianya terpenuhi.

Alasan urutan: repo link dulu karena MCP dan regression selection sama-sama
bergantung padanya; bukti kegagalan sebelum AI-create-Issue karena Issue tanpa
screenshot/trace tidak actionable; **adapter pattern sebelum UI apa pun** karena
Connect page dan Runner UI keduanya menempel ke kontrak koneksi — kalau kontraknya
berubah setelah UI jadi, dua-duanya dibongkar ulang; bootstrap code sebelum 12.8
karena tanpa itu "satu perintah" hanya bisa dicapai dengan menempelkan token
permanen ke prompt; mode interaktif belakangan karena sifatnya peningkatan
pengalaman authoring, bukan penghalang alur utama.

## 16. Verifikasi bahwa fitur benar-benar jalan

**Masalahnya.** Sampai 2026-08-01, satu-satunya bukti bahwa sebuah task selesai
adalah kode itu **ter-compile**. Compile tidak membuktikan fitur jalan. Dengan ~80
task sudah dikerjakan agent dan hanya **2 berkas test** di seluruh frontend
(dibanding 9 berkas / 31 test di `runner/`), ada kesenjangan verifikasi yang nyata.

**Ironi yang harus diakui.** Meminta agent menulis test untuk fitur yang dibangun
agent itu sendiri punya kelemahan mendasar: kalau agent salah paham requirement,
ia akan menulis test yang mengassert kesalahpahamannya. Test hijau, tidak ada yang
tertangkap. Test yang ditulis penulis kode yang sama, dalam sesi yang sama, hanya
membuktikan "kode ini melakukan apa yang kode ini lakukan".

**Yang membuatnya tetap layak.** Repo ini sudah punya **oracle independen**:
aturan domain di `CLAUDE.md` ditulis manusia, sebelum kodenya ada. Test yang
mengassert aturan itu bukan tautologi — kalau agent salah paham, test-nya gagal.

### 16.1 Aturan main

Ini adalah pernyataan kebijakan proses, bukan task yang bisa "selesai" —
dipindahkan ke Section 18 Catatan keputusan teknis (AUDIT-04).

### 16.2 Infrastruktur test (prasyarat)

Belum ada di repo saat ini — harus dibangun lebih dulu.

- [x] Konfigurasi Vitest dengan environment DOM (`jsdom` atau `happy-dom`) dan
      `@testing-library/react` di `frontend/`. (Bukti: `frontend/vitest.config.ts`,
      `@testing-library/react` di `devDependencies`.)
- [x] Utilitas test bersama: factory data domain (Project, TestCase, TestPlan,
      TestRun, TestResult, Issue) dan mock Supabase client yang dipakai seluruh test.
      (Bukti: `frontend/src/test/`.)
- [x] Skrip `npm run test` mencakup seluruh berkas test, dan `npm run test:coverage`
      untuk melihat area yang belum tersentuh. (Bukti: `frontend/package.json`
      — `"test": "vitest run"`, `"test:coverage": "vitest run --coverage"`.)
- [x] Konvensi penamaan dan lokasi berkas test dicatat di `AGENTS.md`. (Bukti:
      `AGENTS.md` bagian "Coding Conventions" > "Test".)

### 16.3 Tingkat 1 — Test invariant domain (nilai tertinggi)

Setiap aturan di `CLAUDE.md` menjadi test eksekutabel di level service, dengan
repository di-mock. Inilah yang paling layak masuk gate.

- [x] `test_cases` dan `test_plan_cases` tidak pernah menyimpan kolom hasil.
      (Bukti: `testRunService.test.ts` — "stores execution state only in
      test_results, never in test_cases or test_plan_cases".)
- [x] Re-run selalu membuat Test Run baru, tidak pernah menimpa run sebelumnya.
      (Bukti: `testRunService.test.ts` — "creates a new test run for every
      re-run without overwriting the previous run".)
- [x] Summary/progress Test Run selalu dihitung on-the-fly, tidak pernah disimpan
      sebagai kolom. (Bukti: `testRunService.test.ts` — "recomputes summary and
      progress from test_results on every read without persisting them".)
- [x] Status Test Run `completed` hanya berubah lewat aksi eksplisit, tidak otomatis.
      (Bukti: `testRunService.test.ts` — "marks a test run completed only
      through the explicit complete action".)
- [x] Issue hanya dapat dibuat dari Test Result berstatus FAIL, dan relasinya 1:many.
      (Bukti: `issueService.test.ts` — "allows multiple Issues to reference the
      same failed Test Result"; `TestRunDetailPage.test.tsx` — "offers Issue
      creation only for FAIL and preserves the Test Result relation".)
- [x] Tester pada Test Result harus user terdaftar (`profiles`), bukan teks bebas.
      (Bukti: `testRunService.test.ts` — "records a tester only when the tester
      exists in profiles"; "rejects an unregistered tester instead of storing
      free text as tester identity".)
- [x] User `pending` tidak dapat mengakses modul apa pun. (Bukti:
      `ProtectedRoute.test.tsx` — 16 route diuji satu per satu dengan
      `it.each`, seluruhnya redirect ke `/pending-approval`.)
- [x] AI/agent tidak dapat meng-approve test case maupun Test Plan. (Bukti:
      `aiTestCaseService.test.ts` — "persists an AI-generated test case as
      draft without approving it"; `TestPlanDetailPage.test.tsx` — "uses
      explicit approval when a draft plan is activated".)
- [x] Test case hasil AI berstatus draft sampai disetujui manusia. (Bukti: sama
      dengan item di atas, `aiTestCaseService.test.ts`.)
- [x] Mapping row Supabase (`snake_case`) ↔ domain (`camelCase`) bolak-balik utuh.
      (Bukti: `mappers.test.ts` menguji seluruh mapper bolak-balik. Catatan: per
      `2026-08-02` ada 6 test gagal di berkas ini karena field `username` baru
      [APPNEW-02] belum tercermin di factory — test debt terpisah, dicatat di
      `WORKLOG.md`, tidak mengubah bahwa infrastruktur pengujian bolak-baliknya
      sendiri sudah ada.)

### 16.4 Tingkat 2 — Unit test logika murni (murah, nilai nyata)

- [x] `helpers/mappers.ts` — seluruh mapper row↔domain. (Bukti:
      `mappers.test.ts`; lihat catatan test debt di 16.3.)
- [x] `helpers/dateFormatter.ts`, `helpers/statusLabels.ts`. (Bukti:
      `dateFormatter.test.ts`, `statusLabels.test.ts`.)
- [x] Validasi di service: input kosong, panjang berlebih, enum tidak dikenal.
      (Bukti: `testCaseService.test.ts`, `testPlanService.test.ts`,
      `testRunService.test.ts`, `issueService.test.ts` — masing-masing punya
      describe "validation" dengan pola persis ini.)
- [ ] Logika filter dan sorting yang dipakai halaman list.
- [x] Pembentukan kode entity otomatis (MOD/TC/TP/TR-####). (Bukti:
      `entityCodes.test.ts`.)

### 16.5 Tingkat 3 — Component test (terbatas, hanya alur kritis)

Hanya alur yang bila rusak menghasilkan **data salah**, bukan sekadar tampilan
kurang rapi. Mocking Supabase mahal dan rapuh; jangan diperluas tanpa alasan.

- [x] Halaman review batch test case AI: approve/reject/edit. (Bukti:
      `AiTestCaseReviewPage.test.tsx` — "AiTestCaseReviewPage critical review
      flow".)
- [x] Alur approval Test Plan. (Bukti: `TestPlanDetailPage.test.tsx` — "uses
      explicit approval when a draft plan is activated".)
- [x] Pembuatan Issue dari Test Result FAIL. (Bukti: `TestRunDetailPage.test.tsx`
      — "offers Issue creation only for FAIL and preserves the Test Result
      relation".)
- [x] Pencatatan Test Result pada Test Run. (Bukti: `TestRunDetailPage.test.tsx`
      — "records a Test Result on the active Test Run and reloads its summary".)

### 16.6 Tingkat 4 — Smoke & E2E (di luar gate per-task)

- [x] **Smoke test** (`scripts/codex-loop/smoke.sh`): build, jalankan preview,
      muat aplikasi, pastikan tidak ada error runtime pada boot. Ini satu-satunya
      lapis yang membuktikan aplikasi benar-benar JALAN, bukan sekadar ter-compile.
      (Bukti: skrip ada dan dikonfirmasi lolos manual pada `2026-08-01`, lihat
      `WORKLOG.md`.)
- [x] Infrastruktur E2E terpasang (E2E-INFRA-01): `@playwright/test` sebagai
      devDependency, `frontend/playwright.config.ts` (jalan di atas build
      produksi `vite preview`, bukan `vite dev`, untuk menghindari
      `ERR_INSUFFICIENT_RESOURCES` palsu dari HMR — lihat WORKLOG.md
      2026-08-02), skrip `npm run test:e2e`, folder `frontend/e2e/`.
- [x] E2E alur utama (E2E-INFRA-03): `frontend/e2e/main-flow.spec.ts` —
      login → buat project → buat test case → buat test plan → tambah case ke
      plan → setujui plan → mulai test run → catat hasil FAIL → buat issue
      dari hasil FAIL. Lolos `2026-08-03`. Menulis skenario ini membongkar
      **3 bug RLS/permission produksi** yang sebelumnya lolos tak terdeteksi
      karena semua testing manual selalu pakai akun admin (bypass semua
      pengecekan `is_admin()`/`isAdmin`) — lihat `schema_094`–`096` dan
      WORKLOG.md: (1) user non-admin sama sekali tidak bisa membuat project
      (RLS SELECT gagal saat RETURNING karena `owner_id` trigger AFTER INSERT
      belum ter-set), (2) pemilik project baru cuma dapat permission
      view-only pada project miliknya sendiri (trigger tidak mengisi kolom
      `permissions` sesuai `DEFAULT_PROJECT_PERMISSIONS.manager`).
- [x] Seed data deterministik untuk E2E, terpisah dari data pengembangan.
      (Bukti: `supabase/seed_e2e.sql` — idempoten, id fixture berprefix tetap
      `e2e0000-...` di project Supabase yang sama dengan dev (satu project
      untuk semua environment, keputusan sadar user, bukan Supabase project
      terpisah/branch). Membuat user `e2e@testmanager.local` + 1 project + 1
      module + 1 tag + 1 test case + 1 test plan. Dieksekusi ke target lewat
      MCP Supabase dan diverifikasi lewat `frontend/e2e/smoke.spec.ts` —
      login sungguhan + project fixture terlihat di `/projects`, lolos
      `2026-08-03`. Ketemu & diperbaiki 1 bug produksi di jalan: GoTrue
      menolak grant_type=password untuk user manapun yang kolom
      `email_change`/token varchar-nya NULL (default kolom auth.users) —
      lihat catatan di `seed_e2e.sql`.)

### 16.7 Audit fitur yang sudah terlanjur dibangun

Sekitar 80 task sudah selesai tanpa verifikasi selain compile. Ini utang, dan
harus dibayar sebagai pekerjaan tersendiri.

- [x] Inventarisasi fitur yang sudah diklaim selesai, urut berdasarkan risiko
      (yang menyentuh data dan RBAC lebih dulu). (Bukti: `docs/TEST_DEBT.md`
      dengan struktur P0/P1/P2.)
- [ ] Untuk tiap fitur berisiko tinggi: tulis test invariant, lalu perbaiki bila
      test-nya gagal. (Sebagian sudah ada — lihat 20 berkas test dan bukti di
      16.3–16.5 — tapi `docs/TEST_DEBT.md` sendiri didokumentasikan sebagai
      "hanya daftar dan analisis" [TEST-14]; belum ada bukti setiap item P0
      di dalamnya sudah tuntas diuji satu per satu. Dibiarkan kosong.)
- [x] Bersihkan artefak yang tidak terpakai. Per 2026-08-01 ditemukan 4 hook
      yatim yang tidak pernah diimpor siapa pun: `useModules`,
      `useProjectBreadcrumbItems`, `useStoredState`, `useTabQueryParam`.
      Pakai, atau hapus. (Bukti: keempatnya sudah dipakai konsumen yang sesuai,
      dicatat di `WORKLOG.md` entri TEST-13.)
- [x] Daftar smoke test manual yang **tetap harus dijalankan manusia** sebelum
      rilis: login Google, approval user pending, alur project → test case →
      plan → run → result → issue, import/export Excel, upload attachment.
      (Bukti: `docs/MANUAL_SMOKE.md`.)

### 16.8 Endgame — dogfooding

Kriteria dan alasan penundaan endgame ini adalah pernyataan kebijakan, bukan
task — dipindahkan ke Section 18 Catatan keputusan teknis (AUDIT-04).

---

## 17. Ide yang diambil dari App-new (pasca SRC-13)

`App-new.tsx` sudah diaudit tuntas (SRC-13) dan **ditolak untuk promosi**: ia
kehilangan 14 route termasuk `/pending-approval` — tujuan redirect user ber-role
`pending`, sehingga RBAC-nya rusak — dan merujuk 4 modul yang tidak ada di source
aktif (`AppToast`, `useDialogResizeFix`, `TestRunResultDetailPage`,
`PublicProfilePage`) sehingga tidak dapat dikompilasi. Berkasnya dihapus
2026-08-02; auditnya tetap terekam di WORKLOG.md.

Tiga ide di bawah ini adalah bagian yang memang layak diambil, dikerjakan sebagai
fitur tersendiri di atas `App.tsx` aktif — bukan lewat penggantian berkas.

### 17.1 Halaman Settings user

- [x] Tabel preferensi per user (tema, notifikasi, project default) + migration + RLS.
      (Bukti: `supabase/schema_091_user_preferences.sql`, sudah diverifikasi ada
      di target lewat MCP Supabase pada `2026-08-02`.)
- [x] Domain type, mapper, repository, service, hook mengikuti urutan layer.
      (Bukti: `frontend/src/hooks/useUserPreferences.ts`,
      `frontend/src/repositories/userPreferenceRepository.ts`,
      `frontend/src/services/userPreferenceService.ts`, `types/domain.ts`.)
- [x] Route `/settings` di dalam `AppLayout` + item menu. (Bukti: route di
      `App.tsx`, item menu "Settings" di `AppMenu.tsx:70`. Dikonfirmasi jalan
      lewat smoke Playwright terautentikasi pada audit Section 7.)
- [x] Preferensi tema menggantikan penyimpanan lokal yang sekarang, tanpa
      menghilangkan perilaku system/light/dark yang sudah ada. (Bukti:
      `components/layout/AppLayout.tsx` — `AppLayoutInner` memanggil
      `useUserPreferences()` dan menyinkronkan `preferences.theme` ke
      `ThemeProvider.setMode()` lewat `useEffect` setiap kali berbeda dari
      mode aktif, jadi begitu preferensi dari DB termuat (mis. sesi baru di
      device lain) tema otomatis mengikuti DB. `localStorage`
      (`theme-mode.v1`) tetap dipakai `ThemeProvider` hanya sebagai nilai
      awal sebelum auth/preferences termuat — bukan lagi sumber kebenaran
      setelah login. Diverifikasi `2026-08-03`.)

### 17.2 Public profile `/@username`

Paling mahal dari ketiganya karena menyentuh kontrak identitas.

- [x] Kolom `username` pada `profiles`: unik, immutable setelah diset, punya
      aturan format, dan migration untuk mengisi user yang sudah ada. (Bukti:
      `supabase/schema_092_profile_username.sql` — constraint unik, trigger
      `prevent_username_update`, fungsi `validate_username`, backfill user
      lama. Sudah diverifikasi ada di target `2026-08-02`.)
- [x] Kebijakan privasi eksplisit: apa yang boleh dilihat publik dan apa yang tidak.
      Jangan membocorkan email atau keanggotaan project privat. (Bukti: view
      `public_profiles` hanya mengekspos `id, username, full_name, avatar_url,
      created_at` — tidak ada email maupun data project.)
- [x] RLS terpisah untuk pembacaan profil publik oleh pengguna tak terautentikasi.
      (Bukti: `grant select on public.public_profiles to anon, authenticated`
      pada view yang sama, terpisah dari RLS tabel `profiles`.)
- [x] Route `/@:username` — **bukan** wildcard root `/:usernameWithAt` seperti
      App-new, karena pola itu menangkap semua URL tak dikenal dan menutup
      catch-all 404. (Bukti: `App.tsx` — `<Route path="/@:username" ... />`,
      terpisah dari catch-all `*`.)
- [x] Halaman profil publik + tautan dari mention/komentar. (Bukti:
      `frontend/src/pages/users/PublicProfilePage.tsx` untuk halamannya;
      `components/ui/CommentsPanel.tsx` sekarang merender body komentar lewat
      `helpers/renderMentions.tsx` (`renderMentions`) yang mengubah `@username`
      dikenal menjadi `<Link to="/@username">`, dan daftar "Mention:" di bawah
      body juga ditautkan ke `/@username` per profil. Diperbaiki `2026-08-03`.)

### 17.3 Landing `/` menjadi Home

- [x] Pindahkan `/` ke `HomePage`, dan daftar project ke `/projects`. (Bukti:
      `App.tsx` — `<Route path="/" element={<HomePage />} />` dan
      `<Route path="/projects" element={<ProjectsPage />} />`. Kedua route
      dikonfirmasi jalan lewat smoke Playwright terautentikasi pada audit
      Section 7.)
- [x] Perbarui seluruh tautan internal, menu, redirect guard, dan
      `NotFoundPage` yang saat ini mengarah ke `/` sebagai daftar project.
      (Bukti: `pages/NotFoundPage.tsx` — label tombol diperbaiki jadi "Ke
      Beranda" dengan tujuan `navigate('/')`, konsisten dengan `/` = `HomePage`
      sejak APPNEW-03. Menu/route lain sudah memakai `/projects` untuk daftar
      project sejak audit Section 7. Diperbaiki `2026-08-03`.)
- [x] Pastikan `/home` lama tetap bekerja atau di-redirect, agar bookmark
      pengguna tidak putus. (Bukti: `App.tsx` —
      `<Route path="/home" element={<Navigate to="/" replace />} />`
      ditambahkan di dalam `AppLayout`/`ProtectedRoute` yang sama dengan `/`.
      Ditambahkan `2026-08-03`.)
- [ ] Verifikasi dengan `./scripts/codex-loop/smoke.sh` dan E2E alur utama.
      `smoke.sh` sudah lolos (build umum). Infrastruktur Playwright kini ada
      (E2E-INFRA-01, lihat 16.6) dan smoke test `/login` + 404 sudah lolos,
      tapi E2E alur utama yang sebenarnya (login → project → ... → issue)
      masih menunggu E2E-INFRA-02 (seed data) dan E2E-INFRA-03 (skenario).

---

## 18. Catatan keputusan teknis

- Fokus utama aplikasi adalah manual software testing untuk tim kecil.
- Fitur Playwright ditambahkan setelah workflow manual dan reporting stabil.
- Fitur baru mengikuti alur:

```text
Page/Component → Hook → Service → Repository → Supabase
```

- Test Case tidak menyimpan hasil pass/fail; hasil selalu disimpan pada Test Result.
- Re-run dibuat sebagai Test Run baru.
- **MCP server adalah proses terpisah (`mcp/`), bukan layer baru di frontend.** Ia
  memakai API token/JWT dan tunduk pada RLS yang sama — MCP bukan jalur pintas
  yang melewati aturan keamanan.
- **Server pusat tetap tidak pernah menjalankan browser.** Semua mode Playwright,
  termasuk yang interaktif, berjalan di Local Runner.
- **Token repository tidak pernah plaintext di tabel dan tidak pernah sampai ke
  browser** — disimpan di Supabase Vault, diakses hanya dari Edge Function/MCP server.
- **Source code aplikasi under test tidak disimpan di server pusat.** Yang tersimpan
  hanya referensi (URL/path, branch, commit SHA).
- **AI tidak boleh meng-approve.** Review test case dan approval Test Plan selalu
  aksi manusia; setiap aksi agent tercatat di audit log dan bisa di-override.
- **Runner dan MCP dua proses sekarang, satu Local Agent nanti.** Pemisahan ini
  keputusan sadar karena target deploy pertama adalah self-hosted dan backend
  custom belum ada. Penyatuan dikerjakan setelah kriteria 14.5 terpenuhi, bukan
  sebelumnya.
- **Semua akses keluar wajib lewat adapter** (`TransportAdapter`,
  `ExecutorAdapter`, `ArtifactStorageAdapter`, `AuthAdapter`, `RepoAdapter`).
  Tidak boleh ada pemanggilan Supabase langsung di dalam `runner/` maupun `mcp/`
  di luar adapter — inilah yang membuat backend custom bisa masuk tanpa
  membongkar isi, dan membuat penyatuan agent nanti murah.
- **Yang ditempel user adalah bootstrap code, bukan token.** Sekali pakai, berumur
  pendek. Runner token asli dibuat di mesin lokal dan tidak pernah muncul di layar,
  clipboard, prompt, atau riwayat shell.
- **Nol runtime dependency pada runner dipertahankan sebagai keputusan keamanan**,
  bukan estetika. Setiap dependency adalah pintu masuk supply chain ke mesin
  developer pengguna.
- **Kepercayaan berada di level repo, bukan level file.** `npx playwright test`
  memuat `playwright.config.ts` — kode Node biasa — sebelum satu test pun jalan,
  jadi memvalidasi `script_ref` saja tidak pernah cukup.
- **`App-new.tsx` ditolak dan dihapus (SRC-13).** Penggantian berkas route
  wholesale tidak dipakai sebagai cara migrasi: yang menang adalah `App.tsx`
  aktif, dan ide dari referensi diambil sebagai fitur tersendiri (Section 17).
- **Jangan memakai wildcard root (`/:param`) untuk profil publik.** Pola itu
  menangkap setiap URL tak dikenal dan membuat catch-all 404 tidak pernah
  tercapai. Gunakan prefix eksplisit seperti `/@:username`.
- **Local runner tetap diperlukan bahkan kalau nanti ada cloud runner.** Browser
  tidak bisa dijalankan dari halaman web, sehingga pengujian aplikasi di
  `localhost`/jaringan internal selalu menuntut proses di mesin pengguna.
- **Task menulis test wajib terpisah dari task implementasi.** Bukan
  "implementasikan X lalu tulis test-nya", melainkan task tersendiri di sesi
  agent berbeda: "tulis test yang membuktikan invariant Y dari `CLAUDE.md`".
  Interpretasi berbeda memberi peluang ketidakcocokan terlihat.
- **Agent tidak memutuskan apakah fitur memenuhi requirement.** Itu tetap
  keputusan manusia. Agent hanya mengunci perilaku (regression) dan
  membuktikan invariant yang ditulis manusia.
- **Test flaky dihapus atau dikarantina, tidak dibiarkan.** Pada loop tanpa
  pengawasan, satu test yang kadang gagal akan melabeli task benar sebagai
  `blocked` dan membakar token untuk retry.
- **Sumber kebenaran test invariant adalah `CLAUDE.md` dan Section 15
  FEATURE_BACKLOG.md**, bukan pembacaan agent atas kode yang sudah ada.
- **Dogfooding E2E (TestManager menguji dirinya sendiri lewat TestManager)
  ditunda sampai produk matang**, bukan dikerjakan sekarang. Kalau aplikasi dan
  alat ujinya rusak bersamaan, tidak ada cara membedakan mana yang salah.
