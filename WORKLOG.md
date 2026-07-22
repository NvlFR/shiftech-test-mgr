# Worklog

Catatan perubahan dan pekerjaan pada project TestManager.

## 2026-07-22 — P2 Reporting, Integrasi, Backup, Retention, dan QA final

- Implementation plan dibuat sebelum coding. Graphify wajib dijalankan dengan
  query P2 architecture, query dashboard reporting, dan path TestRun ke Issue.
- Lima sub-agent paralel digunakan: Dashboard Trend/Reporting; API Token/Webhook;
  CI/CD; Backup/Restore dan Data Retention; Security/RLS/migration review serta
  integration QA.
- Dashboard menambah repository, service, hook, domain/mapper, halaman trend,
  filter project/release/environment/tester/tanggal, issue aging, perbandingan
  Test Run, dan export Excel/PDF. Summary dihitung dari data aktual.
- API/Webhook menambah token hash-only dengan plaintext sekali tampil,
  revoke, webhook event/status/retry/delivery log, project permission, audit,
  dan rate-limit primitive.
- CI/CD menambah pipeline, token hash-only, RPC ingest PASS/FAIL/SKIP/BLOCKED,
  metadata branch/commit/build/environment/provider, status response, RLS,
  audit, dokumentasi docs/CI_CD_INTEGRATION.md.
- Backup/Retention menambah backup JSON aman, preview restore, duplicate skip,
  transaction RPC, metadata attachment, policy global/per-project, dry-run,
  explicit confirmation, audit, dan scope-safe Storage cleanup.
- Security QA menghapus legacy approved-user bypass, mengikat audit/version
  history ke project, mencabut execute helper internal, dan memperbaiki audit
  integrasi agar project-scoped.
- Migration baru: schema_018_p2_dashboard_reporting.sql,
  schema_019_p2_api_webhooks.sql, schema_020_p2_cicd.sql,
  schema_021_p2_backup_retention.sql, schema_022_p2_security_hardening.sql.
  Migration lama tidak diubah.
- Verifikasi lokal final: frontend build berhasil; lint berhasil tanpa error
  dengan 6 warning non-blocking lama (Fast Refresh dan dependency session.user);
  git diff --check bersih.
- Graphify update terakhir berhasil: 1.023 node, 2.095 edge, 85 communities; warning
  dua hooks.json menghasilkan zero nodes.
- Verifikasi Supabase target melalui list_migrations/list_tables: remote masih
  sampai 017_p1_rpc_hardening dan tabel P2 belum ada. Migration P2 belum
  diterapkan remote pada sesi ini.
- Warning/blocker deployment: webhook HTTP delivery, queue claim/lease, HMAC
  signing dengan secret server-side, endpoint publik tanpa session browser,
  dan pemulihan binary Storage memerlukan Edge Function/worker, secret store,
  serta arsip binary terpisah. Backup JSON memulihkan metadata attachment,
  bukan isi object Storage.

## 2026-07-22 — P2 Backup/Restore dan Data Retention (sub-agent 4)

- Fitur: backup/restore project dan retention/cleanup attachment metadata/object Storage.
- Graphify: menjalankan query arsitektur/P2, query test run/issue reporting, path `TestRun` → `Issue` (node ambigu/tidak menemukan path literal), lalu `graphify update .` berhasil; graph diperbarui menjadi 1.020 node, 2.092 edge, 85 community. Warning Graphify: `hooks.json` menghasilkan zero nodes.
- Migration baru: `supabase/schema_021_p2_backup_retention.sql`; migration lama tidak diubah. Menambahkan `retention_policies`, RPC backup, preview/restore atomik dengan duplicate mode `skip`, preview cleanup, cleanup terkonfirmasi, RLS, permission project/global, audit log, dan penghapusan object Storage yang scope-safe.
- File frontend berubah: `frontend/src/types/domain.ts`, `frontend/src/helpers/mappers.ts`, `frontend/src/repositories/backupRetentionRepository.ts`, `frontend/src/services/backupRetentionService.ts`, `frontend/src/hooks/useBackupRetention.ts`, `frontend/src/pages/projects/ProjectDataManagementPage.tsx`, `frontend/src/App.tsx`, `frontend/src/pages/projects/ProjectSettingsPage.tsx`, `frontend/src/components/layout/AppMenu.tsx`.
- QA integrasi kecil: memperbaiki pemanggilan `createWebhook` agar project ID diteruskan ke repository sehingga build lint/typecheck P2 paralel kembali valid.
- UI: ekspor JSON tanpa password/token/secret; preview JSON sebelum restore; restore hanya dengan konfirmasi eksplisit dan mode skip; konfigurasi retensi per project dan global admin; dry-run cleanup dan konfirmasi permanen.
- Verifikasi: `cd frontend && npm run build` berhasil; `cd frontend && npm run lint` berhasil dengan 6 warning lama (Fast Refresh dan dependency `session.user`) serta warning chunk Vite besar. `graphify update .` berhasil.
- Supabase remote: belum dijalankan/diverifikasi pada sesi ini; migration harus dijalankan berurutan setelah migration existing. Belum ada verifikasi runtime tabel, policy, RPC, index, trigger, atau Storage bucket.
- Warning/blocker: backup hanya memuat metadata attachment dan restore metadata attachment; object binary Storage tidak dapat dipulihkan dari JSON tanpa artefak binary/object copy. Restore belum memulihkan `test_case_versions`, comments, requirements, atau assignment metadata; data inti yang diwajibkan (project/module/tag/test case/plan/run/result/issue/attachment metadata) tercakup. Cleanup tidak menghapus histori test run/result/issue.

