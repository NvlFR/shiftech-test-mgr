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

- [ ] **SRC-09 — `pages/pages-new`**
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

- [ ] **SRC-12 — `types/domain-new`**
  Bandingkan seluruh type dengan `types/domain.ts`, gabungkan field yang valid,
  hapus duplikasi, dan pastikan mapper/repository/service memakai satu sumber
  domain aktif.

- [ ] **SRC-13 — `App-new.tsx`**
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

- [ ] Tidak ada folder source-new yang masih dikecualikan TypeScript tanpa
  alasan tertulis di `WORKLOG.md`.
- [ ] Seluruh route aktif dapat dibuka tanpa error console utama.
- [ ] `npx tsc -b --force`, `npm run build`, `npm run lint`, dan
  `git diff --check` lulus.
- [ ] Smoke test auth, project, test case, test plan, test run, issue, suite,
  notification, profile, import/export, AI, dan attachment lulus.
- [ ] Migration Supabase sudah dijalankan dan diverifikasi pada target.
- [ ] Tidak ada fitur existing yang terhapus atau kehilangan akses RBAC.
- [ ] `WORKLOG.md`, `FEATURES.md`, dan `TODO.md` sudah diperbarui.

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

- [ ] Scaffold `mcp/` — Node 20+, TypeScript, MCP SDK, transport **stdio** (dev lokal).
- [x] Transport **HTTP/SSE** untuk pemakaian remote/self-hosted.
- [ ] Autentikasi: API token TestManager (reuse tabel token P2) atau Supabase JWT.
      Token disimpan di env (`TM_API_TOKEN`), tidak pernah di argumen tool.
- [ ] **Project scoping wajib**: satu sesi MCP terikat pada satu `project_id`;
      semua tool menolak akses lintas project (dijaga RLS, divalidasi ulang di server).
- [x] Rate limit + audit: setiap pemanggilan tool tercatat di `ai_audit_events`
      (tool name, latency, status — bukan payload mentah).
- [ ] Mode **read-only** (flag `TM_MCP_READONLY=1`) supaya agent bisa dipakai untuk
      analisis tanpa risiko menulis data.
- [ ] Dokumentasi setup di `docs/MCP_SERVER.md` + contoh konfigurasi client
      (`claude_desktop_config.json`, `.mcp.json`).

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

- [ ] `testcase.create_bulk` — import banyak test case sekaligus (dipakai alur CSV, §11).
- [ ] `testcase.update`, `testcase.duplicate`, `testcase.archive`.
- [ ] `testplan.create`, `testplan.add_cases`, `testplan.remove_cases`.
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

- [ ] Tool **destruktif** (hapus project, hapus test case, hapus run) tidak diekspos
      sama sekali di MCP — hanya lewat UI.
- [ ] Semua output AI tetap berstatus `draft`/`review_only`; approval selalu manusia.
- [ ] Pagination + batas ukuran response supaya tidak meledakkan context agent.
- [ ] Error terstruktur (`code`, `message`, `hint`) agar agent bisa recover sendiri.

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

- [ ] `--headed` — jalankan dengan browser terlihat, opsional `--slow-mo` untuk demo.
- [ ] Mode **UI Mode** (`playwright test --ui`) untuk eksplorasi & re-run per test.
- [ ] Mode **debug** (`PWDEBUG=1` / `--debug`) dengan Playwright Inspector, breakpoint
      per step.
- [ ] `--watch` — re-run otomatis saat file test berubah (loop authoring cepat).
- [ ] Pilih browser & device profile saat run (`chromium|firefox|webkit`, emulasi mobile).
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

- [ ] Tabel `project_repositories` — satu project bisa punya >1 repo (mis. FE + BE):
      `id`, `project_id`, `name`, `source_type`, `url_or_path`, `default_branch`,
      `credential_id`, `subdirectory`, `is_active`, timestamps.
- [ ] `source_type`: `local_path` | `github_public` | `github_private` | `git_url`.
- [ ] Domain type + row mapper mengikuti konvensi repo (`snake_case` → `camelCase`).

### 10.2 Mode `local_path`

- [ ] Isi path absolut di mesin runner (mis. `/home/tester/app`) — dipakai runner dan
      MCP server yang jalan di mesin yang sama.
