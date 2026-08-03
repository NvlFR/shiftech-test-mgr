# Remaining Work

Daftar final item `FEATURE_BACKLOG.md` yang **benar-benar belum dikerjakan**,
hasil rekonsiliasi AUDIT-01 (Section 6–8), AUDIT-02 (Section 9–11), AUDIT-03
(Section 12–14), AUDIT-04 (Section 16), dan audit tambahan Section 17 yang
menyertai penyusunan dokumen ini (AUDIT-05). Setiap item hanya masuk sini
kalau reconciler-nya sudah mengecek repo dan tidak menemukan bukti file/fungsi/
migration/test yang memenuhi klaimnya — lihat `WORKLOG.md` untuk detail per
item. Ini menjadi sumber antrean berikutnya di
`scripts/codex-loop/queue.md`.

Diurutkan per tier ketergantungan: Tier 0 tidak bergantung apa pun dan boleh
dikerjakan kapan saja; tier berikutnya butuh tier sebelumnya selesai atau
keputusan/aksi manusia dulu.

## Tier 0 — Tidak ada ketergantungan, siap dikerjakan

4 bug/gap Section 17 yang ditemukan saat AUDIT-05 sudah diperbaiki
`2026-08-03` (lihat `WORKLOG.md`): label/tujuan tombol `NotFoundPage.tsx`,
redirect `/home` → `/`, sinkronisasi tema dari `useUserPreferences()` di
`AppLayout.tsx` (ternyata sudah ada dari perubahan lain, tinggal dikonfirmasi
dan dicatat), dan tautan mention/`Mention:` ke `/@username` di
`CommentsPanel.tsx` lewat `helpers/renderMentions.tsx`.

Sisa item Tier 0 lain:

- **[Section 10.4] Rotate & revoke token repository dari UI.** Backend RPC
  revoke sudah ada (AUDIT-02), tinggal disambungkan ke UI project settings +
  audit event.
- **[Section 14.1] Aturan review CI/lint yang menolak `fetch` langsung ke
  Supabase di luar adapter di `runner/`/`mcp/`.** Guard CI yang ada sekarang
  (`agent-runtime-dependencies.yml`) hanya untuk runtime dependency, bukan
  untuk pola `fetch` langsung.
- **[Section 16.4] Test untuk logika filter dan sorting** yang dipakai
  halaman list — belum ada berkas test khusus untuk ini.
- **[MCP server] Header `X-TestManager-Project-ID`/`Read-Only`/`Feature-Groups`
  tidak berfungsi — mismatch desain UI vs implementasi server.** Halaman
  Connect Agent (`projectConnectionService.ts` → `createSetupSteps`)
  men-generate command `claude mcp add` dengan header per-project/per-fitur,
  mengasumsikan satu MCP server HTTP bisa melayani banyak project/klien
  sekaligus dan membaca konfigurasi dari header tiap request. Realitanya
  `mcp/src/httpTransport.ts` & `mcp/src/config.ts` single-tenant: project ID,
  read-only, dan token semuanya cuma dibaca dari env var (`TM_PROJECT_ID`
  dkk) SEKALI saat proses start, tidak pernah dari header. Header yang
  di-generate UI murni kosmetik saat ini. **Butuh keputusan**: refactor
  `mcp/` jadi baca session config per-request dari header (effort besar,
  perlu redesign auth per-request + rate limit per-session), atau ubah UI
  Connect Agent supaya tidak lagi menjanjikan model per-header (dan
  dokumentasikan bahwa 1 proses MCP = 1 project, harus dijalankan multi
  instance kalau butuh lebih dari satu). Ditemukan `2026-08-03` saat
  memperbaiki 3 command rusak di halaman yang sama (lihat WORKLOG.md).
- **[MCP server] Proses menggantung saat startup gagal.**
  `mcp/src/index.ts` — `heartbeatTimer` (`setInterval`) dibuat sebelum
  `startHttpTransport()`/bind port dipanggil; kalau bind gagal (mis.
  `EADDRINUSE`), `main().catch()` cuma set `process.exitCode`, tidak
  `clearInterval`/`process.exit()`, jadi proses node tidak pernah keluar
  sendiri dan harus di-`kill` manual. Ditemukan `2026-08-03` saat setup MCP
  server untuk project LelangOps (lihat WORKLOG.md).