## 2026-07-22 — P2 Integrasi CI/CD (sub-agent 3)

- Menggunakan Graphify terlebih dahulu: query `P2 features architecture and related modules`, query `dashboard test run issue reporting`, path `TestRun` → `Issue`, serta query/path terfokus untuk `TestRun`, `TestResult`, dan auth.
- Menambahkan migration baru `supabase/schema_020_p2_cicd.sql`: `cicd_pipelines`, hashed pipeline token, `cicd_ingest_attempts`, metadata CI pada `test_runs`, project-scoped RLS, audit, rate limit, token create/rotate, dan RPC `ingest_cicd_test_run`.
- Ingest membuat Test Run baru dari cakupan Test Plan, menerima `PASS/FAIL/SKIP/BLOCKED`, menyimpan branch/commit SHA/build number/environment/provider, mengisi `test_results`, dan menghitung summary aktual. Test Case tetap resultless, re-run tetap run baru, dan status `completed` tetap manual.
- Menambahkan `CicdPipeline`/contract types, mapper, `cicdRepository`, `cicdService`, `useCicdPipelines`, halaman `CicdIntegrationPage`, route `/projects/:id/integrations/cicd`, shortcut menu, serta dokumentasi `docs/CI_CD_INTEGRATION.md`.
- Token tidak dipilih pada query frontend (`token_hash` tidak pernah dikembalikan), hanya token plaintext sekali pada create/rotate; UI memperingatkan agar disimpan di secret manager dan tidak masuk log.
- Verifikasi: `cd frontend && npm run build` berhasil; `cd frontend && npm run lint` berhasil dengan 6 warning lama (Fast Refresh dan dependency `session.user` pada `useProjectRole`), tanpa error CI/CD.
- Graphify: `graphify update .` berhasil; graph diperbarui. Warning: `hooks.json` menghasilkan zero nodes (warning extractor lama).
- Supabase remote belum diverifikasi/dijalankan pada sesi ini karena migration dikelola manual via SQL Editor. Jalankan migration setelah `schema_019_p2_api_webhooks.sql` dan sebelum hardening lanjutan; verifikasi RPC grant, RLS, trigger, index, serta `pgcrypto` di target.
- Blocker deployment: ingest tersedia sebagai Supabase RPC; Edge Function/API gateway provider-specific belum ada karena SPA tidak memiliki server-side endpoint. Kontrak dan mitigasi gateway didokumentasikan di `docs/CI_CD_INTEGRATION.md`.

## 2026-07-22 — P2 API Token dan Webhook (sub-agent 2)