- [ ] Validasi: path ada, terbaca, dan merupakan git repo (`.git` terdeteksi).
- [ ] Baca metadata git lokal: branch aktif, commit SHA, dirty/clean.
- [ ] **Tidak** dikirim ke server pusat sebagai isi file — hanya path + metadata.
      Server pusat tidak pernah menyimpan source code.

### 10.3 Mode GitHub (public & private)

- [ ] Repo public: cukup URL, akses read tanpa kredensial.
- [ ] Repo private: **Personal Access Token (fine-grained)** dengan scope minimal
      `contents: read` (+ `metadata: read`), opsional `issues: write` untuk sinkronisasi Issue.
- [ ] Alternatif yang lebih aman untuk tim: **GitHub App installation token**
      (auto-expire, per-repo) — didukung sebagai opsi kedua.
- [ ] Uji koneksi ("Test connection") saat menyimpan: tampilkan nama repo, default
      branch, dan permission yang terdeteksi.
- [ ] Dukungan self-hosted GitHub Enterprise / GitLab lewat `git_url` + token generik.

### 10.4 Penyimpanan kredensial (kritis)

- [ ] Token **tidak pernah** disimpan plaintext di tabel dan **tidak pernah** dikirim
      ke browser. Disimpan di **Supabase Vault**, tabel hanya menyimpan `credential_id`.
- [ ] Akses token hanya dari Edge Function / MCP server (service context), bukan dari
      frontend.
- [ ] UI hanya menampilkan mask (`ghp_••••••abcd`), tanggal dibuat, dan tanggal
      kedaluwarsa; nilai penuh tidak bisa dibaca ulang setelah disimpan.
- [ ] Rotate & revoke token dari UI project settings; audit event tercatat.
- [ ] RLS: hanya admin project yang bisa membuat/mengubah kredensial repo.
- [ ] Peringatan eksplisit di UI kalau token yang dipakai punya scope berlebihan.

### 10.5 Pemanfaatan

- [ ] **Konteks AI**: `repo.read_file` / `repo.search` (§8.2) memberi AI potongan kode
      relevan saat generate test case — hasil jauh lebih akurat daripada dari
      requirement teks saja.
- [ ] **Sumber automation script**: `script_ref` bisa menunjuk file di repo; runner
      melakukan clone/pull (private repo memakai token) sebelum eksekusi.
- [ ] **Traceability commit**: Test Run menyimpan `commit_sha` + `branch`; Issue
      menampilkan commit yang diuji.
- [ ] **Regression selection**: `repo.diff` antara commit terakhir yang lulus dan
      commit sekarang → petakan file berubah ke Test Case (via module/tag/path mapping)
      → hanya test itu yang di-enqueue ulang (§11).
- [ ] Opsional: sinkronisasi dua arah Issue TestManager ↔ GitHub Issue (link, bukan copy).

### 10.6 UI

- [ ] Tab **Repository** di Project Settings: daftar repo, tambah/edit/hapus, test
      connection, status koneksi terakhir.
- [ ] Indikator di Test Run: repo + branch + commit yang diuji.

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

- [ ] Input requirement: teks bebas, file (Excel/CSV/dokumen), atau **link repo**
      (§10) untuk konteks kode.
- [ ] AI menghasilkan draft test case dalam **format CSV yang kolomnya persis sama**
      dengan template import yang sudah ada (`title`, `objective`, `precondition`,
      `steps`, `expected_result`, `priority`, `module`, `tags`).
- [ ] Sertakan skenario negatif & edge case, bukan hanya happy path.
- [ ] Setiap baris membawa `requirement_ref` supaya traceability langsung terbentuk.
- [x] Preview CSV di UI sebelum diunduh/diimpor.

### 11.2 Tahap 2 — Import & review manusia (gate wajib)

- [ ] Import CSV masuk sebagai draft dengan penanda `source = ai`, bukan langsung aktif.
- [ ] Halaman review: bulk approve/reject/edit, target **5–10 menit** untuk satu batch.
- [x] Deteksi duplikat terhadap test case yang sudah ada sebelum menyimpan.
- [ ] **Tidak ada jalur bypass**: AI tidak bisa menandai test case sebagai approved,
      dan tidak bisa meng-approve Test Plan. Approver tercatat di audit log.

### 11.3 Tahap 3 — Test Plan disetujui → Test Run dijalankan AI