- **[Runner] `tm-runner init` menimpa `.env` di cwd tanpa peringatan kalau
  dijalankan di root repo yang sedang diuji.** `runner/src/init.ts` —
  `writePrivateConfig` me-replace SELURUH isi `.env` di `cwd`, bukan
  append/merge. Kalau user mengikuti instruksi apa adanya dan menjalankan
  `tm-runner init` langsung di root repo aplikasi (mis. Laravel app dengan
  `.env` berisi `DB_PASSWORD` dkk), file itu akan HANCUR tertimpa config
  runner. `TM_PROJECT_DIR` (field terpisah dari cwd, dibaca `loadConfig()`
  di `runner/src/config.ts`) sebenarnya sudah mendukung menjalankan runner
  dari direktori config terpisah sambil tetap mengeksekusi script di repo
  target — tapi ini tidak terdokumentasi maupun terekspos lewat CLI/UI
  Connect Agent, sehingga jalur "ikuti instruksi apa adanya" berbahaya.
  Butuh keputusan: tambah flag `--config-dir`/dokumentasi eksplisit "jangan
  jalankan init di root repo yang diuji, pakai direktori terpisah", atau
  ubah `init` supaya menolak/warning kalau cwd sudah berisi `.env` yang
  bukan miliknya. Ditemukan `2026-08-03` menjalankan Local Runner sungguhan
  untuk LelangOps (lihat WORKLOG.md).

4 bug produksi baru di pipeline automation, ditemukan & **sudah diperbaiki**
`2026-08-03` menjalankan satu automation job sungguhan end-to-end untuk
project LelangOps (lihat WORKLOG.md untuk detail): `set_test_run_code()`
gagal total untuk test run ad-hoc/custom (project via `custom_project_id`,
bukan lewat test plan) sehingga `mcp_enqueue_automation` untuk 1 Test Case
selalu gagal sejak fitur automation dibuat; `poll_automation_job()` dan
`poll_automation_job_commands()` kehilangan schema `extensions` di
`search_path`-nya (regresi dari `schema_069_pw19_step_commands.sql`)
sehingga SEMUA Local Runner di SEMUA project tidak pernah bisa poll job;
`mcp_complete_test_run()` tidak bisa menyelesaikan run ad-hoc/custom karena
JOIN-nya cuma lewat `test_plans`; `set_issue_code()` bug yang sama persis —
Issue dari Test Result milik ad-hoc/custom run gagal total, jadi
`testmanager.issue.create` tidak pernah bisa dipakai untuk melaporkan bug
yang ditemukan lewat automation run. Fix: `schema_097`, `schema_098`,
`schema_099`, `schema_100`, `schema_101`.

## Tier 1 — Infrastruktur E2E (prasyarat untuk beberapa item di tier berikutnya)

Urutan wajib di dalam tier ini: pasang dulu → seed data → baru tulis skenario.

1. ~~**E2E-INFRA-01** — Pasang Playwright~~ **Selesai `2026-08-03`.**
   `@playwright/test` terpasang, `frontend/playwright.config.ts` (jalan di
   atas `vite preview`), skrip `npm run test:e2e`, folder `frontend/e2e/`
   dengan 2 smoke test (route `/login` tanpa auth, catch-all 404) — keduanya
   lolos. Login masih lewat email/password (`signInWithPassword`), BUKAN
   Google OAuth sesuai CLAUDE.md — lihat catatan di bawah, ini membatasi
   skenario E2E terautentikasi sampai keputusan diambil.
2. ~~**E2E-INFRA-02** — Seed data deterministik~~ **Selesai `2026-08-03`.**
   `supabase/seed_e2e.sql` — idempoten, bisa dijalankan ulang sebagai skrip
   reset (delete cascade project fixture lalu insert ulang) kapan saja
   sebelum sesi E2E. Diverifikasi lewat login sungguhan +
   `frontend/e2e/smoke.spec.ts`. Perlu MCP Supabase / SQL Editor (service
   role) untuk menjalankannya — tidak bisa dari anon key di `.env` frontend,
   jadi belum otomatis jalan sebelum tiap `npm run test:e2e` (tidak ada CI
   dengan service role key tersimpan aman). Sampai itu ada, jalankan manual.
3. ~~**E2E-INFRA-03** — Tulis E2E alur utama~~ **Selesai `2026-08-03`.**
   `frontend/e2e/main-flow.spec.ts` lolos: login → project → test case → test
   plan → run → hasil FAIL → issue. Menulis skenario ini membongkar 3 bug
   RLS/permission produksi nyata (lihat catatan Tier 3 "[Bug RLS]" di bawah)
   yang tidak pernah ketahuan sebelumnya karena testing manual selalu pakai
   akun admin.

**Bug RLS/permission ditemukan & sudah diperbaiki saat menulis E2E-INFRA-03**
(bukan item terbuka, dicatat untuk konteks — detail di WORKLOG.md
2026-08-03):
- `schema_094`/`schema_095` — user non-admin tidak bisa membuat project sama
  sekali (RLS SELECT gagal saat `RETURNING` karena `owner_id` di-set trigger
  `AFTER INSERT`, terlambat untuk evaluasi RETURNING; pindah ke `BEFORE
  INSERT` + tambah `owner_id = auth.uid()` ke policy select).