- Scope: fondasi integrasi API token dan webhook project-scoped melalui alur Page → Hook → Service → Repository → Supabase.
- File yang ditambahkan: `supabase/schema_019_p2_api_webhooks.sql`, `frontend/src/repositories/integrationRepository.ts`, `frontend/src/services/integrationService.ts`, `frontend/src/hooks/useIntegrations.ts`, dan `frontend/src/pages/integrations/IntegrationsPage.tsx`.
- File yang diubah: `frontend/src/types/domain.ts`, `frontend/src/helpers/mappers.ts`, `frontend/src/App.tsx`, dan `frontend/src/pages/projects/ProjectSettingsPage.tsx`.
- Migration `schema_019_p2_api_webhooks.sql` membuat `api_tokens`, `webhooks`, `webhook_deliveries`, dan `api_token_rate_limits`; token/secret hanya disimpan sebagai SHA-256 hash, RPC create mengembalikan plaintext satu kali, revoke tersedia, URL webhook wajib HTTPS, dan secret/hash tidak masuk delivery log.
- Menambahkan RLS project manager, audit metadata tanpa secret, queue event Test Run/Test Result/Issue melalui trigger, delivery status + attempt/backoff fields, serta RPC rate-limit per token hash. HTTP dispatch sengaja menjadi boundary Edge Function/worker dengan secret manager eksternal karena SPA tidak memiliki backend server.
- UI tidak menyimpan token/secret ke localStorage/state persistence; nilai one-time hanya ditampilkan dalam sesi halaman setelah create. Daftar token hanya memuat prefix, scope, status, dan metadata. Webhook menyediakan event, retry, active toggle, serta delivery log.
- Verifikasi build: `cd frontend && npm run build` berhasil (`tsc -b` dan Vite build tidak melaporkan error).
- Verifikasi lint: `cd frontend && npm run lint` berhasil tanpa error; tersisa warning existing pada `useProjectRole` exhaustive-deps, Fast Refresh beberapa provider/context, serta warning lint dari perubahan agent lain (`backupRetentionRepository`, `ProjectDataManagementPage`).
- Graphify: `graphify update .` dijalankan setelah perubahan; AST selesai untuk 116 file. Warning existing: dua `hooks.json` menghasilkan zero nodes.
- Verifikasi Supabase remote: belum dijalankan pada sub-agent ini karena tidak ada kredensial/akses MCP remote dalam scope sesi. Migration harus dijalankan setelah migration 017 dan diverifikasi terhadap RPC privilege, RLS, trigger, index, serta worker Edge Function.
- Warning/blocker: delivery HTTP aktual, HMAC signing yang memerlukan secret plaintext, claim/lease queue, dan status retry membutuhkan Edge Function/worker production. Migration menyediakan queue, retry metadata, dan rate-limit primitive tetapi tidak mengklaim dispatcher berjalan di browser. `FEATURE_BACKLOG.md` tidak diubah oleh sub-agent ini agar integrator P2 menentukan status final setelah seluruh fitur dan Supabase QA selesai.

## 2026-07-22 — Integrasi P1 dan QA final

- Membagi implementasi P1 ke enam sub-agent paralel: traceability, environment, test run enhancement, duplicate/comment/mention, attachment/archive, dan integration QA.
- Menyelesaikan integrasi layer domain, mapper, repository, service, hook, UI, route, Storage, dan RLS untuk seluruh scope P1.
- Merapikan migration P1 menjadi urutan `schema_011_environment_management.sql`, `schema_012_test_run_assignments.sql`, `schema_013_p1_collaboration.sql`, `schema_014_attachments_archive.sql`, dan `schema_015_requirement_traceability.sql` agar tidak ada nomor ganda.
- Menambahkan trigger validasi bahwa comment target (`test_case`/`issue`) berada pada project yang sama dengan comment.
- Menjalankan `npm run build`: berhasil.
- Menjalankan `npm run lint`: berhasil dengan 6 warning lama (Fast Refresh dan dependency `session.user`).
- Menjalankan `graphify update .`: berhasil, menghasilkan 882 node dan 1.772 edge; ada warning `hooks.json` menghasilkan zero nodes.
- FEATURE_BACKLOG P1 belum ditandai `[x]` karena migration belum dijalankan dan RLS/bucket belum diverifikasi pada Supabase target. Ini blocker deployment, bukan blocker build.

## 2026-07-22 — Apply migration P1 dan checklist

- Memeriksa schema existing Supabase melalui `list_tables` dan migration existing melalui `list_migrations`.
- Menerapkan migration Supabase berurutan: `011_environment_management`, `012_test_run_assignments`, `013_p1_collaboration`, `014_attachments_archive`, `015_requirement_traceability`.
- Menerapkan hardening RPC tambahan: `016_p1_security_hardening` dan `017_p1_rpc_hardening`; helper SECURITY DEFINER P1 tidak dapat dipanggil oleh anon/authenticated.
- Verifikasi target: seluruh tabel P1 memiliki RLS aktif dan policy select/insert/update/delete sesuai scope; bucket `test-attachments` ada dan private; seluruh migration tercatat pada Supabase.
- Supabase Security Advisor tidak lagi melaporkan helper P1 setelah revoke EXECUTE. Warning lain yang tersisa berasal dari helper schema lama dan multiple permissive policies existing.
- Mencentang seluruh item P1 di `FEATURE_BACKLOG.md` setelah penerapan dan verifikasi Supabase berhasil.

## 2026-07-22 — Test Run Enhancement (sub-agent)