- [x] Test Plan dibentuk dari test case yang lolos review; status approval eksplisit.
- [ ] AI (via MCP `testrun.create` + `automation.enqueue`) membuat **Test Run baru**
      dan mengantre job automation. Test case yang belum punya script tetap muncul
      sebagai eksekusi manual — AI tidak boleh menebak hasilnya.
- [ ] Runner lokal mengeksekusi; status job terpantau real-time di UI.
- [ ] Test Run menyimpan environment, browser, build version, branch, commit SHA.

### 11.4 Tahap 4 — Kegagalan → bukti lengkap

- [ ] Setiap `test_result` FAIL membawa bundle bukti §9.3 secara utuh (screenshot,
      video, console, network/HAR, DOM snapshot, trace).
- [ ] Artifact tersimpan di Storage dengan retention sesuai kebijakan Section 3.
- [x] Bukti dapat dibuka langsung dari halaman Test Result, tanpa unduh manual.

### 11.5 Tahap 5 — AI membuat Issue

- [ ] Issue dibuat dari `test_result` FAIL, **wajib** membawa relasi
      `test_result_id` → `test_run_id` + `test_case_id`.
- [ ] Isi otomatis: langkah reproduksi (dari steps), actual vs expected, ringkasan
      error, tautan ke semua artifact, environment + commit SHA.
- [ ] Duplicate detection dijalankan lebih dulu: kalau kandidat duplikat ditemukan,
      AI menambah **komentar pada Issue lama** alih-alih membuat Issue baru.
- [ ] Issue hasil AI berstatus draft sampai diverifikasi manusia (konsisten Section 4).

### 11.6 Tahap 6 — Developer memperbaiki

- [ ] Issue menampilkan konteks kode dari repo (file/commit terkait) bila tersedia.
- [ ] Perubahan status Issue ke `resolved` memicu event (webhook/notifikasi).
- [ ] Opsional: link commit/PR yang mengklaim memperbaiki Issue.

### 11.7 Tahap 7 — Regression selektif

- [ ] AI memantau Issue berstatus `resolved` yang belum diverifikasi.
- [ ] **Pemilihan test yang relevan** (bukan seluruh suite), dari gabungan sinyal:
      1. Test Case yang tertaut langsung ke Issue tersebut.
      2. Test Case satu module/tag dengan yang gagal.
      3. Test Case yang tertaut ke requirement yang sama.
      4. Test Case yang terdampak `repo.diff` commit perbaikan (§10.5).
- [ ] Enqueue **Test Run regression baru** (tidak pernah menimpa run lama).
- [ ] Batas aman: kalau jumlah test terpilih melebihi ambang, minta konfirmasi manusia.

### 11.8 Tahap 8 — Verifikasi

- [ ] PASS → Issue ditandai `verified`, dengan tautan ke Test Run pembuktinya.
- [ ] FAIL → Issue **tetap terbuka**, AI menambah komentar berisi bukti baru dan
      perbandingan dengan kegagalan sebelumnya (regresi lama vs baru).
- [ ] Status `verified` boleh di-set AI, tapi tercatat sebagai aksi agent di audit log
      dan bisa di-override manusia.
- [ ] Dashboard menampilkan siklus: berapa Issue masuk loop, berapa yang verified,
      berapa yang bolak-balik (reopen rate).

### 11.9 Kriteria selesai (definition of done alur ini)

- [ ] Satu requirement bisa berjalan dari teks sampai `verified` tanpa langkah manual
      selain **review test case** dan **approve test plan**.
- [ ] Tidak ada tahap yang membuat AI mengubah data resmi tanpa jejak audit.
- [ ] Seluruh eksekusi browser tetap terjadi di Local Runner, bukan server pusat.

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

- [ ] Route `/projects/:id/connect` + tombol **Connect Agent** di Project Detail
      dan Project Settings.
- [ ] Tab bar mode koneksi, meniru struktur Supabase — tahap 1 hanya **MCP** yang
      aktif; sisanya placeholder disabled dengan label alasan:
      `MCP (aktif)` · `API Token` · `Webhook` · `CI/CD` · `Runner`.
- [ ] Semua nilai yang ditampilkan **project-scoped**: project id, nama, dan URL
      diambil dari project yang sedang dibuka, bukan diketik user.