- `schema_096` — pemilik project baru cuma dapat permission view-only pada
  project miliknya sendiri (trigger `handle_new_project()` tidak mengisi
  kolom `permissions` sesuai `DEFAULT_PROJECT_PERMISSIONS.manager` di
  frontend).

## Tier 2 — Bergantung pada Tier 1 selesai

- **[Section 17.3]** Verifikasi APPNEW-03 (landing `/` → Home) dengan E2E alur
  utama — bagian smoke-nya sudah lolos, bagian E2E-nya menunggu Tier 1.
- **[Section 11.9]** "Satu requirement bisa berjalan dari teks sampai
  `verified` tanpa langkah manual" — kriteria acceptance end-to-end alur AI QA
  loop, paling praktis dibuktikan lewat skenario E2E dari Tier 1.

## Tier 3 — Independen tapi butuh effort lebih besar atau keputusan manusia

Tidak saling bergantung satu sama lain; masing-masing bisa dikerjakan kapan
saja setelah Tier 0, tapi lebih besar/mahal daripada quick fix:

- **[Section 16.7]** Tulis test invariant untuk **tiap** fitur berisiko
  tinggi di `docs/TEST_DEBT.md` (P0), lalu perbaiki bila gagal. Baru sebagian
  (20 berkas test sudah ada dan mencakup banyak invariant Tier 1/domain),
  tapi belum ada bukti seluruh item P0 di `TEST_DEBT.md` sudah tuntas diuji
  satu per satu.
- **[Section 11.7]** AI memantau Issue berstatus `resolved` yang belum
  diverifikasi (proses otomatis/terjadwal, bukan on-demand seperti
  `mcp_verify_regression` yang sudah ada).
- **[Section 10.3]** GitHub App installation token sebagai alternatif PAT
  untuk tim — PAT (jalur saat ini) tetap berfungsi, ini peningkatan opsional.
- **[Section 10.5]** Opsional: sinkronisasi dua arah Issue TestManager ↔
  GitHub Issue (link, bukan copy). Butuh keputusan scope.
- **[Auth] `LoginPage.tsx` pakai email/password (`signInWithPassword`), bukan
  Google OAuth.** Ditemukan saat menulis smoke test E2E-INFRA-01: tidak ada
  tombol/alur Google OAuth di mana pun di `frontend/src/pages/auth/` atau
  `hooks/useAuth.tsx` — hanya `signInWithPassword`. Ini bertentangan langsung
  dengan CLAUDE.md ("Login **hanya via Google OAuth** ... tidak ada
  email/password"). Butuh keputusan manusia: apakah ini penyimpangan sengaja
  untuk memudahkan E2E/dev (masuk akal karena Google OAuth tidak bisa
  diotomasi, lihat `docs/MANUAL_SMOKE.md`) yang perlu didokumentasikan ulang
  di CLAUDE.md, atau benar-benar regresi dari kontrak auth yang harus
  diperbaiki balik ke Google-only.
- **[Section 12.5]** Opsional: user menyimpan prompt sendiri per project.
  Butuh tabel baru — **butuh keputusan produk dulu** apakah masuk scope
  tahap 1 sebelum dikerjakan.
- **[Section 14.2]** Menyatukan format token dan mekanisme pencabutan antara
  runner (`automation_runner_token`) dan MCP (`api_tokens`) — saat ini dua
  tabel/format berbeda.
- **[Section 14.3]** Publikasi paket `@testmanager/runner` wajib memakai npm
  provenance + 2FA — ini aksi publish manusia saat rilis pertama terjadi,
  bukan pekerjaan kode.

## Tier 4 — Masa depan, memang belum saatnya dikerjakan

Bukan utang — ini kriteria yang secara sadar ditunda sampai prasyaratnya ada
(lihat Section 18 Catatan keputusan teknis):

- **[Section 14.5]** 5 kriteria penyatuan Runner + MCP jadi satu Local Agent.
  Bergantung pada: backend custom sudah ada (belum ada sama sekali — masih
  eksperimental di `backend/`), Section 14.1–14.2 tuntas (14.1 hampir tuntas,
  14.2 di Tier 3 atas), dan jalur migrasi untuk pemasangan lama.
- **[Section 16.8]** Dogfooding — E2E TestManager dijalankan memakai
  TestManager sendiri. Eksplisit ditunda: kalau aplikasi dan alat ujinya
  rusak bersamaan, tidak ada cara membedakan mana yang salah. Dikerjakan
  setelah produk matang.

## Di luar cakupan audit ini

Section 1–5 dan Section 15 (urutan implementasi yang disarankan) belum masuk
siklus AUDIT-01..05 manapun — bukan berarti sudah selesai atau belum, hanya
belum direkonsiliasi. Kalau dibutuhkan, itu jadi AUDIT-06 terpisah.