- Menyesuaikan implementasi dengan migration paralel `supabase/schema_011_environment_management.sql`: Test Run memakai `environment_id`, browser, device, build version, dan release.
- Menambahkan `supabase/schema_012_test_run_assignments.sql` untuk pembagian test case per tester terdaftar, unique per `(test_run_id, test_case_id)`, indeks, trigger `updated_at`, serta RLS select/insert/update/delete berbasis project role.
- Menambahkan filter repository/service untuk status, environment, browser, device, build version, release, dan tester. Summary tetap dihitung dari `test_results` on-the-fly.
- Menambahkan assignment bulk pada detail Test Run. Assignment memperbarui `test_results.tester_id` hanya untuk status `not_run`; hasil yang sudah dieksekusi tidak ditimpa.
- Menambahkan filter UI pada daftar Test Run di Test Plan dan kolom metadata run; form mulai run telah memakai pilihan environment serta metadata eksekusi.
- File utama berubah: `frontend/src/types/domain.ts`, `frontend/src/helpers/mappers.ts`, `frontend/src/repositories/testRunRepository.ts`, `frontend/src/services/testRunService.ts`, `frontend/src/hooks/useTestRuns.ts`, `frontend/src/pages/test-plans/TestPlanDetailPage.tsx`, `frontend/src/pages/test-runs/TestRunDetailPage.tsx`.
- Verifikasi: `cd frontend && npm run build` berhasil; `cd frontend && npm run lint` berhasil dengan 6 warning lama (Fast Refresh dan dependency `session.user` pada `useProjectRole`).
- Graphify: `graphify update .` dicoba setelah perubahan, tetapi rebuild gagal dengan `Operation not permitted` dari environment; perlu dijalankan ulang oleh integrator di environment yang mengizinkan operasi Graphify.
- Blocker/integrasi: migration assignment harus dijalankan setelah schema environment/project-role karena menggunakan `has_project_access`, `can_run_tests`, dan `can_delete_project_content`. Perubahan paralel pada file yang sama (environment/collaboration) perlu final conflict review.

## 2026-07-22 — P1 Duplicate Test Case dan Comment/Mention

- Menjalankan Graphify query wajib (`P1 feature architecture and related modules`, path `Project` → `TestRun`, explain `TestCase`) sebelum membaca dan mengubah source.
- Menambahkan migration `supabase/schema_013_p1_collaboration.sql` (nomor 011 sudah dipakai oleh dua migration paralel): tabel `comments`, `comment_mentions`, index, trigger `updated_at`, helper permission project, dan RLS untuk akses project, author, manager/supervisor, serta profile mention yang masih aktif/approved.
- Menambahkan domain `Comment`, `CommentMention`, target type, mapper, `commentRepository`, `commentService`, dan hook `useComments` dengan validasi body 1–5.000 karakter serta deduplikasi user mention.
- Menambahkan `CommentsPanel` reusable pada detail Test Case dan Issue; user dapat membuat, melihat, mention user approved, dan menghapus komentar sendiri (manager/supervisor juga dapat moderasi). Data tetap melalui Page/Component → Hook/Service → Repository → Supabase.
- Menambahkan `testCaseService.duplicate()`: menyalin module, tags, objective, preconditions, steps, expected result, priority, dan notes melalui jalur create yang sama; kode baru tetap dibuat trigger database dan tidak menyalin hasil eksekusi.
- UI Test Case Detail menambahkan aksi Duplikat dan navigasi ke test case hasil salinan; UI Issue Detail menambahkan panel komentar.
- Verifikasi: `npx tsc --noEmit --pretty false` berhasil, `npm run build` berhasil, `npm run lint` berhasil dengan 6 warning lama Fast Refresh/dependency hook dan warning chunk Vite. `graphify update .` serta mode `--code-only` dicoba tetapi gagal di AST extraction dengan `Operation not permitted` pada environment sandbox; tidak ada API key yang diminta.
- Saat build integrasi ditemukan JSX malformed pada perubahan paralel di `TestPlanDetailPage.tsx`; diperbaiki dengan merapikan wrapper/filter markup agar build seluruh workspace kembali berhasil. Perubahan fitur agent lain tidak dihapus.

## 2026-07-22 — P1 Requirement Traceability

- Menjalankan Graphify wajib: query arsitektur P1, path `Project` → `TestRun`, dan explain `TestCase` sebelum membaca source.
- Menambahkan migration baru `supabase/schema_015_requirement_traceability.sql`: tabel `requirements`, junction `requirement_links` untuk Test Case/Test Plan/Test Result/Issue, unique partial index, validasi target lintas-project melalui trigger, updated-at trigger, dan RLS berbasis `has_project_access`.
- Menambahkan domain `Requirement`, `RequirementLink`, `RequirementWithLinks`, dan `RequirementCoverage`, mapper, `requirementRepository`, `requirementService`, serta `useRequirements`.
- Menambahkan UI `frontend/src/pages/requirements/RequirementsPage.tsx` dengan CRUD requirement, link ke empat target, metrik coverage dan daftar unmet requirement; route `/projects/:id/requirements` dan tombol akses dari project menu.
- Verifikasi: `cd frontend && npm run build` berhasil.
- Verifikasi lint: gagal karena error JSX existing/di luar scope pada `src/pages/test-plans/TestPlanDetailPage.tsx:264`; warning lain adalah warning lama Fast Refresh/exhaustive-deps.
- `graphify update .` dijalankan setelah perubahan, tetapi rebuild Graphify terblokir environment dengan `Operation not permitted`; graph belum dapat diperbarui.
- Blocker: migration dan RLS belum dapat dieksekusi/verifikasi terhadap Supabase SQL Editor dalam workspace ini. `FEATURE_BACKLOG.md` belum ditandai selesai sampai migration/RLS dan lint integrasi diverifikasi.