- [ ] Halaman ini read-only terhadap data project — ia hanya membaca konfigurasi
      dan membuat token; tidak mengubah test case/plan/run apa pun.

### 12.2 Panel konfigurasi MCP

- [ ] **Client selector** — dropdown. Tahap 1: `Claude Code` (satu-satunya
      enabled). Entri `Cursor`, `Claude Desktop`, `VS Code`, `Windsurf` tampil
      disabled + badge "segera".
- [ ] **Read-only toggle** — memetakan langsung ke `TM_MCP_READONLY=1` (Section
      8.1). Saat aktif, tool tulis tidak diregistrasikan sama sekali, dan UI
      menampilkan berapa tool yang akan tersedia.
- [ ] **Feature groups** — multiselect chip yang memilih grup tool mana yang
      diaktifkan, memakai pengelompokan Section 8.2:
      `DISCOVERY` · `TEST-CASE` · `TEST-PLAN` · `TEST-RUN` · `ISSUE` ·
      `AUTOMATION` · `REPO` · `ANALYSIS` · `DOCS`.
- [ ] Grup yang berat/berisiko (`AUTOMATION`, `REPO`) **off secara default** —
      alasan sama dengan Supabase mematikan Storage: menjaga jumlah tool tetap
      terkelola dan mengurangi permukaan risiko.
- [ ] Penghitung live: "N tool akan aktif" + peringatan kalau N melewati ambang
      yang bikin context agent membengkak.
- [ ] Preview daftar nama tool yang akan teregistrasi, bisa dilipat.

### 12.3 Langkah bernomor + perintah siap salin

- [ ] **Langkah 1 — Add MCP server.** Menghasilkan perintah lengkap, contoh
      bentuknya:
      `claude mcp add --scope project --transport http testmanager <url>`
      dengan URL dan header yang sudah terisi sesuai project + opsi terpilih.
- [ ] **Langkah 2 — Authenticate.** Instruksi `claude /mcp` lalu pilih server dan
      jalankan flow auth. Sertakan catatan bahwa ini harus dijalankan di terminal
      biasa, bukan di dalam ekstensi IDE.
- [ ] **Langkah 3 — Install Agent Skills (opsional).** Perintah pemasangan skill
      pack TestManager (lihat 12.4).
- [ ] Tombol **Copy** per langkah + tombol **Copy semua** di header panel.
- [ ] Setiap perintah yang disalin ikut menyesuaikan pilihan read-only dan feature
      group — bukan template statis.
- [ ] Blok perintah bisa di-scroll horizontal dan tidak pernah memotong isi
      diam-diam (perintah terpotong = user menempel perintah rusak).

### 12.4 Agent Skills pack

Skill = instruksi + resource siap pakai supaya agent memakai TestManager dengan
benar tanpa harus diajari ulang tiap sesi.

- [ ] Folder `skills/` berisi skill pack TestManager, dapat dipasang ke project
      user (pola `npx skills add ...` atau salin ke `.claude/skills/`).
- [ ] Skill **`testmanager-workflow`** — aturan main domain: re-run selalu Test Run
      baru, Test Case tidak pernah menyimpan hasil, Issue hanya dari Test Result
      FAIL, approval selalu manusia.
- [ ] Skill **`testmanager-authoring`** — cara menulis Test Case yang baik:
      struktur steps, expected result, skenario negatif, edge case.
- [ ] Skill **`testmanager-triage`** — cara membaca Test Run gagal, membaca bundle
      bukti, dan menyusun Issue yang actionable.
- [ ] Skill **`testmanager-regression`** — cara memilih test regression yang
      relevan (sinyal Section 11.7) dan kapan harus minta konfirmasi manusia.
- [ ] Halaman menampilkan daftar skill + deskripsi singkat, dengan checkbox mana
      yang ikut dipasang.
- [ ] Skill pack diversipkan dan dicatat versinya, supaya bisa diperbarui tanpa
      menebak-nebak.

### 12.5 Prompt starter

- [ ] Panel **Prompt** berisi prompt siap pakai yang sudah terisi konteks project
      (nama, id, module, environment aktif).
- [ ] Kategori prompt minimal: *generate test case dari requirement*, *analisis
      Test Run terakhir*, *triage Issue terbuka*, *pilih regression untuk Issue
      resolved*, *audit coverage requirement*.