## 2026-07-22

### P1 Environment Management (sub-agent)

- Menambahkan migration `supabase/schema_011_environment_management.sql` untuk tabel `environments` per project, base URL, metadata `test_runs.environment_id`, `browser`, `device`, `build_version`, dan `release`, index, trigger timestamp, serta RLS project-scoped.
- Menambahkan domain `Environment`, mapping snake_case/camelCase, `environmentRepository`, `environmentService`, dan hook `useEnvironments` dengan validasi nama serta URL.
- Menambahkan CRUD environment pada tab Environment di `ProjectSettingsPage`.
- Menambahkan pemilihan environment dan field browser/device/build version/release pada dialog mulai Test Run; data tetap melekat pada Test Run dan tidak mengubah model hasil PASS/FAIL.
- Verifikasi: `cd frontend && npm run build` berhasil; `cd frontend && npm run lint` berhasil dengan 6 warning lama (Fast Refresh dan dependency `session.user` pada `useProjectRole`), tanpa error.
- `graphify update .` awal diblokir `Operation not permitted` di sandbox; setelah izin eskalasi berhasil memperbarui graph menjadi 878 node, 1.767 edge, 76 community.
- Migration belum dijalankan terhadap Supabase pada sesi ini; perlu dijalankan setelah migration RBAC project (`schema_project_roles.sql`) dan migration existing terkait.

### Integration Review / QA (Codex sub-agent)

- Menjalankan Graphify: query `P1 feature architecture and related modules`, path `Project` → `TestRun`, dan explain `TestCase` sebelum audit source.
- Audit integrasi P1 menemukan konflik kontrak Test Run Enhancement: `TestResult` sempat menerima metadata run yang tidak ada di schema, dan mapper memiliki field `environment` serta properti duplikat. Diselaraskan ke `TestRun.environmentId` + metadata browser/device/build/release, dengan `TestResult` tetap result-only sesuai aturan workflow.
- Memperbaiki struktur JSX filter pada `frontend/src/pages/test-plans/TestPlanDetailPage.tsx` yang sempat menghasilkan error parser setelah perubahan paralel.
- File yang diperbaiki: `frontend/src/types/domain.ts`, `frontend/src/helpers/mappers.ts`, `frontend/src/pages/test-plans/TestPlanDetailPage.tsx`.
- Verifikasi: `cd frontend && npm run build` berhasil; `cd frontend && npm run lint` berhasil dengan warning lama Fast Refresh dan dependency `useProjectRole`.
- `graphify update .` dicoba setelah perubahan, tetapi gagal pada rebuild hook dengan `Operation not permitted`; tidak ada blocker pada build/lint.
- Temuan QA dan tindak lanjut integrator: migration P1 dinomori ulang menjadi `011_environment_management`, `012_test_run_assignments`, `013_p1_collaboration`, `014_attachments_archive`, dan `015_requirement_traceability`; kolom run tetap memakai `environment_id` tanpa kolom hasil pada test case; trigger validasi target comment ditambahkan agar target dan project konsisten.

### P1 — Attachment Test Case/Test Run dan Archive Project (sub-agent)

- Menambahkan migration baru `supabase/schema_014_attachments_archive.sql`.
- Migration membuat tabel `attachments` dengan parent tunggal Test Case atau Test Run, private bucket `test-attachments`, signed URL, batas metadata, foreign key cascade ke entitas histori, dan RLS berbasis akses project/role (`can_edit_project_content`, `can_run_tests`, `can_delete_project_content`).
- Menambahkan `Attachment`/`AttachmentEntityKind`, mapper `mapAttachmentRow`, `attachmentRepository`, `attachmentService`, `useAttachments`, dan komponen reusable `AttachmentPanel`.
- UI attachment tersedia pada `TestCaseDetailPage` dan `TestRunDetailPage`: upload, signed URL download/preview, hapus dengan konfirmasi, validasi file kosong dan maksimal 10 MB. Tester dapat upload Test Run; hapus dibatasi manager/admin sesuai RLS.
- Archive Project diperkuat dengan `projectService.archive()`/`restore()` dan UI existing Project Settings/Projects diarahkan ke method khusus. Archive hanya mengubah `projects.status`; tidak menghapus test plan, test case, result, issue, atau histori.
- File kode utama berubah: `frontend/src/types/domain.ts`, `frontend/src/helpers/mappers.ts`, `frontend/src/repositories/attachmentRepository.ts`, `frontend/src/services/attachmentService.ts`, `frontend/src/hooks/useAttachments.ts`, `frontend/src/components/ui/AttachmentPanel.tsx`, `frontend/src/pages/test-cases/TestCaseDetailPage.tsx`, `frontend/src/pages/test-runs/TestRunDetailPage.tsx`, `frontend/src/services/projectService.ts`, `frontend/src/pages/projects/ProjectsPage.tsx`, `frontend/src/pages/projects/ProjectSettingsPage.tsx`.
- Verifikasi: `cd frontend && npm run build` berhasil; `npm run lint` berhasil tanpa error. Warning yang tersisa adalah warning lama Fast Refresh/dependency hook.
- `graphify update .` dijalankan setelah perubahan, tetapi rebuild gagal pada environment dengan `Operation not permitted`; tidak ada error TypeScript/Vite dari perubahan ini.
- Warning/blocker: migration belum dijalankan di Supabase SQL Editor pada sesi ini, sehingga verifikasi runtime RLS dan bucket masih perlu dilakukan oleh integrator/deployment owner. FEATURE_BACKLOG tidak ditandai selesai sampai migration/RLS runtime diverifikasi.

### Graphify Codex integration

- Memastikan CLI `graphify` terpasang pada versi `0.9.14`.
- Mendaftarkan integrasi Codex melalui `graphify codex install`.
- Mengaktifkan `.codex/hooks.json` dengan hook `graphify hook-check` untuk pengecekan knowledge graph sebelum pertanyaan codebase dan rebuild setelah perubahan kode.
- Membuat knowledge graph project pada folder `graphify-out/`.
- Hasil awal: 419 node, 1.150 edge, dan 17 community.
- Menghasilkan `graph.html`, `GRAPH_REPORT.md`, `graph.json`, serta file analisis pendukung.
- Memasang extra `graphifyy[sql]`; scan berikutnya dapat memasukkan schema SQL yang berubah.
- Menetapkan Graphify sebagai langkah wajib untuk semua agent saat menelusuri struktur, dependency, dan relasi codebase agar konteks pembacaan lebih kecil dan hemat token.
- Menyamakan aturan wajib Graphify ke `CLAUDE.md` untuk agent Claude Code.
- Menetapkan aturan bahwa semua agent wajib selalu mencatat perubahan, keputusan,
  instalasi, verifikasi, warning, dan blocker di `WORKLOG.md`.

### Feature backlog diperluas

- Menambahkan seluruh kandidat fitur lanjutan ke `FEATURE_BACKLOG.md`.
- Mencakup traceability, environment management, test run enhancement, kolaborasi, dashboard trend, API/webhook, CI/CD, AI, automation, dan self-hosted deployment.
- Backlog dipisahkan berdasarkan prioritas workflow, fitur lanjutan, AI, administrasi, dan deployment self-hosted.

### P2 — Peningkatan workflow (selesai)

- Menambahkan migration `supabase/schema_p2_workflow.sql` untuk assignee Test Case, riwayat versi, audit log, dan notifikasi Issue.
- Versioning otomatis menyimpan `steps` dan `expected_result` setiap create atau perubahan field tersebut.
- Menambahkan bulk update Test Case untuk priority, status, module, tag, dan assignee.
- Menambahkan filter lanjutan Test Case berdasarkan module, tag, priority, status, dan assignee.
- Menambahkan notifikasi database dan indikator bell di topbar untuk Issue yang di-assign atau berubah status.
- Audit log otomatis merekam create/update/delete pada project, module, tag, test case, test plan, test run, test result, dan issue.
- Menambahkan panel riwayat versi pada detail Test Case.
- Migration perlu dijalankan setelah schema yang sudah ada di Supabase SQL Editor.
- Verifikasi: `npm run build` berhasil dan `npm run lint` berhasil tanpa error; warning yang tersisa berasal dari Fast Refresh/dependency hook lama dan warning dependency `reload` telah dirapikan.

### Selesai

- Menambahkan fitur Dashboard QA pada halaman Home.
- Menampilkan ringkasan project, test case, test plan, test run, hasil testing, dan issue.
- Menambahkan tombol refresh data dashboard.
- Menambahkan export ringkasan dashboard ke CSV.
- Membuat seed data contoh di Supabase: project, module, tag, test case, test plan, test run, result, dan issue.
- Build berhasil dengan `npm run build`.
- Lint berhasil tanpa error; masih ada 5 warning lama terkait Fast Refresh dan dependency hook.