- [ ] Tombol **Copy prompt** per item (sejajar dengan tombol "Copy prompt" di pola
      Supabase).
- [ ] Prompt disimpan sebagai data, bukan hardcode di komponen, supaya bisa
      ditambah tanpa menyentuh UI.
- [ ] Opsional: user bisa menyimpan prompt sendiri per project (butuh tabel baru —
      putuskan dulu apakah masuk scope tahap 1).

### 12.6 Keamanan (jangan dilewat)

- [ ] Token **tidak pernah ditanam di dalam string perintah yang ditampilkan**.
      Perintah yang disalin merujuk ke variabel environment atau flow auth
      interaktif; kalau token harus muncul, tampilkan sekali dengan peringatan
      eksplisit.
- [ ] Alasannya: perintah yang ditempel ke shell masuk ke `~/.bash_history`, dan
      screenshot halaman ini akan beredar di grup chat. Dua-duanya membocorkan
      token permanen.
- [ ] Token yang dibuat dari halaman ini **project-scoped**, punya masa berlaku,
      dan bisa dicabut dari halaman yang sama.
- [ ] Tampilkan daftar token aktif yang pernah dibuat lewat halaman ini beserta
      pemakaian terakhir, supaya token menganggur bisa dicabut.
- [ ] Pembuatan/pencabutan token tercatat di audit log.
- [ ] Peringatan eksplisit saat read-only dimatikan: agent akan bisa menulis data
      project.

### 12.7 Kualitas UI

- [ ] Status koneksi: deteksi apakah project ini sudah pernah dipakai lewat MCP
      (dari `ai_audit_events`) dan tampilkan "terakhir dipakai <waktu>".
- [ ] Empty state yang mengajari, bukan sekadar "belum ada data".
- [ ] Seluruh perintah punya fallback teks yang bisa diseleksi manual kalau
      clipboard API diblokir browser.
- [ ] Konsisten dengan `PageHeader` dan tema light/dark yang sudah ada.

---

### 12.8 Bootstrap runner lewat agent (satu perintah)

Tester tidak boleh disuruh membuka dokumentasi terpisah untuk memasang runner.
Dari sudut pandang agent, memasang dan menyambungkan runner harus **satu
perintah**, dan prompt di halaman Connect yang membawanya.

- [ ] Prompt starter menyertakan varian **"Pasang & sambungkan runner"** yang
      menginstruksikan agent memasang Local Runner lalu menyambungkannya ke
      project ini.
- [ ] Perintah yang dihasilkan berbentuk satu baris, contoh bentuknya:
      `npx @testmanager/runner init --code <BOOTSTRAP_CODE>`
- [ ] `BOOTSTRAP_CODE` adalah **kode sekali pakai berumur pendek** (default 10
      menit), bukan runner token. Lihat 14.4 — ini yang membuat perintahnya aman
      ditempel ke prompt, di-screenshot, atau dikirim lewat chat.
- [ ] Setelah `init` berhasil, halaman Connect mendeteksi heartbeat pertama dan
      berpindah sendiri ke status "Runner terhubung" (sinkron dengan wizard 13.1 —
      satu alur, bukan dua yang mirip).
- [ ] Agent diberi tahu apa yang harus dilaporkan balik ke user: nama runner,
      label, dan project yang tersambung. Tidak boleh menampilkan token.
- [ ] Skill `testmanager-workflow` (12.4) memuat instruksi setup runner ini,
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

- [ ] Wizard **"Hubungkan Runner"** berlangkah: beri nama runner → pilih label
      kapabilitas → dapatkan token sekali tampil → salin perintah instalasi →
      halaman menunggu heartbeat pertama dan mengonfirmasi "Runner terhubung".
- [ ] Deteksi otomatis heartbeat pertama tanpa perlu refresh manual.
- [ ] Perintah instalasi siap salin untuk dua jalur: **npm** (`npm install` +
      `npm start`) dan **Docker** (`docker run` dengan `--env-file`).
- [ ] Empty state di tab Runner yang mengarah langsung ke wizard, bukan tabel kosong.
- [ ] Penjelasan singkat satu paragraf di halaman: kenapa runner harus di mesin
      lokal dan kenapa tidak perlu buka port.

### 13.2 Status runner yang terbaca

- [ ] Indikator status jelas: `Online` · `Idle` · `Sibuk` · `Offline`, dengan
      warna dan waktu heartbeat terakhir dalam bahasa manusia ("2 menit lalu").
- [ ] Kartu runner (bukan hanya baris tabel) di layar lebar: nama, label, versi
      runner, OS, browser tersedia, job terakhir, dan uptime.
- [ ] Peringatan kalau runner offline > ambang tertentu padahal masih ada job antre.
- [ ] Tombol rotate/revoke token per runner dengan konfirmasi eksplisit.
- [ ] Tampilkan **kenapa** sebuah job tidak diambil runner mana pun (label tidak
      cocok, semua runner offline, atau environment tidak terjangkau) — ini
      penyebab kebingungan paling umum pada pola pull-based.

### 13.3 Papan job

- [ ] Tampilan papan berkolom status: `Queued` → `Running` → `Passed`/`Failed`,
      sebagai alternatif tabel.
- [ ] Progres per job: langkah yang sedang jalan, durasi berjalan, dan perkiraan
      selesai berdasarkan run sebelumnya.
- [ ] Live log streaming saat job `running` (bergantung pada Section 9.4).
- [ ] Filter cepat: per runner, per environment, per test plan, per status.
- [ ] Aksi baris: batalkan job antre, ulangi job gagal, buka Test Result terkait.
- [ ] Badge jumlah job antre di menu sidebar supaya terlihat tanpa membuka halaman.

### 13.4 Mapping script yang tidak membingungkan

- [ ] Tampilkan Test Case yang **belum** punya script secara menonjol — inilah
      pekerjaan yang tersisa, bukan daftar yang sudah selesai.
- [ ] Validasi `script_ref` saat disimpan: beri tahu kalau file tidak ditemukan di
      runner mana pun yang online.
- [ ] Bulk mapping: pilih banyak Test Case sekaligus lalu petakan berdasarkan pola
      penamaan file.
- [ ] Tampilkan label runner yang dibutuhkan beserta runner mana yang memenuhi,
      dievaluasi saat itu juga.

### 13.5 Diagnostik & troubleshooting

- [ ] Panel **Diagnostik** per runner: hasil sanity check terakhir (base URL
      reachable, browser terpasang, versi Playwright, ruang disk).
- [ ] Daftar penyebab kegagalan umum beserta cara memperbaikinya, ditampilkan
      kontekstual saat kondisinya terdeteksi — bukan halaman FAQ terpisah.
- [ ] Tombol "Uji koneksi" yang mengirim job no-op ke runner untuk membuktikan
      jalur end-to-end hidup.
- [ ] Tampilkan versi runner dan peringatkan kalau tertinggal dari versi server.

### 13.6 Responsif & konsisten

- [ ] Layout mobile: kartu, bukan tabel yang harus digeser horizontal.
- [ ] Ikuti konvensi `PageHeader` untuk halaman list (lihat CLAUDE.md) dan tema
      light/dark.
- [ ] Semua state (loading, kosong, error, offline) punya tampilan yang dirancang,
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

- [ ] **`TransportAdapter`** — cara bicara ke server pusat.
      `SupabaseRpcTransport` (sekarang) → `BackendHttpTransport` (setelah backend ada).
      Tidak boleh ada pemanggilan Supabase langsung di luar adapter ini.
- [ ] **`ExecutorAdapter`** — cara menjalankan test.
      `PlaywrightLocalExecutor` (sekarang) → `CloudExecutor` (kalau cloud runner jadi).
- [ ] **`ArtifactStorageAdapter`** — tempat menyimpan bukti.
      `SupabaseStorage` (sekarang) → `S3`/`MinIO`/`BackendUpload`.
- [ ] **`AuthAdapter`** — cara runner membuktikan identitas.
      `RunnerTokenAuth` (sekarang) → OAuth device flow / mTLS (kalau jadi SaaS).
- [ ] **`RepoAdapter`** — cara membaca source (Section 10).
      `LocalPathRepo` · `GitCloneRepo` — dipakai bersama oleh runner dan MCP.
- [ ] Kontrak adapter didefinisikan di satu paket bersama (`packages/agent-core`
      atau sejenis) yang diimpor `runner/` dan `mcp/`, sehingga saat disatukan
      tinggal menggabungkan entry point.
- [ ] Aturan review: PR yang menambah `fetch` ke Supabase di luar adapter ditolak.