### Import Excel Test Case (selesai)

- Menambahkan dependency `xlsx` untuk membaca file `.xlsx`/`.xls` di browser.
- Format kolom yang didukung: `code`, `title`, `module`, `objective`, `preconditions`, `steps`, `expected_result`, `priority`, `tags`, dan `notes`.
- Menambahkan preview dan validasi baris sebelum import.
- Module dan tag yang belum ada dibuat otomatis.
- Baris valid diproses, sedangkan baris yang gagal dilaporkan tanpa membatalkan seluruh import.

### Export Excel (selesai)

- Menambahkan export Test Case dari halaman detail project.
- Export akan mengikuti hasil filter/search yang sedang aktif.
- File `.xlsx` berisi kolom lengkap Test Case, module, priority, status, tag, dan catatan.
- Export tersedia untuk user yang memiliki akses baca; import tetap membutuhkan akses edit.
- Build berhasil; lint tidak error dan hanya menyisakan warning lama.

### AI Integration (roadmap)

- Menambahkan fitur AI Generate Test Case ke `FEATURE_BACKLOG.md`.
- Implementasi ditunda sampai provider AI dan secret Edge Function ditentukan.

### Self-hosted automation (roadmap)

- Menambahkan rancangan Playwright Worker dan infrastructure self-hosting ke `FEATURE_BACKLOG.md`.
- MCP ditetapkan sebagai alat development/debugging, bukan runtime production.

### Feature backlog (selesai)

- Membuat `FEATURE_BACKLOG.md` sebagai daftar status fitur dan roadmap.

### Project selector global (selesai)

- Menambahkan project aktif di topbar.
- Menyimpan pilihan project di localStorage.
- Halaman Test Cases dan Test Plans menggunakan project aktif yang sama.
- Build berhasil; lint tidak error dan hanya menyisakan warning lama.

### Export laporan Test Run (selesai)

- Export laporan Test Run berdasarkan project aktif dari selector global.
- Format Excel dan PDF.
- Laporan mencakup total, PASS, FAIL, SKIP, BLOCKED, belum dites, progress, dan tanggal.
- Build berhasil; lint tidak error dan hanya menyisakan warning lama.

### Attachment Issue (selesai)

- Menambahkan metadata attachment dan bucket private `issue-attachments` di Supabase.
- Menambahkan upload, preview/download signed URL, dan hapus attachment dari detail Issue.
- Maksimal ukuran file 10 MB.
- Policy RLS membatasi attachment mengikuti akses project dan role issue manager.
- Migration `010_issue_attachments` berhasil diterapkan dan bucket terverifikasi.
- Build berhasil; lint tidak error dan hanya menyisakan warning lama.

### Template Excel import (selesai)

- Menambahkan tombol download template Excel untuk Test Case.
- Template berisi header resmi dan contoh data.
- Template tersedia dari toolbar Test Cases dan dialog import.
- Build berhasil; lint tidak error dan hanya menyisakan warning lama.

### Export laporan Test Run (selesai)

- Export berdasarkan project aktif dari selector global.
- Format Excel dan PDF.
- Laporan berisi kode, nama run, test plan, status, total, PASS, FAIL, progress, dan tanggal.
- Build berhasil; lint tidak error dan hanya menyisakan warning lama.

### Export PDF (selesai)

- Menambahkan export laporan Test Case ke PDF dari halaman detail project.
- PDF menggunakan orientasi landscape dan tabel dengan pemisah halaman otomatis.
- Build berhasil; lint tidak error dan hanya menyisakan warning lama.

### File yang berubah

- `frontend/src/types/domain.ts`
- `frontend/src/repositories/dashboardRepository.ts`
- `frontend/src/services/dashboardService.ts`
- `frontend/src/hooks/useDashboard.ts`
- `frontend/src/pages/home/HomePage.tsx`
- `frontend/src/helpers/testCaseExcel.ts`
- `frontend/src/helpers/excelExporter.ts`
- `frontend/src/helpers/pdfExporter.ts`
- `frontend/src/services/testCaseService.ts`
- `frontend/src/pages/projects/ProjectDetailPage.tsx`
- `frontend/package.json`
- `frontend/package-lock.json`
- `WORKLOG.md`

### Rencana implementasi

1. Tambahkan query agregasi dashboard melalui repository/service. (selesai)
2. Tambahkan hook untuk mengambil data dashboard. (selesai)
3. Ubah `HomePage` menjadi dashboard QA. (selesai)
4. Tambahkan export CSV. (selesai)
5. Verifikasi dengan build dan pengecekan data Supabase. (selesai)

### 2026-07-22 — Sub-agent 5: Security, RLS, migration review, integration QA