### 14.2 Jahitan bersama sejak sekarang

Yang harus sudah dipakai bareng oleh `runner/` dan `mcp/` sebelum penyatuan:

- [ ] Konfigurasi: satu skema env dengan prefix `TM_`, satu loader, satu validator.
- [ ] Identitas: satu format token dan satu mekanisme pencabutan.
- [ ] Logging: format sama, dengan **redaksi rahasia terpusat** (14.4).
- [ ] Telemetri/heartbeat: satu bentuk payload, sehingga server melihat satu jenis
      "agent" walau saat ini datang dari dua proses.
- [ ] Versioning: `runner/` dan `mcp/` dirilis dengan nomor versi yang sama.

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

- [ ] Jalur `npx` didahulukan: tidak ada instalasi permanen, selalu versi terbaru,
      paling sedikit langkahnya.
- [ ] Tarball self-hosted disajikan oleh instance itu sendiri beserta **SHA256**
      yang ditampilkan di halaman Connect, supaya bisa diverifikasi.
- [ ] **Tidak memakai `curl | bash`** selama belum ada penandatanganan rilis.
      Kalau nanti dipakai, wajib: domain sendiri, binary tertandatangani,
      checksum dipublikasikan, dan script bisa diunduh dulu sebelum dijalankan.
- [ ] **Nol runtime dependency dipertahankan.** Ini bukan estetika — setiap
      dependency adalah pintu masuk supply chain ke mesin developer pelanggan.
      Penambahan dependency harus keputusan sadar dan tercatat.
- [ ] Publikasi paket wajib memakai npm provenance + 2FA.
- [ ] Catat matriks kompatibilitas versi runner ↔ versi server, dan runner
      memperingatkan kalau tertinggal terlalu jauh.
- [ ] Catatan Docker: dari dalam container, `localhost` adalah container itu
      sendiri. Untuk menguji aplikasi di host perlu `--network host` (Linux) atau
      `host.docker.internal`. Docker karena itu **bukan** jalur default untuk
      laptop tester.

### 14.4 Setup yang tidak membocorkan rahasia

Ini syarat utama yang harus dipenuhi supaya "satu perintah" (12.8) tidak berubah
jadi kebocoran token.

- [ ] **Bootstrap code**, bukan token, yang ditampilkan dan ditempel:
      sekali pakai, berumur pendek (default 10 menit), hanya berwenang menukar diri
      menjadi runner token, dan mati begitu dipakai.
- [ ] Runner token asli **dibuat di sisi mesin lokal** hasil penukaran bootstrap
      code, lalu ditulis ke file konfigurasi dengan permission `0600`. Token tidak
      pernah muncul di layar, di prompt, di clipboard, maupun di riwayat shell.
- [ ] Alasan desain ini ditulis eksplisit: perintah yang ditempel masuk ke
      `~/.bash_history`, dan halaman Connect akan di-screenshot lalu dibagikan.
      Dua hal itu membocorkan token permanen, tapi tidak membocorkan bootstrap code
      yang sudah kedaluwarsa.
- [ ] Redaksi terpusat: token, bootstrap code, dan kredensial repo di-mask di
      seluruh log runner, MCP, dan output error — termasuk saat crash.
- [ ] `.env` runner masuk `.gitignore` bawaan template, dan runner menolak jalan
      kalau file konfigurasinya world-readable.
- [ ] Token per runner dapat dicabut dan dirotasi dari UI; pencabutan langsung
      berlaku pada poll berikutnya.
- [ ] Peringatan eksplisit saat setup: **runner menjalankan kode dari repo yang
      kamu tautkan, di mesin ini**. Ini batas kepercayaan yang wajar, tapi harus
      dinyatakan, bukan diasumsikan.
- [ ] Trust repo eksplisit sekali di sisi runner (pola "trust this folder"), dan
      runner menolak `script_ref` di luar repo yang di-trust.
- [ ] Catatan yang mudah terlewat: `npx playwright test` **memuat
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

## 16. Catatan keputusan teknis

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
- **Local runner tetap diperlukan bahkan kalau nanti ada cloud runner.** Browser
  tidak bisa dijalankan dari halaman web, sehingga pengujian aplikasi di
  `localhost`/jaringan internal selalu menuntut proses di mesin pengguna.