- Audit Graphify dijalankan dengan query `P2 security RLS migration integration review` dan path `TestRun` → `Issue`; indeks awal belum menemukan path eksplisit karena node ambigu, lalu graph diperbarui setelah audit.
- Menemukan policy legacy `approved users - ...` berpotensi tetap aktif bersama policy project-role, sehingga dapat melewati pembatasan role/project. Menemukan pula audit log dan test-case version history masih terbaca lintas project.
- Membuat migration baru `supabase/schema_022_p2_security_hardening.sql` tanpa mengubah migration lama. Migration menghapus policy bypass, menambahkan `audit_logs.project_id` dan index, menghitung scope audit secara allow-list, membatasi audit/version history ke project yang dapat diakses, serta mencabut execute RPC untuk fungsi trigger/internal.
- File yang diubah oleh sub-agent ini: `supabase/schema_022_p2_security_hardening.sql`, `WORKLOG.md`; file agent lain tidak dihapus atau ditimpa.
- Invariant diverifikasi secara statis: hasil PASS/FAIL/SKIP/BLOCKED tetap di `test_results`, `test_plan_cases.last_result` sudah dihapus oleh schema v2, re-run tetap memakai Test Run baru, dan summary/progress dihitung dari result aktual.
- Verifikasi frontend: `cd frontend && npm run build` berhasil; `cd frontend && npm run lint` berhasil tanpa error. Lint masih memiliki 6 warning lama terkait Fast Refresh dan dependency `session.user`.
- `graphify update .` berhasil memperbarui graph menjadi 962 nodes, 1.896 edges, 85 communities; terdapat warning dua `hooks.json` menghasilkan zero nodes.
- Verifikasi Supabase remote belum dilakukan pada sesi ini; migration 022 perlu dijalankan setelah migration P2 agen lain tersedia. Migration dashboard `schema_018_p2_dashboard_reporting.sql` sudah terlihat; migration API/webhook, CI/CD, backup/retention belum tersedia saat audit ini.
- Warning/blocker: acceptance end-to-end untuk token hash/one-time display, webhook retry/delivery, CI/CD authentication/status, backup restore transaction, dan retention dry-run masih menunggu kontrak/migration agen 2–4; perlu integration review ulang setelah seluruh migration P2 masuk.

### 2026-07-22 — Sub-agent 1: P2 Dashboard Trend dan Reporting

- Graphify wajib dijalankan sebelum membaca source: query `dashboard trend reporting related modules`, query `dashboard test run issue reporting`, dan path `TestRun` → `Issue` (path simbol ambigu, sehingga audit dilanjutkan melalui node file repository/service/page yang ditemukan).
- Menambahkan reporting live/on-the-fly untuk pass rate, fail rate, execution progress, issue aging, dan perbandingan Test Run dengan filter project, release, environment, tester, serta rentang tanggal.
- Menambahkan export Excel dan PDF dengan helper baru; tidak menambahkan hasil ke `test_cases`, tidak mengubah completion manual, dan tidak mengubah semantics re-run.
- File utama sub-agent ini: `frontend/src/types/domain.ts`, `frontend/src/helpers/mappers.ts`, `frontend/src/repositories/dashboardReportRepository.ts`, `frontend/src/services/dashboardReportService.ts`, `frontend/src/hooks/useDashboardReport.ts`, `frontend/src/helpers/dashboardReportExporter.ts`, `frontend/src/pages/dashboard/DashboardReportPage.tsx`, `frontend/src/App.tsx`, `frontend/src/components/layout/AppMenu.tsx`.
- Migration baru: `supabase/schema_018_p2_dashboard_reporting.sql`, berisi index query reporting dan policy read-only audit log tanpa cache summary.
- `npm run lint` selesai tanpa error dan tanpa warning baru dari fitur ini; warning tersisa berasal dari Fast Refresh, dependency hook existing, serta file backup/retention dan project data management agen lain.
- `npm run build` tidak dapat dinyatakan lulus pada kondisi workspace saat ini: type-check menemukan error lint/type dari fitur backup/retention dan integrasi CI/CD agen lain (`RetentionCleanupPreview`, `RetentionPolicy`, `RestorePreview`, mapper restore/retention, dan signature `integrationService`), serta satu error reporting yang sudah diperbaiki dengan menambahkan `id` pada select `test_results`.
- `graphify update .` berhasil; Graphify melaporkan AST 114/114 file dan warning dua `hooks.json` menghasilkan zero nodes.
- Verifikasi Supabase remote belum dilakukan; migration 018 perlu dijalankan berurutan setelah migration sebelumnya. FEATURE_BACKLOG Dashboard Trend belum dicentang karena build integrasi dan verifikasi remote masih blocker.
