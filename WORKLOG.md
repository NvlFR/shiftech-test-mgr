# Worklog

Catatan perubahan dan pekerjaan pada project TestManager.

## 2026-07-31

### E08-T15 — Verifikasi dan pelengkapan Attachment Issue end-to-end

- Memetakan alur dengan `graphify query`, lalu mengaudit upload, list dengan
  signed URL, hapus, RLS metadata/Storage, dan retention berdasarkan scope
  `FEATURE_BACKLOG.md`.
- Memindahkan lifecycle dan aksi attachment Issue ke hook
  `useIssueAttachments`, sehingga alurnya konsisten Page → Hook → Service →
  Repository → Supabase.
- Memusatkan mapping row Issue attachment di `helpers/mappers.ts`, menolak file
  kosong di service, dan memakai fallback MIME `application/octet-stream` saat
  upload.
- Menambahkan `schema_042_issue_attachment_storage_cleanup.sql` untuk menghapus
  object bucket private ketika metadata terhapus melalui cascade Issue/Test
  Result/Test Run/Project. Migration hanya dibuat dan tidak dijalankan ke target.
- RLS terverifikasi secara statis pada `schema_issue_attachments.sql`: select
  membutuhkan akses project, sedangkan insert/delete metadata dan Storage
  membutuhkan `can_manage_issues`; retention Issue attachment tercakup oleh
  preview/cleanup pada `schema_021_p2_backup_retention.sql`.
- Memperbarui `FEATURES.md` dan `TODO.md` dengan bukti file/fungsi relevan.
- Verifikasi lulus: `cd frontend && npm run build`, `npm run lint` (hanya tujuh
  warning existing), `git diff --check`, serta pemeriksaan statis policy RLS dan
  cakupan retention Issue attachment. Build tetap memberi warning ukuran chunk
  utama yang sudah ada.

### SRC-DOC — Sinkronisasi dokumentasi akhir integrasi source-new

- Menjalankan `graphify query` dan membaca FEATURE_BACKLOG Section 7 serta
  catatan SRC-01–SRC-14 untuk merekonsiliasi hasil akhir integrasi.
- Memperbarui `FEATURES.md` dengan ringkasan port selektif SRC-01–SRC-12,
  klasifikasi migration SRC-14, keputusan menolak promosi `App-new.tsx`, dan
  kontrak source-new yang sengaja tidak diadopsi.
- Memperbarui `TODO.md`: epic integrasi kode dipindahkan ke selesai, sedangkan
  rollout migration dan smoke test environment ditempatkan sebagai pekerjaan
  terblokir yang membutuhkan akses manusia ke Supabase target.
- Merekonsiliasi status Section 7 pada tiga dokumen target: pekerjaan port
  SRC-09/SRC-12 dicatat selesai, audit SRC-13 dicatat selesai dengan promosi
  ditolak, sedangkan deployment dan smoke test tidak diklaim selesai.
- Tidak ada kode, migration, data, secret, commit, atau remote yang diubah.
- Verifikasi: `git diff --check` lulus dan `cd frontend && npm run build` lulus
  (663 modul); warning ukuran chunk utama yang sudah ada tetap muncul.

### SRC-14 — Audit lengkap migration `supabase-new`

- Menjalankan `graphify query` sebelum audit dan membaca scope Section 7. Seluruh
  59 file di `supabase-new/migrations` diperiksa terhadap schema lokal. Tidak ada
  SQL yang dijalankan ke Supabase target.
- Migration kompatibel dipertahankan dalam rangkaian bernomor lokal yang sudah
  diadaptasi: fondasi `schema.sql` sampai `schema_test_run_notes.sql`, lalu
  `schema_029_project_ownership_visibility.sql`,
  `schema_030_test_suite_library.sql`,
  `schema_031_structured_steps_custom_runs.sql`,
  `schema_032_activity_mentions_realtime.sql`, `schema_033_test_roles.sql`,
  `schema_034_source_new_compatibility.sql`,
  `schema_035_test_result_snapshot.sql`,
  `schema_036_test_result_order_snapshot.sql`,
  `schema_037_invited_project_metadata_access.sql`,
  `schema_038_test_suite_structured_metadata.sql`,
  `schema_039_issue_editor_metadata.sql`, dan
  `schema_040_notification_delete_policy.sql`. Adaptasi ini memakai
  `profiles(id)`, mempertahankan approval gate, memakai tabel attachment lokal,
  menjaga status Test Run tetap manual, dan tidak membuat cache summary.
- Migration yang diterima melalui schema lokal tersebut: `20260701000001`–
  `20260701000017` (fondasi, kode entity/issue, snapshot, project RBAC, steps,
  attachment lokal, order, Realtime, custom run), `20260723000001`–
  `20260723000002` (suite/template dan test role), `20260725000002`–
  `20260725000004` serta `20260725000007` (RLS ownership/visibility),
  `20260725000009`–`20260725000012` (invitation dan suite privacy),
  `20260727000013`, `20260728000001`–`20260728000002`,
  `20260728000008`, `20260729000002`, bagian activity/comment saja dari
  `20260730000001`, `20260730000002`, `20260730000004`–`20260730000006`,
  `20260731000001`–`20260731000002`, `20260731000005`–`20260731000006`.
  `20260725000001` terserap sebagai hasil akhir bernama `test_suites`, sehingga
  rename transit `test_case_templates` tidak disalin sebagai migration terpisah.
- Migration yang **ditolak** dan alasannya:
  - `20260722000001_auto_approve_signup.sql` dan
    `20260725000006_drop_approval_gate.sql`: menghapus alur wajib
    `pending -> user/admin` dan bertentangan dengan RBAC lokal.
  - `20260725000005_split_profiles_into_users_and_profiles.sql`,
    `20260725000008_fix_profiles_realtime_publication.sql`,
    `20260728000003_one_time_username.sql`,
    `20260729000001_list_users_rpc.sql`,
    `20260729000003_fix_soft_delete_security.sql`,
    `20260729000004_delete_account_rpc.sql`,
    `20260729000005_reactivate_account_rpc.sql`,
    `20260729000006_fix_delete_account_username_trigger.sql`, dan
    `20260731000004_project_members_read_users.sql`: bergantung pada pemisahan
    `public.users`/`profiles`, username, atau lifecycle akun yang tidak ada dan
    tidak kompatibel dengan model lokal `profiles` 1:1 ke `auth.users`.
  - `20260728000004_delete_notifications_by_reference.sql`: RPC cleanup khusus
    kontrak invitation source-new tidak dipakai oleh service lokal; delete
    notification lokal dicakup policy recipient pada `schema_040`.
  - `20260728000005_debug_invitation_visibility.sql` dan
    `20260728000007_drop_debug_invitation_visibility.sql`: pasangan RPC
    diagnostik sementara, bukan schema produksi.
  - `20260728000006_invitation_rpc_security_definer.sql`: bentuk return dan RPC
    accept/decline bergantung pada repository source-new; alur lokal memakai
    fungsi/policy invitation pada `schema_029` dan akses metadata pada
    `schema_037`.
  - Bagian rename `attachments -> entity_attachments` dari
    `20260730000001_entity_activity_and_attachments.sql`, seluruh
    `20260730000003_entity_attachments_comment_type.sql`, dan
    `20260731000003_test_result_attachments.sql`: entity attachment polymorphic
    bertentangan dengan tabel/storage/RLS attachment lokal (`attachments` dan
    `issue_attachments`), sehingga hanya bagian activity yang diadaptasi.
- `20260725000001_rename_test_case_templates_to_test_suites.sql` tidak dijalankan
  apa adanya karena schema lokal membuat `test_suites` langsung; menyalin rename
  transit akan gagal/tumpang tindih. Semua migration lain yang diterima tetapi
  sudah identik atau tersupersede oleh schema lokal tidak dicopy ulang agar tidak
  menduplikasi trigger, policy, function, atau tabel.
- Verifikasi statis: seluruh 59 nama migration tercakup dalam klasifikasi audit,
  urutan schema lokal berlanjut sampai `schema_040`, `git diff --check` lulus,
  dan knowledge graph diperbarui. Tidak ada kredensial/secret yang dibaca atau
  dicatat.

### SRC-09b — Port halaman Test Runs, Issues, Test Suites, dan execution detail

- Menjalankan `graphify query` sebelum membandingkan halaman aktif dengan
  referensi `pages-new` dan membaca scope SRC-09 pada FEATURE_BACKLOG Section 7.
- Memport pola tabel responsif source-new ke halaman execution detail, daftar
  Issue per Test Run, daftar Test Suite, dan detail Test Suite: baris ringkas
  khusus layar kecil, paginator bersama, pilihan jumlah baris, serta tetap
  menyediakan row actions dan bulk selection yang sudah aktif.
- Mempertahankan route lokal `/test-runs/:id`, `/test-runs/:id/issues`,
  `/issues/:id`, `/test-suites`, dan `/test-suites/:id`. Flow lokal record
  result/structured steps, complete manual/reopen run, AI Issue, assignment,
  attachment, comments, activity, CRUD suite/item, filter, dan RBAC tidak
  diganti oleh kontrak source-new yang berbeda.
- Tidak mengubah schema, domain, mapper, repository, service, hook data, atau
  menjalankan migration ke Supabase target.
- Verifikasi: `cd frontend && npm run build` lulus (warning ukuran chunk
  existing), `npm run lint` dan `git diff --check` dijalankan sebelum
  sinkronisasi Graphify akhir.

### SRC-03 — Integrasi layout-new ke layout aktif

- Membandingkan seluruh komponen `components/layout-new` dengan layout aktif.
  Port dilakukan selektif agar route, RBAC, notifikasi, dialog pembuatan project,
  pin/project shortcut, dan kontrak Profile lokal tidak hilang.
- Sidebar sekarang statis dan terbuka secara default pada desktop (tetap dapat
  ditutup lewat toggle), sementara tablet/mobile memakai panel overlay, mask,
  tombol tutup, dan menutup otomatis setelah navigasi. Perubahan breakpoint
  ditangani oleh `LayoutContext` dan CSS layout aktif.
- Breadcrumb detail sekarang selalu berada di topbar: trail lengkap pada desktop
  dan item terakhir plus menu jalur tersembunyi pada layar kecil. Label panjang
  dipotong agar topbar tidak overflow.
- Topbar mempertahankan project context, notification center, profil, sign-out,
  dan theme toggle aktif. Popup theme dipasang ke `document.body` agar tidak
  terpotong container. `ProjectProvider` pada `AppLayout` tetap dipertahankan.
- Menu aktif dipertahankan karena mencakup seluruh route lokal (`/home`, report,
  suite, project, users, retensi, requirements, CI/CD, dan automation), berbeda
  dari route source-new yang tidak kompatibel. Branding diseragamkan menjadi
  TestManager; header duplikat sidebar hanya tampil di mobile.
- Verifikasi: `cd frontend && npm run build` lulus (TypeScript dan Vite; hanya
  warning ukuran chunk existing), `npm run lint` lulus, dan `git diff --check`
  lulus. Knowledge graph diperbarui dengan `graphify update .`.

### Build hijau kembali + perbaikan desain gate codex-loop

Menjalankan loop pertama kali mengungkap satu cacat desain driver dan 30 error
TypeScript sisa porting source-new. Keduanya diperbaiki.

**30 error TypeScript diperbaiki (tsc nol error, `npm run build` hijau):**

- `components/dialogs/ImportCasesDialog.tsx` — memakai `useAuthContext().user`
  yang tidak ada (kontrak lokal: `profile`), dan `projectRepository.findByOwner`
  yang tidak pernah ada. Diganti ke `profile` + `projectService.list()` dan
  `testCaseService.listFiltered()`. Sekaligus memperbaiki pelanggaran layering:
  component sebelumnya memanggil repository langsung, sekarang lewat service.
- `components/notifications/NotificationPanel.tsx` — memakai `n.isRead`; domain
  lokal memakai `readAt: string | null`. Diganti ke `n.readAt`.
- `helpers/statusLabels.ts` — menambah `PROJECT_VISIBILITY_LABEL/SEVERITY` dan
  `TEST_SUITE_VISIBILITY_LABEL/SEVERITY` yang diimpor `ProfileView` tapi belum ada.
- `pages/projects/ProjectTestPlanTab.tsx` — `changeStatus` dipanggil 3 argumen
  (service hanya menerima 2); `selectionMode` bertipe `undefined` padahal
  PrimeReact menuntut `null`; event `onSelectionChange` implicit any. Prop
  `projectId` yang jadi tidak terpakai dihapus dari interface dan call site.
- `pages/projects/ProjectTestCaseTab.tsx` — import `MultiSelect` tidak terpakai.
- `pages/projects/ProjectDetailPage.tsx` — state filter duplikat dan import tidak
  terpakai; sudah dibereskan Codex pada task #2 sebelum loop dihentikan.
  Filter memang milik `ProjectTestCaseTab` yang punya state sendiri, jadi
  penghapusan di parent benar, bukan kehilangan fitur.

**Cacat desain gate driver:**

- Gejala: task `FIX-00a` menyelesaikan pekerjaannya dengan benar (duplicate
  identifier di `domain.ts` hilang) tapi dilabeli `blocked`, karena gate lama
  `npm run build` menilai SELURUH repo sementara scope task cuma satu file.
  30 error di file lain membuat build tetap merah. Task benar, gate salah nilai.
- Perbaikan: gate sekarang menilai **pergerakan** jumlah error TypeScript, dengan
  baseline diukur SEBELUM Codex jalan. Error naik → regresi, ditolak. Error jadi
  nol → dikonfirmasi `npm run build`. Error berkurang/tetap → diterima, sisa
  error dilaporkan. Env: `CODEX_LOOP_GATE_TSC`, `CODEX_LOOP_GATE_BUILD`.
- Konsekuensi yang diterima: gate ini menangkap regresi, tapi tidak menangkap
  task yang lapor `completed` tanpa mengubah apa pun. Itu dicek lewat `summary`
  di `logs/*.verdict.json`.
- Blok 0 (FIX-00a–FIX-00d) dihapus dari antrean karena sudah selesai manual.
  Antrean kembali ke 96 task, dimulai dari SRC-12.
- Driver dan proses `codex exec` yang masih berjalan dihentikan sebelum perbaikan.

### Commit porting source-new + ignore aset *-new

- `.gitignore`: pola `*-new/`, `*-new.ts`, `*-new.tsx` — seluruh aset source-new
  (layout-new, ui-new, helpers-new, hooks-new, pages-new, repositories-new,
  services-new, domain-new.ts, App-new.tsx, supabase-new) tetap ada di disk
  sebagai bahan referensi porting tapi tidak pernah di-commit. Diverifikasi
  belum ada satu pun yang ter-track, jadi tidak perlu `git rm --cached`.
  `supabase/schema_034_source_new_compatibility.sql` SENGAJA tidak diabaikan —
  itu migration deliverable di folder `supabase/`, bukan bahan referensi.
- Commit `93b42a0` di master: 221 file (porting source-new ke layer aktif,
  migration schema_029–schema_038, section baru FEATURE_BACKLOG, renumber,
  penunjuk TODO). Diverifikasi tidak ada file `-new` maupun `scripts/codex-loop/`
  yang ikut, dan tidak ada file berisi secret.
- **Build merah saat commit**: `npx tsc -b --force` menghasilkan 40 error di 7 file
  — `types/domain.ts` (10, duplicate identifier `projectId`/`moduleId` sisa merge
  domain-new), `ProjectDetailPage.tsx` (16), `ProfileView.tsx` (4),
  `ImportCasesDialog.tsx` (4), `ProjectTestPlanTab.tsx` (3),
  `NotificationPanel.tsx` (2), `ProjectTestCaseTab.tsx` (1). Kondisi ini sudah ada
  sebelum sesi ini; sesi ini hanya mengubah `.md` dan `.gitignore`.
- Konsekuensi: gate driver Codex (`npm run build`) akan menolak semua task selama
  build merah. Ditambahkan **Blok 0 (FIX-00a–FIX-00d)** di paling depan antrean
  untuk menghijaukan build lebih dulu. Total antrean jadi 100 task.

### Antrean Codex lengkap + renumber FEATURE_BACKLOG

- Memperbaiki penomoran `FEATURE_BACKLOG.md`: setelah section 7 (integrasi
  source-new) disisipkan, ada **dua section bernomor 8** (MCP dan Playwright).
  Section lama 7–12 digeser jadi 8–13, subsection dan cross-reference (`§N`,
  `Section N`) ikut disesuaikan. Hasil akhir: 8 MCP, 9 Playwright interaktif,
  10 Link repository, 11 Alur end-to-end, 12 Urutan implementasi, 13 Catatan
  keputusan teknis. Section 1–6 tidak berubah.
- Section 12 (urutan implementasi) diperbarui: integrasi source-new masuk sebagai
  langkah 10 — basis kode dirapikan dulu sebelum fitur baru ditumpuk di atas dua
  struktur yang bersaing.
- `scripts/codex-loop/queue.md` diisi **96 task** hasil breakdown seluruh item
  `- [ ]` di `FEATURE_BACKLOG.md` + sisa `TODO.md`, dikelompokkan:
  Blok A (18 task, integrasi source-new SRC-01–SRC-14 + DoD),
  Blok B (3, sisa sprint board), Blok C (10, link repository),
  Blok D (19, MCP server), Blok E (19, Playwright interaktif),
  Blok F (19, alur end-to-end AI QA loop), Blok G (8, automation & administrasi).
- Task SRC-09 dipecah jadi 3 batch dan urutan Blok A dibalik menjadi
  domain → helper → repository → service → hook → component → page → App,
  supaya tiap task punya dependensi yang sudah ada saat dikerjakan.
- Ditambah section **"Butuh Manusia"** (6 item) di luar antrean: jalankan migration
  ke Supabase target, set secret Edge Function provider AI, buat GitHub App/PAT,
  deploy Edge Function `repo-credentials`, keputusan sinkronisasi Issue↔GitHub,
  dan verifikasi end-to-end runner↔server. Driver tidak membaca section ini, jadi
  loop tidak membakar token untuk task yang pasti balik sebagai blocked.
- Seluruh task automation diberi batasan eksplisit "jangan jalankan migration ke
  Supabase target" — Codex hanya membuat file SQL, eksekusi tetap manual.
- `scripts/codex-loop/` dimasukkan ke `.gitignore` (tooling lokal, tidak di-commit).
  Diverifikasi `git check-ignore` cocok dan `git ls-files` menghasilkan 0 file terlacak.
- `TODO.md` diberi penunjuk ke antrean Codex; papan status tingkat tinggi tetap di sana.

### Codex task loop (otomasi antrean task)

- Menambah `scripts/codex-loop/` — driver bash yang menjalankan antrean task lewat
  `codex exec` tanpa perlu prompting manual tiap task selesai.
- Mekanisme: `queue.md` (task `- [ ]`) → `codex exec` sesi baru per task →
  laporan JSON dipaksa lewat `--output-schema verdict.schema.json`
  (`completed`/`blocked`/`needs_split`) → driver mengambil keputusan sendiri.
- Gate verifikasi milik driver (`CODEX_LOOP_GATE`, default `cd frontend && npm run build`)
  dijalankan setelah Codex lapor `completed`; klaim selesai tidak dipercaya begitu saja.
  Gate gagal → error dikirim balik sebagai konteks retry, lalu task dipindah ke Diblokir.
- Sesi baru per task dipilih supaya konteks tidak menumpuk antar task (hemat token).
- `needs_split` → followups otomatis masuk kembali ke antrean sebagai sub-task.
- Auto-commit per task (bisa dimatikan `--no-commit`); STOP file untuk berhenti rapi.
- Antrean awal diisi 7 task pertama dari FEATURE_BACKLOG.md section 7 (MCP scaffold +
  tool read-only) dan section 9 (link repository: migration, type/mapper/repository,
  service/hook, tab UI).
- Diverifikasi: `bash -n` bersih, `--dry-run` menghasilkan prompt yang benar, rotasi
  queue (Antrean → Selesai dengan catatan tanggal) diuji pada salinan file.
- Codex CLI terpasang versi 0.146.0; flag `--output-schema`, `--output-last-message`,
  `--sandbox`, `--cd` tersedia dan dipakai.

### Penambahan roadmap: MCP server, Playwright interaktif, link repository

- `FEATURE_BACKLOG.md`: menambah Section 7 (MCP Server TestManager multi-tool),
  Section 8 (Playwright lokal yang lebih interaktif), Section 9 (Link repository —
  local path / GitHub public / GitHub private via token), dan Section 10 (alur
  end-to-end Requirement → Verified). Section "Urutan implementasi" dan "Catatan
  keputusan teknis" di-renumber menjadi 11 dan 12.
- Section 7 mendefinisikan katalog tool per domain (discovery, write/workflow,
  automation, repo, analisis) + guardrail: tool destruktif tidak diekspos, mode
  read-only, project scoping wajib, audit ke `ai_audit_events`.
- Section 8 memisahkan mode eksekusi interaktif (headed/UI mode/debug/watch),
  authoring & codegen, bukti kegagalan lengkap (screenshot, video, trace, console
  log, network HAR, DOM snapshot), viewer di aplikasi, dan pause & inspect.
- Section 9 menetapkan tabel `project_repositories` + penyimpanan token di Supabase
  Vault (tidak plaintext, tidak pernah sampai ke browser), serta pemanfaatannya
  untuk konteks AI, sumber automation script, traceability commit, dan regression
  selection via `repo.diff`.
- Section 10 memetakan alur AI QA loop yang diminta menjadi 8 tahap dengan gate
  manusia eksplisit (review test case, approve test plan) dan kriteria selesai.
- Keputusan teknis baru dicatat di Section 12: MCP server = proses terpisah `mcp/`
  yang tetap tunduk RLS; server pusat tetap tidak pernah menjalankan browser;
  source code aplikasi under test tidak disimpan di server pusat; AI tidak boleh
  meng-approve.
- Belum ada perubahan kode/schema pada sesi ini — dokumentasi/perencanaan saja.

### Audit fitur repo pembanding

- Membandingkan repository lokal dengan `https://github.com/ffrz/shiftech-test-mgr` secara read-only.
- Repo pembanding memiliki fitur tambahan: project ownership/visibility, project membership/invite, Test Suite Library, activity/comment/mention, public profile, identity split, structured test steps, unplanned Test Run, duplicate project, React Query, dan Supabase Realtime.
- Fitur lokal yang harus dipertahankan: AI Integration, Playwright automation runner, CI/CD, backup/retention, dashboard/reporting, requirement traceability, API/webhook, dan self-hosted infrastructure.
- Strategi integrasi: port fitur repo pembanding secara additive dan bertahap; tidak melakukan merge atau menghapus fitur lokal.

## 2026-07-26

### Persiapan commit setelah sync fork

- Memeriksa status branch, reflog, dan riwayat commit setelah proses sync/pull fork.
- Tidak ditemukan merge conflict atau merge/rebase yang sedang berjalan.
- Perubahan kerja akan diamankan dalam commit baru; folder `.codex/` tetap dikecualikan dari commit sesuai keputusan sebelumnya.
- Percobaan push ke `origin/master` ditolak karena remote berada 244 commit di depan lokal (`non-fast-forward`); tidak ada force-push yang dilakukan.
- Menyiapkan penggantian histori `origin/master` dengan histori lokal menggunakan backup branch dan `git push --force-with-lease` sesuai permintaan.

### 2026-07-26 — Fix AI_INVALID_OUTPUT ai-gateway (schema hint untuk provider nyata)

- Setelah CORS diperbaiki, OpenAI terpanggil tapi balas `AI_INVALID_OUTPUT`: output JSON tidak lolos `AnalysisOutputSchema` (strict). Penyebab: prompt tidak pernah memberi tahu provider bentuk output yang diharapkan (nama field, enum, nesting) — mock provider selalu pas karena hard-coded, provider nyata menebak. Modul AI sebelumnya hanya teruji mode mock.
- Fix di `contract.ts`: tambah `OUTPUT_SCHEMA_HINT` (contoh JSON shape per action) yang disuntikkan ke prompt (`handler.ts`) + instruksi ketat "hanya key ini, enum ini, id disalin dari scopedContext". Skema OUTPUT dilonggarkan dari `.strict()` → strip unknown keys + `.default([])` pada array + `counts.partial()` (counts di-recompute server-side, jadi longgar aman). REQUEST schema tetap strict.
- Redeploy `ai-gateway` version 4 ACTIVE. VERIFIED end-to-end dari browser: `ai_audit_events` mencatat `action=test_run_analysis, provider=openai, model=gpt-4o-mini, status=completed, latency 3279ms, error_code=null`. Output analisis kontekstual nyata (bukan mock). Section 4 AI Integration fungsional dengan OpenAI.
- Catatan minor (belum difix): retest recommendation menampilkan `TC-UNKNOWN` karena OpenAI kadang mengembalikan `testCaseId` yang bukan uuid asli dari scopedContext → lookup `analysisResponse` gagal. Kosmetik, bisa diperbaiki dengan resolve testCaseId by code juga.

### 2026-07-26 — Fix CORS ai-gateway (browser blokir POST)

- Gejala: dari browser muncul "AI gateway tidak dapat memproses analisis Test Run"; `ai_audit_events` kosong (gagal sebelum audit insert). Log Edge Function menunjukkan hanya `OPTIONS 204` untuk percobaan user, TANPA `POST` sama sekali.
- Akar masalah: `corsHeaders` di `security.ts` hanya mengizinkan `authorization, content-type, x-request-id`. `supabase.functions.invoke` mengirim juga header `apikey` dan `x-client-info`, sehingga CORS preflight gagal → browser MEMBLOKIR POST sebelum terkirim. (Curl lolos karena CORS hanya ditegakkan browser — itu sebabnya smoke test awal hijau tapi UI gagal.)
- Fix: `access-control-allow-headers` ditambah `x-client-info, apikey, x-supabase-api-version`. Redeploy `ai-gateway` (version 3, ACTIVE). Terverifikasi via curl OPTIONS: preflight kini mengembalikan allow-headers lengkap.
- Bukan masalah OpenAI/secret — audit kosong membuktikan kegagalan terjadi sebelum provider dipanggil. Kunci diagnosis: OPTIONS-tanpa-POST = preflight ditolak browser.

### 2026-07-26 — Section 4: deploy Edge Function ai-gateway — FUNGSIONAL

- Menutup gap terbesar audit: seluruh fitur AI (Section 4, 8 item `[x]`) memanggil `supabase.functions.invoke('ai-gateway')` tapi Edge Function-nya belum pernah di-deploy → semua tombol AI error runtime.
- Deploy `ai-gateway` (5 file: index/handler/contract/providers/security) ke Supabase target `fohuxwzczepdqyrfkovc` via MCP `deploy_edge_function`, `verify_jwt=true`, status ACTIVE version 1. Tidak ada perubahan source; file sudah ada di `supabase/functions/ai-gateway/`.
- Prasyarat terverifikasi: migration `023_p3_ai_integration` sudah diterapkan; RPC `consume_ai_rate_limit(p_project_id uuid, p_action text, p_limit int, p_window_seconds int)` cocok persis dengan pemanggilan handler; tabel `ai_audit_events`/`ai_rate_limits` ada.
- Smoke test remote (anon JWT, karena user JWT hanya ada di browser): `OPTIONS`→204 (CORS preflight); body valid + token non-user→`AUTH_INVALID` 401 (fungsi boot, import esm.sh zod + supabase-js resolve, schema+validateInput lolos, sampai `authenticate`); body ngaco→`INVALID_REQUEST` 400 (zod union). Envelope error terstruktur, bukan crash boot → deployment sehat.
- Provider default `mock` (createProvider fallback) → fitur AI langsung berfungsi menghasilkan draft tanpa API key. Untuk output AI nyata set secret Edge Function `AI_PROVIDER` + `OPENAI_API_KEY`/`GEMINI_API_KEY` via dashboard/`supabase secrets set` (tidak tersedia via MCP).

### 2026-07-26 — Section 3: webhook HTTP delivery (schema_028) — FUNGSIONAL

- Menutup satu-satunya gap fungsional Section 3: webhook hanya enqueue tanpa pengirim. CI/CD "kirim status balik" ternyata sudah jalan (response sinkron `ingest_cicd_test_run`), jadi tidak perlu diubah.
- Kendala desain: HMAC butuh raw secret, tapi skema hanya menyimpan `secret_hash` (SHA-256). Solusi: raw secret disimpan di Supabase Vault (`supabase_vault` 0.3.1 sudah terpasang di target).
- `schema_028_webhook_dispatch.sql` (diterapkan sebagai migration `028a`+`028b`): `create extension pg_net`, `pg_cron`. Kolom `webhook_deliveries.request_id` + status baru `sending`. `create_webhook` di-recreate agar juga menulis secret ke Vault; tambah `rotate_webhook_secret(uuid)` (rotate + backfill Vault untuk webhook lama). Dispatcher in-database: `dispatch_pending_webhooks` (klaim SKIP LOCKED → HMAC-SHA256 via `pgcrypto.hmac` → `net.http_post`, header `X-TM-Signature: sha256=…`), `reconcile_webhook_deliveries` (baca `net._http_response` → delivered/retrying/failed + exponential backoff), `run_webhook_dispatch` wrapper. Dijadwalkan `cron.schedule('webhook-dispatch','* * * * *', ...)`.
- Keamanan: fungsi dispatcher di-`revoke` dari public/anon/authenticated (hanya dijalankan cron sebagai owner); `rotate_webhook_secret` di-grant ke `authenticated`. Body ditandatangani atas `payload::text` (sama dengan yang dikirim `pg_net`).
- Verifikasi end-to-end pada target: webhook uji → `postman-echo.com/post` → `dispatch` set `sending`/request_id, `reconcile` set `delivered` + HTTP 200; signature yang diterima endpoint == HMAC yang dihitung ulang (`signature_valid=true`). Data uji dibersihkan. Target tidak punya webhook lama, jadi tidak ada yang perlu di-rotate.
- Frontend: `integrationRepository.rotateWebhookSecret` → service passthrough → tombol "Rotate secret" di tab Webhook `IntegrationsPage` (tampilkan secret sekali via `oneTimeSecret`); teks helper diperbarui (dispatcher pg_cron + HMAC). `npm run build` (tsc -b + vite) hijau; hanya warning bundle-size lama.
- Sisa Section 3: backup/restore binary Storage (saat ini metadata-only).

### 2026-07-26 — Audit fungsional semua fitur FEATURE_BACKLOG

- Verifikasi 3-lapis (kode frontend ter-wire → migration/tabel di Supabase target `fohuxwzczepdqyrfkovc` → Edge Function/Storage runtime) untuk semua item `[x]`.
- DB target: 27 migration terterap (s/d `027`), semua tabel inti + P1/P2/P3 ada, RLS aktif, `get_advisors` security = 0 ERROR (68 WARN: search_path/security-definer executable — non-blocking). Buckets `issue-attachments`, `test-attachments`, `automation-artifacts` ada.
- GAP KRITIS ditemukan: (1) Edge Function `ai-gateway` BELUM di-deploy (hanya `automation-artifacts` ACTIVE) → seluruh fitur AI Section 4 gagal saat runtime (semua repo `functions.invoke('ai-gateway')`). (2) Webhook Section 3: enqueue jalan (trigger `trg_p2_webhook_*` → `webhook_deliveries`), tapi TIDAK ada dispatcher HTTP (pg_net/pg_cron tidak terpasang, tidak ada Edge Function pengirim) → delivery + HMAC tidak pernah menembak. (3) CI/CD "kirim status balik ke pipeline" (outbound) ikut terdampak gap dispatcher yang sama. (4) Backup/restore metadata-only (bukan binary Storage) — sesuai catatan backlog.
- Section 5 Automation terverifikasi fungsional end-to-end sesi sebelumnya (enqueue→poll→playwright→hasil→artifact upload). Item `[ ]` jujur: Scheduled Test Run, validasi/sandbox script runner.
- Tidak ada perubahan kode pada sesi audit ini; murni verifikasi read-only.

### 2026-07-26 — Coordinator: integrasi AI Integration

- Menjalankan Graphify build/query/path wajib sebelum membaca source; setelah perubahan Graphify diperbarui. Agent paralel digunakan untuk arsitektur/security, Edge Function, generator Test Case, analisis Test Run, Issue/assistant, dan QA review.
- Mengintegrasikan `supabase/functions/ai-gateway/` dengan provider abstraction mock/OpenAI/Gemini, canonical action contract, Zod validation, bearer auth, project/RLS isolation, redaction, timeout/retry terbatas, durable RPC rate limit, dan structured error/envelope. Mock menjadi default development; secret hanya di Edge Function.
- Menambahkan `supabase/schema_023_p3_ai_integration.sql`: penguatan `is_admin`/`is_approved`/`has_project_access`, tabel metadata `ai_audit_events`, tabel/rpc `ai_rate_limits`/`consume_ai_rate_limit`, RLS, dan tanpa penyimpanan prompt/response mentah.
- Menambahkan frontend layer `aiRepository`, AI services/hooks, parser Excel/document, Zod draft validation, UI review/save Test Case, UI analisis Test Run read-only, UI draft Issue/duplicate review, serta AI Assistant project-scoped. Semua approval dicatat sebagai metadata audit; Issue severity/reproduction steps dipertahankan di description karena schema Issue existing belum memiliki kolom tersebut.
- Menambahkan Vitest (`npm run test`) dan `src/helpers/aiIntegration.test.ts` untuk validasi output, duplicate confidence, dan summary. Menambahkan `docs/AI_INTEGRATION.md` serta memperbarui README Edge Function dan FEATURE_BACKLOG AI.
- Verifikasi: `npm run test` lulus (1 file, 4 test); `npm run build` lulus; `npm run lint` lulus dengan warning lama Fast Refresh/dependency hook saja; `git diff --check` lulus. Deno/Supabase CLI dan Supabase remote tidak tersedia, sehingga contract test Edge Function, penerapan migration/RLS remote, dan deployment provider belum diverifikasi.
- Warning: build menghasilkan bundle utama sekitar 2.26 MB; npm audit melaporkan 3 high vulnerabilities setelah instalasi Vitest dan perlu ditinjau terpisah. Migration 023 serta secret provider wajib diterapkan sebelum production.

### 2026-07-26 — Final integration verification AI

- Menyelaraskan canonical request/response antara frontend dan Edge Function (termasuk envelope `data/meta`, action `generate_test_cases`, `test_run_analysis`, `issue_draft`, `duplicate_issue_detection`, `assistant_search`) dan menambahkan retrieval requirement/history yang tetap project-scoped.
- Menambahkan durable audit update policy, approval audit event, manager approval guard, UI AI Issue draft, dan AI Assistant panel.
- `graphify update .` berhasil; query AI architecture dan path TestRun→TestResult berjalan setelah update.
- Final: `npm run test` 4/4 lulus, `npm run build` lulus, `npm run lint` exit 0 dengan 6 warning existing, `git diff --check` lulus. `npm audit --omit=dev` tidak dapat diverifikasi karena DNS registry (`EAI_AGAIN`); npm install sebelumnya melaporkan 3 high vulnerabilities yang perlu follow-up.

## 2026-07-26 — Fix permission denied attachment RLS helpers (schema_027)

- User kena "permission denied for function attachment_project_id" saat membuka attachment. Root cause pre-existing (bukan dari pekerjaan automation): `attachment_project_id(text,uuid)`, `can_upload_attachment(text,uuid)`, `can_delete_attachment(text,uuid)` kehilangan EXECUTE untuk role `authenticated` akibat revoke terlalu luas di hardening lama. Ketiganya SECURITY DEFINER dan dipanggil DI DALAM policy RLS `attachments` + `storage.objects` (bucket test-attachments) yang dievaluasi sebagai role pemanggil → caller wajib punya EXECUTE.
- Migration `schema_027_fix_attachment_helper_grants.sql` (via MCP): `grant execute ... to authenticated` untuk ketiga fungsi. Konsisten dengan helper RLS lain (`has_project_access`/`has_issue_access`) yang memang executable oleh authenticated. Verifikasi: `has_function_privilege('authenticated', ...)` = true untuk ketiganya. Target kini di migration `027_fix_attachment_helper_grants`.

## 2026-07-26 — Auto-upload artifact ke Supabase Storage (BERHASIL end-to-end)

- Menambahkan auto-upload artifact binary (screenshot/video/trace/log) ke Supabase Storage. Desain aman: service role TIDAK pernah ke runner; runner minta signed upload URL ke Edge Function memakai runner token (pola sama seperti ai-gateway).
- DB: migration `schema_026_automation_artifacts_storage.sql` — bucket private `automation-artifacts` + policy select `storage.objects` untuk project member (`has_project_access(split_part(name,'/',1)::uuid)`). Path object: `{project_id}/{job_id}/{filename}`. Diterapkan via MCP.
- Edge Function `supabase/functions/automation-artifacts/index.ts` (deployed via MCP, verify_jwt=true): validasi runner token (sha256 → `automation_runners`) + kepemilikan job, lalu `createSignedUploadUrl` per file dan mengembalikan `uploadUrl` absolut. Service role diambil dari env Edge Function.
- Runner: modul baru `src/upload.ts` (minta signed URL → PUT tiap file → fallback ke path lokal bila upload mati/gagal), `collectArtifacts` kini mengembalikan file lokal (`CollectedArtifact`), executor mengembalikan artifact lokal, loop `runner.ts` memanggil `uploadArtifacts` sebelum `report`. Config toggle `TM_ARTIFACT_UPLOAD` (default true). `ReportArtifact` menambah `path`/`bucket`.
- Frontend: `AutomationArtifact` menambah `path`/`bucket`; `automationRepository.getArtifactSignedUrl` (`storage.createSignedUrl`, 120s); `AutomationPage` membuka artifact via signed URL saat diklik (fallback http / info bila lokal).
- Verifikasi end-to-end (re-enqueue, runner versi baru): 2 job selesai (pass+fail), object fisik tersimpan di bucket = 8 file (2 screenshot, 2 video, 2 trace .zip, 2 log), 3.7 MB. Metadata `automation_jobs.artifacts` berisi `path`+`bucket`. Verifikasi lokal: runner `typecheck` EXIT 0; frontend `build` + `lint` (oxlint) EXIT 0 tanpa error baru. `graphify update` → 1433 node.
- Sisa/blocker: pembersihan artifact lama belum dihubungkan ke retensi (bucket automation-artifacts belum masuk `cleanup_retention`); mengandalkan Edge Function berarti butuh runtime Edge (sudah aktif di target). Runner uji masih berjalan di background pada sesi ini.

## 2026-07-26 — Uji end-to-end automation BERHASIL

- Setup runner lokal untuk uji: `runner/.env` (URL/anon key/token runner `local-dev`), `npm run build`, `runner/example-project` (Playwright + `smoke.spec.ts` PASS, `broken.spec.ts` FAIL), `npx playwright install chromium`. Runner dijalankan di background (`node dist/index.js`) → log `Runner authenticated` + `Polling for jobs`.
- Data uji: project `Sample Project`, plan `TP-0001 Release QA - Sample` (TC-0001, TC-0002). Mapping via UI: TC-0001→`tests/smoke.spec.ts`, TC-0002→`tests/broken.spec.ts`. Enqueue via UI.
- Hasil terverifikasi (log runner + `execute_sql`): runner menarik 2 job, menjalankan Playwright lokal, melapor balik. Run `TR-0003` (in_progress, manual completion). TC-0001 → job `passed`, `test_results.status=pass`, 4 artifact. TC-0002 → job `failed`, `test_results.status=fail`, 4 artifact. Loop enqueue→poll→execute→report→test_results terbukti utuh.
- Catatan: artifact dilaporkan sebagai metadata path `file://` lokal (TM_ARTIFACT_BASE_URL kosong) — belum upload binary ke Storage (deliverable terpisah). Runner masih berjalan di background pada sesi ini.

## 2026-07-26 — Fix 2 bug runtime pasca-apply (schema_025)

- Uji manual "Runner Baru" gagal → cek `get_logs(postgres)` menemukan 2 bug laten dari migration lama yang baru pertama kali dijalankan di Supabase nyata:
  1. `function digest(text, unknown) does not exist`: pgcrypto (`digest`/`gen_random_bytes`) ada di schema `extensions` pada Supabase, tapi fungsi token dibuat dengan `search_path = public`. Terkonfirmasi via `pg_proc`→`digest_schema=extensions`.
  2. `audit_logs violates check constraint audit_logs_action_check`: `write_audit_log()` menulis `lower(tg_op)` = insert/update/delete, sedangkan constraint hanya izinkan created/updated/deleted → semua write ke 8 tabel teraudit (termasuk `test_runs`/`test_results` yang dipakai enqueue automation) ter-rollback.
- Migration baru `supabase/schema_025_fix_pgcrypto_and_audit.sql` (diterapkan via MCP): `alter function ... set search_path = public, extensions` untuk 5 fungsi automation + 3 fungsi CI/CD + 2 fungsi API/webhook yang memakai `digest`; dan `create or replace write_audit_log()` dengan mapping `case tg_op INSERT→created/UPDATE→updated/DELETE→deleted` (execute tetap di-revoke).
- Verifikasi: memanggil `heartbeat_automation_runner('dummy')` kini mengembalikan `INVALID_RUNNER_TOKEN` (bukan lagi error `digest`), membuktikan pgcrypto resolve. Target kini di migration `025_fix_pgcrypto_and_audit`.
- Catatan: log juga menampilkan `permission denied for function attachment_project_id` (fitur backup/attachment RLS) — belum diperbaiki, tidak memblokir automation; perlu ditinjau terpisah. Bug yang sama (`digest` search_path & audit action verb) juga ada di file repo `schema_019/020/022/schema_p2_workflow`; schema_025 memperbaikinya di DB secara forward-only tanpa mengedit migration lama.

## 2026-07-26 — Apply migration P2+P3 ke Supabase target (via MCP)

- Menambahkan Supabase MCP server (`.mcp.json`, project_ref `fohuxwzczepdqyrfkovc`); user authenticate via `/mcp`. Semua DDL dijalankan lewat `mcp__supabase__apply_migration` (transaksional per migration).
- Temuan: target ternyata masih di migration `017_p1_rpc_hardening` — seluruh P2 (018-022), AI (023), DAN file un-numbered `schema_p2_workflow.sql` (audit_logs, test_case_versions, notifications) BELUM pernah keapply. `schema_p2_workflow` adalah prasyarat karena `integration_audit` menulis ke `audit_logs`, dan `schema_024` butuh kolom `test_runs.ci_provider` dari `schema_020`.
- Menerapkan berurutan (dikonfirmasi user): `p2_workflow_base` → `018_p2_dashboard_reporting` → `019_p2_api_webhooks` → `020_p2_cicd` → `021_p2_backup_retention` → `022_p2_security_hardening` → `023_p3_ai_integration` → `024_p3_automation`. Semua sukses. `list_migrations` mengonfirmasi target kini di `024_p3_automation` (25 migration total).
- Menambahkan `drop policy if exists` sebelum setiap `create policy` pada versi yang diterapkan (018/019/021/022/023) agar idempotent; isi fungsi/tabel identik dengan file repo.
- Verifikasi automation via `execute_sql`: 3 tabel (`automation_runners/scripts/jobs`), 7 RPC, 9 RLS policy, kolom `test_runs.ci_provider` ada, RLS aktif di ketiga tabel.
- `get_advisors(security)`: 0 ERROR. Warning `security_definer_function_executable` (59) menyala di semua RPC project (by-design, otorisasi internal via token hash / `can_edit_project_content`); `function_search_path_mutable` (7) dan `rls_enabled_no_policy` (`api_token_rate_limits`) semuanya pre-existing dari migration lama. Satu perbaikan diterapkan: `revoke execute on validate_automation_script_case()` (trigger helper, bukan RPC publik) — ikut konvensi hardening schema_022; file `schema_024` lokal ikut diperbarui.
- Blocker tersisa: uji end-to-end runner↔server (butuh runner CLI dijalankan + project Playwright nyata); webhook HTTP dispatcher, HMAC signing, dan binary Storage upload/artifact tetap butuh Edge Function/worker + secret store (belum di-deploy). Edge Function `ai-gateway` juga belum di-deploy ke target.

## 2026-07-26 — CLI Playwright Local Runner (folder runner/)

- Membuat deliverable terpisah `runner/`: CLI/agent Node 20+ TypeScript yang menjalankan Playwright di mesin lokal dan melapor ke server pusat lewat RPC `schema_024`. Sengaja tanpa runtime dependency — Playwright dipanggil via CLI (`child_process`), komunikasi server via `fetch` bawaan Node; hanya devDependency TypeScript + @types/node.
- Struktur: `src/config.ts` (loader `.env` zero-dep, env override menang), `src/logger.ts`, `src/api.ts` (client RPC `heartbeat`/`poll`/`report` ke `${SUPABASE_URL}/rest/v1/rpc/*` dengan anon key + runner token di body), `src/artifacts.ts` (kumpulkan screenshot/video/trace/log → metadata), `src/executor.ts` (`npx playwright test <script_ref> --output=... --trace=on`, timeout, isolasi per-job dir), `src/runner.ts` (loop heartbeat→poll→execute→report + graceful shutdown SIGINT/SIGTERM + fail-fast token ditolak), `src/index.ts` (entry).
- Mapping hasil: exit 0→`pass`, selain itu→`fail`, timeout/spawn error→`blocked`; `retry` diminta saat `attempt < max_attempts` (server yang memutuskan requeue). Routing via label runner (subset match) dilakukan server di `poll_automation_job`.
- Koneksi outbound-only (pull-based): runner tidak membuka port apa pun, aman di balik NAT/firewall/VPN. Konsisten dengan model arsitektur Section 5.
- Tambahan: `Dockerfile` (base image resmi `mcr.microsoft.com/playwright`, project under test di-mount saat runtime), `README.md`, `.env.example`, `.gitignore`, `package.json`, `tsconfig.json` (NodeNext, import relatif pakai ekstensi `.js`).
- Verifikasi: `npm install --ignore-scripts` (3 paket, tanpa download browser), `npm run typecheck` (tsc --noEmit) EXIT 0, `npm run build` menghasilkan `dist/` lengkap. Belum ada uji end-to-end runner↔server karena butuh Supabase target + project Playwright nyata.

## 2026-07-26 — Implementasi Section 5 Automation (sisi server pusat, Local Runner)

- Graphify: `graphify query "cicd pipeline token ingest test run orchestration"` untuk orientasi (modul CI/CD `schema_020` jadi template terdekat), lalu `graphify update .` di akhir — graph jadi 1286 node, 2684 edge, 102 community. Warning lama `hooks.json` zero nodes tetap muncul.
- Migration baru `supabase/schema_024_p3_automation.sql` (tidak mengubah migration lama): tabel `automation_runners`, `automation_scripts` (mapping Test Case↔script, referensi bukan body), `automation_jobs`; trigger `set_updated_at` + validasi project; RLS project-scoped (jobs read-only untuk client, semua write via RPC); token disimpan hash SHA-256 (prefix `tm_`).
- RPC kontrak Local Runner (pull-based, outbound-only, security definer): `create_automation_runner`, `rotate_automation_runner_token` (authenticated); `enqueue_automation_jobs` (buat Test Run in_progress + seed `test_results` + antre job per Test Case yang punya script); `poll_automation_job` (FOR UPDATE SKIP LOCKED + `required_labels <@ runner.labels` untuk multi-runner); `report_automation_job` (hasil→`test_results` pass/fail/blocked/skip, retry saat sisa attempt, simpan artifact metadata); `heartbeat_automation_runner`; `cancel_automation_job`. Grant: RPC manager→authenticated, RPC runner→anon+authenticated (sejalan pola `ingest_cicd_test_run`).
- Frontend mengikuti layering: `types/domain.ts` (AutomationRunner/Script/Job/Artifact + status), `helpers/mappers.ts` (3 mapper), `repositories/automationRepository.ts`, `services/automationService.ts` (generate token 32-byte, normalisasi label, validasi), `hooks/useAutomation.ts`, `pages/automation/AutomationPage.tsx` (tab Runner/Mapping Script/Job + dialog enqueue & tampil token sekali). Route `/projects/:id/automation` di `App.tsx` dan menu pin di `AppMenu.tsx`.
- Keputusan: server pusat tidak pernah menjalankan browser; Run tetap `in_progress` (completion manual); hasil selalu di `test_results`, tidak di `test_cases`/`test_plan_cases`. Test Case tanpa script mapping tetap `not_run` untuk tes manual.
- Verifikasi lokal: `npm run build` (tsc -b && vite build) berhasil; `npm run lint` (oxlint) berhasil tanpa error, hanya 9 warning lama (Fast Refresh, exhaustive-deps) — tidak ada warning dari file baru.
- Belum dikerjakan / blocker: migration `schema_024` BELUM dijalankan/diverifikasi pada Supabase target sesi ini (checkbox backlog tetap `[ ]` sesuai konvensi). CLI/agent Local Runner adalah deliverable project terpisah (memakai RPC di atas). Scheduled Test Run dan Storage adapter untuk artifact binary belum ada — job hanya menyimpan metadata/URL artifact.

## 2026-07-26 — Perjelas Section 5 FEATURE_BACKLOG.md (Playwright Local Runner)

- Merombak Section 5 "Automation dan Playwright" untuk menegaskan bahwa Playwright TIDAK dijalankan di server pusat self-hosted.
- Menetapkan model arsitektur **Local Runner** (mirip self-hosted runner GitHub Actions): CLI/agent di mesin lokal tester/on-prem yang berada di jaringan yang sama dengan aplikasi under test.
- Koneksi **pull-based (outbound-only)** dipilih (rekomendasi, user menyerahkan keputusan): runner polling job ke server pusat via API token (reuse token P2), push hasil + artifact balik. Mesin lokal tidak perlu buka port, aman di balik NAT/firewall/VPN.
- Menyusun ulang checklist jadi 3 kelompok: Playwright Local Runner (sisi mesin lokal), Orkestrasi job (sisi server pusat), Skalabilitas & keamanan. Server pusat hanya enqueue job, terima hasil, simpan artifact ke Storage — tidak menjalankan browser.
- Menyelaraskan penamaan pada Section 7 (urutan implementasi) mengikuti struktur baru.
- Perubahan dokumentasi saja; tidak menyentuh kode, schema, atau migration.

## 2026-07-26 — Sub-agent 4: AI Test Run Analysis frontend contract

- Menjalankan Graphify query `test run analysis regression summary retest recommendation` dan path `TestRun` → `TestResult` sebelum membaca source.
- Menambahkan kontrak frontend `v1` untuk gateway `ai-gateway` dengan action `test_run_analysis`; request hanya membawa `projectId` dan `testRunId`, sehingga provider AI tidak dipanggil langsung dari browser.
- Menambahkan schema Zod strict untuk response analysis, scope check project/Test Run, mode `review_only`, status `draft`/`review_required`, regression summary, failure patterns, risk areas, dan retest recommendations.
- Menambahkan `aiTestRunAnalysisRepository`, `aiTestRunAnalysisService`, `useTestRunAnalysis`, helper kalkulasi summary, serta `TestRunAnalysisPanel` read-only pada detail Test Run. Panel menampilkan PASS/FAIL/SKIP/BLOCKED/NOT RUN dan tidak memiliki aksi untuk mengubah result/run.
- Tidak mengubah Edge Function, migration SQL, route global, `test_cases`, `test_plan_cases`, atau status Test Result/Test Run.
- Verifikasi unit test dilewati karena package/toolchain Vitest belum tersedia dan sesuai instruksi check-in tidak menjalankan command panjang tambahan. Build/lint/Graphify update perlu dijalankan oleh coordinator setelah integrasi.

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

### 2026-07-26 — Audit potensi bug (read-only, tanpa perubahan kode)

- Graphify dijalankan lebih dulu untuk orientasi (query: test run summary, dashboard report, hooks, issue/requirement/attachment, tag/excel, auth). Pembacaan source hanya pada node relevan; skema diverifikasi via `supabase/schema_test_management_v2.sql`.
- Tidak ada perubahan kode pada sesi ini — hanya temuan. Ringkasan temuan (severity):
  - HIGH: `tagRepository.findOrCreate` memakai `.ilike('name', name)` → karakter `_`/`%` pada nama tag diperlakukan sebagai wildcard; dedup salah, dan bila pola cocok >1 baris `.maybeSingle()` melempar error → save/import tag gagal. Rekomendasi: `.eq('name', name)` (sesuai unique constraint case-sensitive) atau escape wildcard.
  - HIGH: `useAuth.tsx` — `loadProfile` di dalam `onAuthStateChange` tanpa try/finally; bila `getOwnProfile` reject, `setLoading(false)` tak pernah jalan → app stuck di loading screen.
  - MEDIUM: batas default 1000 baris PostgREST pada `dashboardReportRepository.findResults/findRuns` dan `testResultRepository.getSummaryByRunIds` (agregasi client-side) → total/pass/fail/progress bisa terpotong diam-diam pada data besar. Rekomendasi: agregasi via RPC atau paginasi `.range()`.
  - MEDIUM: race stale-response di `useTestRunDetail`/`useTestPlanDetail`/`useTestRuns` (tanpa cancellation guard seperti di `useProjectRole`).
  - MEDIUM (laten): `useTestRuns(testPlanId, filters)` — bila dipanggil dengan objek `filters` inline, `useCallback` berubah tiap render → loop reload. Saat ini hanya dipanggil tanpa filters.
  - LOW: `issueService.create` tak memvalidasi test result FAIL (PRD: issue 0..N per FAIL); `recordResult` tak mencegah pencatatan pada run `completed` dan tetap set `executed_at` walau status dikembalikan ke `not_run`; fallback `getSummaryByRunIds` di testRunService mengabaikan skip/blocked/notRun (dead code); komentar `issueRepository.findAllByProject` salah label ("across an entire test run").
- Verifikasi: pembacaan statis + konfirmasi skema (default `test_results.status='not_run'`, unique `tags(project_id,name)`). Build/lint tidak dijalankan (tanpa perubahan kode).
### 2026-07-26 — Sub-agent 5: Frontend AI Issue dan Assistant Contract

- Graphify wajib dijalankan lebih dulu: query `issue duplicate detection AI assistant project search` dan path `TestCase` → `Issue`.
- Menambahkan kontrak frontend `aiRepository` untuk memanggil Supabase Edge Function `ai-gateway`; frontend tidak memegang provider/API key.
- Menambahkan Zod validation, draft Issue dari Test Result FAIL, review gate sebelum save, duplicate candidate confidence/reason dengan allow-list project aktif, serta assistant search terstruktur yang memfilter response ke project aktif.
- Menambahkan hook `useAiIssueWorkflow` dan `useAiAssistant` yang mengambil auth context dan project context; tidak menambah route, migration, Edge Function, atau mengubah scope agent lain.
- Karena schema `issues` saat ini belum memiliki `severity`/`reproduction_steps`, adapter save mempertahankan data tersebut di description secara eksplisit tanpa migration.
- Verifikasi: patch berhasil diterapkan; full build/lint/test tidak dijalankan sesuai arahan coordinator untuk menghentikan command panjang. Vitest belum tersedia di `package.json`.

### 2026-07-26 — Fix bug hasil audit (HIGH + race guard)

- Graphify dipakai untuk orientasi ulang sebelum edit; perubahan hanya pada baris spesifik yang sudah teridentifikasi di audit.
- FIX HIGH #1 — `frontend/src/repositories/tagRepository.ts`: `findOrCreate` diganti dari `.ilike('name', name)` ke `.eq('name', name)`. Menghindari `_`/`%` diperlakukan sebagai wildcard (dedup salah / `maybeSingle()` melempar saat >1 baris cocok → save & import tag gagal) sekaligus konsisten dengan constraint `unique (project_id, name)`.
- FIX HIGH #2 — `frontend/src/hooks/useAuth.tsx`: `loadProfile` di dalam `onAuthStateChange` dibungkus `try/finally` agar `setLoading(false)` selalu jalan meski profil gagal dimuat (mencegah app terkunci di loading screen).
- FIX MEDIUM #4 — race guard `requestRef` (monotonic id) di `useTestRunDetail.ts`, `useTestPlanDetail.ts`, `useTestRuns.ts` agar respons lama tak menimpa yang baru saat id berubah cepat.
- FIX LOW — koreksi komentar `issueRepository.findAllByProject` (sebelumnya salah label "across an entire test run").
- Belum diperbaiki (butuh keputusan desain, direkomendasikan sebagai follow-up): #3 batas 1000 baris PostgREST pada agregasi dashboard report/summary (perlu paginasi `.range()` atau RPC agregasi server-side); #5 footgun `useTestRuns` bila `filters` inline (laten, belum terpicu); #6/#7 business rule (issue hanya untuk FAIL, larangan record pada run completed).
- Verifikasi: `npx tsc -b --noEmit` → exit 0 (typecheck lulus). `npm run lint` (oxlint) → exit 0, hanya warning lama yang tidak berkaitan dengan file yang diubah. Build penuh & verifikasi Supabase remote tidak dijalankan pada sesi ini.

### 2026-07-26 — Fix bug #3: paginasi agregasi (batas 1000 baris PostgREST)

- Graphify dipakai untuk orientasi ulang sebelum edit; perubahan pada baris query spesifik yang sudah teridentifikasi.
- Tambah helper `frontend/src/repositories/paginate.ts` (`fetchAllRows`): loop `.range(from, to)` sampai page < pageSize (default 1000), agar row set penuh terbaca — bukan terpotong diam-diam di 1000 baris.
- Terapkan pada agregasi client-side:
  - `dashboardReportRepository.findRuns`, `findResults`, `findIssues`
  - `testResultRepository.getSummaryByRunIds`, `getDistinctTestersByRunIds`
- Dampak: total/pass/fail/passRate/failRate/progress di Dashboard Report dan summary Test Run kini akurat pada data > 1000 baris.
- Catatan sisa (belum diubah): `.in(resultIds/runIds)` dengan list sangat besar berpotensi kena batas panjang query string PostgREST — isu terpisah dari row cap, dicatat untuk follow-up bila jumlah id membesar.
- Verifikasi: `npx tsc -b --noEmit` → exit 0; `npm run lint` (oxlint) → exit 0, tanpa warning baru dari file yang diubah.

### 2026-07-26 — Fix bug #5, #6, #7 (footgun hook + business rule)

- Graphify dipakai untuk orientasi call site (TestRunDetailPage, aiIssueService) sebelum edit. Dikonfirmasi AI issue workflow sudah membatasi draft ke result FAIL, sehingga guard service konsisten dan tidak memutus alur AI.
- FIX #5 — `frontend/src/hooks/useTestRuns.ts`: dependency `useCallback` diubah dari objek `filters` (identitas) ke `filtersKey = JSON.stringify(filters)`, dan filters di-parse ulang di dalam callback. Menghilangkan risiko loop reload tak berujung bila caller mengoper objek `filters` inline. Lolos exhaustive-deps tanpa warning.
- FIX #6 — `frontend/src/services/issueService.ts`: `create` kini async dan memvalidasi via `testResultRepository.findExecutionContext` bahwa test result berstatus `fail` sebelum membuat issue (PRD: Issue 0..N per hasil FAIL). Berlaku untuk semua caller (dialog manual, AI workflow, otomatisasi mendatang), bukan hanya UI.
- FIX #7a — `frontend/src/services/testRunService.ts`: `recordResult` kini async, menolak pencatatan bila run sudah `completed` ("buka kembali/reopen dulu"). Ditambah guard UX di `TestRunDetailPage` — tombol "Catat" disembunyikan saat run completed (alur reopen sudah ada).
- FIX #7b — `frontend/src/repositories/testResultRepository.ts`: `executed_at` di-set `null` saat status dikembalikan ke `not_run` (sebelumnya selalu stamp now → timestamp eksekusi tertinggal padahal summary menghitungnya belum dieksekusi). Ditambah method `findExecutionContext` (1 round trip: status result + status run) untuk mendukung guard #6/#7a.
- Verifikasi: `npx tsc -b --noEmit` → exit 0; `npm run lint` (oxlint) → exit 0, tanpa warning baru dari file yang diubah. Build penuh & verifikasi Supabase remote tidak dijalankan pada sesi ini.

### 2026-07-26 — Benchmark penghematan token Graphify

- Menjawab pertanyaan tentang dampak Graphify berdasarkan graph proyek yang sudah ada: 240 file/~160 ribu kata, 1.445 node, dan 2.901 edge.
- Menjalankan `graphify benchmark`: rata-rata konteks query turun dari ~15.504 token menjadi sekitar 6,2x lebih hemat; variasi per pertanyaan 3,4x–41,3x.
- Tidak ada perubahan kode aplikasi.

### 2026-07-31 — Port additive fitur ownership dan invitation

- Graphify dijalankan terlebih dahulu untuk memetakan project settings, domain Project, RBAC, repository, dan service sebelum membaca source terkait.
- Menambahkan migration `supabase/schema_029_project_ownership_visibility.sql` untuk ownership project, visibility (`private`/`unlisted`/`public`), lifecycle invitation (`invited`/`accepted`/`declined`), helper access check, RLS, dan RPC `respond_to_project_invitation`.
- Memperluas domain, mapper, project repository/service, dan project member repository/service agar memahami ownership, visibility, status invitation, serta accept/decline invitation.
- Menambahkan tab UI `Akses & Visibilitas` dan status anggota pada `ProjectSettingsPage`; invitation baru tidak langsung mendapat permission sampai diterima.
- Perubahan dibuat additive dan tidak menghapus fitur AI, automation, dashboard, reporting, CI/CD, backup, atau traceability yang sudah ada.
- Verifikasi: `npm run build` lulus dengan warning ukuran chunk utama; `npm run lint` lulus dengan warning existing Fast Refresh/dependency hook. Migration belum dijalankan ke Supabase remote.

### 2026-07-31 — Tambah Test Suite Library dasar

- Menambahkan migration `supabase/schema_030_test_suite_library.sql` dengan tabel reusable `test_suites` dan `test_suite_items`, ownership, visibility, serta RLS.
- Menambahkan domain type, mapper, repository, service, route `/test-suites`, menu sidebar, dan halaman CRUD dasar Test Suite Library.
- Fitur ini terpisah dari `test_cases` project dan tidak mengubah aturan hasil test yang hanya hidup di `test_results`.
- Verifikasi: `npm run build` lulus (627 modules, warning chunk utama tetap existing); `npm run lint` lulus dengan warning existing Fast Refresh/dependency hook. Migration belum dijalankan ke Supabase remote.

### 2026-07-31 — Structured steps, custom Test Run, dan execution UX

- Graphify dijalankan lebih dulu untuk memetakan alur Test Case → Test Run → Test Result sebelum perubahan.
- Menambahkan migration `supabase/schema_031_structured_steps_custom_runs.sql` dengan `test_case_steps`, `test_result_steps`, `test_run_cases`, serta dukungan custom run pada `test_runs` melalui `custom_project_id` dan `is_custom`.
- Structured steps kini dapat dikelola dari detail Test Case; legacy field `steps` tetap dipertahankan untuk kompatibilitas import lama.
- Saat run dimulai, structured steps disnapshot ke `test_result_steps`; execution dialog menampilkan checklist dan menyimpan status per step (`not_run`/`pass`/`fail`).
- Menambahkan custom run dari project melalui route `/projects/:id/test-runs/new`, dengan pemilihan test case langsung dan snapshot hasil ke `test_results`.
- Daftar Test Run project kini menggabungkan run berbasis Test Plan dan custom run. Aturan penting tetap dipertahankan: hasil berada di `test_results`, dan status run completed hanya lewat aksi manual.
- Verifikasi: `npm run build` lulus (632 modules, warning chunk utama existing); `npm run lint` lulus dengan warning existing; `git diff --check` lulus. Migration belum dijalankan ke Supabase remote.

### 2026-07-31 — Activity, mentions, notifications, dan realtime

- Graphify digunakan lebih dulu untuk memetakan comments, mentions, notifications, audit logs, dan komponen UI yang sudah ada.
- Menambahkan migration `supabase/schema_032_activity_mentions_realtime.sql`: notifikasi mention komentar, perluasan kind notification, audit activity untuk comments, dukungan custom run pada project scope audit, serta publication Supabase Realtime.
- Menambahkan `ActivityPanel` berbasis audit log di halaman detail project dengan actor, aksi, entity, dan waktu.
- CommentsPanel kini reload otomatis ketika komentar berubah melalui Realtime; AppTopbar menerima notifikasi baru secara realtime dengan polling fallback 60 detik.
- Domain, mapper, activity repository/service, dan mention notification trigger diperbarui tanpa menghapus komentar, issue notification, atau RBAC yang sudah ada.
- Verifikasi: `npm run build` lulus (635 modules, warning chunk utama existing); `npm run lint` lulus dengan warning existing Fast Refresh/dependency hook. Migration belum dijalankan ke Supabase remote.

### 2026-07-31 — Penyamaan UI/UX dengan repo referensi

- Graphify digunakan untuk memetakan halaman Test Suite, detail project, activity, comment, notification, dan custom Test Run sebelum penyesuaian UI.
- Activity dipindahkan ke tab khusus pada detail project agar konsisten dengan pola detail entity di repo referensi.
- Test Suite Library diperbaiki dengan search, filter visibility, row hover/click menuju detail, row actions, serta halaman detail suite dan daftar item.
- Notification topbar diubah menjadi dropdown panel berisi daftar unread, timestamp, aksi tandai dibaca per item, dan aksi tandai semua dibaca; realtime serta fallback polling tetap dipertahankan.
- Verifikasi: `npm run build` lulus (637 modules, warning chunk utama existing); `npm run lint` lulus dengan warning existing; perubahan masih lokal dan belum di-commit.

### 2026-07-31 — Instalasi Graphify Git hooks

- Dokumentasi Graphify v8 diverifikasi dari README resmi.
- Menjalankan `graphify hook install` pada repository; hook `post-commit` dan `post-checkout` kini aktif.
- Hook akan menjalankan rebuild graph code-only secara otomatis setelah commit dan saat berpindah branch; `AGENTS.md` tetap menjadi instruksi query-first untuk Codex karena hook PreToolUse Codex memang no-op menurut dokumentasi Graphify.
- `graphify hook status` terverifikasi: `post-commit: installed`, `post-checkout: installed`.

### 2026-07-31 — Audit dan batch awal UI/UX parity

- Graphify query digunakan untuk memetakan seluruh page/detail serta shared UI lokal sebelum membandingkan dengan repo referensi `ffrz/shiftech-test-mgr`.
- Audit menemukan repo referensi memecah banyak page menjadi tabs/dialog/shared components, sementara local masih memiliki beberapa page monolitik; parity penuh perlu dikerjakan bertahap agar fitur lokal tidak tertimpa.
- Batch awal: menambahkan shared `SearchInput` dan `FilterToolbar`, menerapkannya ke Test Suite Library, serta mempertahankan detail route, row click, filter, dan action menu.
- Build dan lint lulus; lint hanya menampilkan warning existing. `git diff --check` lulus.
- Graphify manual update sengaja tidak dijalankan pada batch ini karena `graphify hook install` sudah aktif; graph akan dibangun ulang setelah commit.

### 2026-07-31 — UI/UX parity Projects dan Custom Test Run

- Projects page disesuaikan ke pola referensi: filter toolbar yang dapat ditoggle, search input dengan clear action, reset filter, row hover/click, dan action menu tetap dipertahankan bersama fitur lokal.
- Project Detail kini membuka Custom Test Run melalui dialog inline seperti referensi, dengan pemilihan test case, validasi nama/scope, dan navigasi ke execution detail setelah run dibuat.
- Filter dan dialog tetap memakai komponen PrimeReact/PrimeFlex yang sama dengan shell lokal; fitur AI, automation, reporting, backup, CI/CD, dan traceability tidak dihapus.
- Verifikasi: `npm run build` lulus (639 modules, warning chunk utama existing); `npm run lint` lulus dengan warning existing; `git diff --check` lulus.

### 2026-07-31 — Project Settings parity dan stabilisasi build

- Header Project Settings diselaraskan dengan pola referensi: tombol kembali, nama project, deskripsi, aksi edit, Integrasi, dan Backup; dialog edit project tetap memakai service lokal.
- Menambahkan filter compilation untuk scaffold referensi yang belum terintegrasi (`*-new`, dialogs, issues, notifications, profile) tanpa menghapus file atau fitur tersebut.
- Verifikasi: `npm run build` lulus (639 modules, warning chunk utama existing), `npm run lint` lulus dengan warning existing, dan `git diff --check` lulus.

### 2026-07-31 — UI/UX parity Test Plans dan Test Cases

- Test Plans kini memakai shared SearchInput/FilterToolbar, pencarian kode/nama, filter status, row hover, dan tetap mempertahankan perubahan status melalui action menu.
- Test Cases kini memakai shared SearchInput/FilterToolbar untuk pencarian kode/judul dan filter yang responsif; bulk update dan Generate dengan AI tetap aktif.
- Scaffold referensi yang belum terintegrasi (`*-new`, `App-new.tsx`, dan komponen/dialog referensi) dikeluarkan dari TypeScript compilation sementara tanpa menghapus file sumbernya.
- Verifikasi: `npm run build` lulus (639 modules, warning chunk utama existing), `npm run lint` lulus dengan warning existing, dan `git diff --check` lulus.

### 2026-07-31 — Audit source of truth folder new

- Folder `frontend/src/*-new` dan `supabase-new` diaudit sebagai snapshot implementasi referensi lengkap, bukan scaffold UI terpisah.
- Ditemukan pola pemindahan folder: `pages-new` mengharapkan diposisikan menjadi `pages`, `helpers-new` menjadi `helpers`, `hooks-new` menjadi `hooks`, dan seterusnya; import relatifnya memang belum valid ketika dibiarkan sebagai subfolder.
- `domain-new.ts` membawa evolusi domain/schema yang lebih lengkap (User/Profile terpisah, TestRole, external links, richer activity/attachments), sehingga integrasi akan dilakukan melalui mapping kontrak dan migration bertahap, bukan copy-over yang menghapus fitur local.
- Graphify di-update satu kali agar seluruh file new masuk knowledge graph; hook post-commit/post-checkout tetap aktif untuk pembaruan berikutnya.

### 2026-07-31 — Integrasi shared UI dan TestRole dari source new

- Shared `SearchInput`, `FilterToolbar`, `PageHeader`, `RowActionsMenu`, dan `BulkActionsBar` diselaraskan dengan implementasi `components/ui-new` sambil mempertahankan API dan label local.
- Menambahkan `CharacterCount` shared component berdasarkan source new.
- Menambahkan domain `TestRole`, mapper, repository, service, dan migration `supabase/schema_033_test_roles.sql` sebagai master role aplikasi yang diuji; tidak mengubah role user/admin TestManager.
- Verifikasi: `npm run build` lulus (640 modules, warning chunk utama existing) dan `git diff --check` lulus.
- Project Settings kini memiliki tab Test Roles dengan search, create/edit/delete, bulk delete, dan dialog validasi; fitur ini diadaptasi dari `pages-new` tanpa mengganggu tab Environment, Members, Access, Modules, Tags, dan Danger Zone.
- Verifikasi lanjutan: `npm run build` lulus (642 modules, warning chunk utama existing) dan `git diff --check` lulus.

### 2026-07-31 — Parallel audit source new dan compatibility migration

- Sub-agent mengaudit `supabase-new/migrations`; migration yang mengubah model `users/profiles`, notification, atau entity attachment/activity tidak dicopy karena bertentangan dengan arsitektur local.
- Menambahkan `schema_034_source_new_compatibility.sql` untuk bagian additive yang kompatibel: guarded Realtime publication, `started_by`/`created_by`, external links, issue target role, dan status issue `backlog/rejected/duplicate`, seluruh FK identity diarahkan ke `profiles`.
- Domain dan mapper local diperluas secara backward-compatible untuk metadata author/runner, issue type/status, external links, dan target role.
- Sub-agent shared UI berhasil mengadaptasi CommentEditor, MentionTextarea, OwnerProjectLabel, UserHoverCard, dan MarkdownPreview; AttachmentPanel dipertahankan memakai kontrak attachment local karena source new berbeda.
- Sub-agent execution menemukan detail contract gap yang nyata (snapshot result, API link issue, query keys, step result, dan test-result attachment), sehingga port halaman result detail ditahan agar tidak memasukkan kode yang tidak build.

### 2026-07-31 — Final verification batch source new compatibility

- Rebuild paksa TypeScript digunakan setelah sub-agent menghapus port execution detail yang inkompatibel; source asli `pages-new` tetap dipertahankan sebagai referensi.
- `schema_034_source_new_compatibility.sql` dan domain metadata diverifikasi bersama shared component port.
- Verifikasi final batch: `npm run build` lulus (642 modules, warning chunk utama existing), `npm run lint` lulus dengan warning existing, `git diff --check` lulus, dan Graphify berhasil rebuild menjadi 2477 nodes / 4410 edges.

### 2026-07-31 — Port execution detail dari source new

- Menjalankan `graphify query` terlebih dahulu untuk memetakan `TestRunResultDetailPage` ke `useTestRunDetail`, `testRunService`, `issueService`, attachment, activity, dan domain lokal.
- Menambahkan `frontend/src/pages/test-runs/TestRunResultDetailPage.tsx` berdasarkan implementasi `pages-new`, dengan kontrak service/domain lokal yang sudah tersedia.
- Fitur execution detail yang ikut dipertahankan: pemilihan hasil per test case, filter/search, status dan tester, notes, structured steps, attachment, link/create issue, activity, complete/reopen test run, serta responsive mobile navigation.
- Tidak mengubah `App.tsx`, shared component, schema, atau file aplikasi lain sebagai bagian dari task ini.
- Verifikasi: `npm run lint` lulus dengan warning existing dan `git diff --check` lulus; proses `npm run build` dijalankan untuk validasi TypeScript/Vite.

### 2026-07-31 — Port shared components dari source new

- Menambahkan `components/ui/CommentEditor.tsx`, `MentionTextarea.tsx`, `OwnerProjectLabel.tsx`, `UserHoverCard.tsx`, dan helper `MarkdownPreview.tsx` berdasarkan pola `components/ui-new`.
- Kontrak local dipertahankan: `Profile` memakai `fullName/email`, navigasi profil memakai `/users/:id`, dan `AttachmentPanel` tetap memakai `AttachmentEntityKind`, `useAttachments`, serta `attachmentService` local.
- `MentionTextarea` tidak mengarang method repository baru; autocomplete menerima `mentionSuggestions` dari caller. Dukungan pencarian `profileRepository.search`, `testCaseRepository.searchByProject`, dan `issueRepository.searchByProject` dari source new masih menjadi blocker kontrak local.
- Tidak mengubah pages, layout, domain utama, maupun schema.
- Verifikasi: `npm run build` selesai tanpa error TypeScript/Vite, `npm run lint` lulus dengan warning existing pada scaffold/new files, dan `git diff --check` lulus.

### 2026-07-31 — Port TestCaseDetailPage dari source new

- Menjalankan `graphify query` terlebih dahulu untuk memetakan page detail, target role, external links, actions, attachment, comments, dan structured steps.
- Mengadaptasi hanya `frontend/src/pages/test-cases/TestCaseDetailPage.tsx`: responsive header/detail layout, target role badge, external links read-only dari metadata yang sudah tersedia, serta action layout yang lebih dekat dengan source new.
- AI, structured steps, attachment, comments, version history, module/tag quick-add, dan route local tetap dipertahankan.
- Tidak menambah domain, helper, hook, repository, service, schema, atau dialog baru karena kontrak source-new yang relevan sudah tersedia di page local; external-link mutation sengaja tidak dibuat karena repository local belum mendukung persist update `external_links`.
- Verifikasi: `npx tsc --noEmit` lulus dan `git diff --check` lulus; tidak ada blocker compile.

### 2026-07-31 — Compatibility helper source new

- Menjalankan `graphify query` terlebih dahulu untuk memetakan kontrak `useScreenSize`, `useProjectBreadcrumbItems`, dan `queryKeys` terhadap hook/service/domain local.
- Menambahkan helper/hook kompatibilitas baru tanpa mengganti hook aktif: `frontend/src/hooks/useScreenSize.ts`, `frontend/src/hooks/useProjectBreadcrumbItems.ts`, dan `frontend/src/hooks/queryKeys.ts`.
- `useProjectBreadcrumbItems` disesuaikan dengan identity local `fullName/email` dan route `/users/:id`; kontrak username/public-profile source new ditunda karena belum tersedia di local.
- Tidak mengubah pages, domain, repository, service, schema, atau `App.tsx`.
- Verifikasi: `npx tsc --noEmit` lulus dan `git diff --check` lulus; tidak ada blocker compile.

### 2026-07-31 — Additive Test Result snapshot

- Menjalankan `graphify query` terlebih dahulu untuk memetakan migration snapshot source-new ke `TestResult`, mapper, `testResultRepository`, dan `testRunService` local.
- Menambahkan `supabase/schema_035_test_result_snapshot.sql` secara additive: tujuh kolom snapshot nullable, backfill best-effort tanpa mengubah atau menghapus relasi `test_case_id`.
- Menambahkan `TestResultSnapshot` nullable pada domain dan mapper; `seedForRun` kini mengambil isi test case saat run dibuat lalu menyimpannya ke snapshot result.
- Kontrak local tetap dipertahankan: `TestResultWithDetails.testCase` masih memakai live test case, dan tidak dibuat API sync fiktif.
- Verifikasi: `npx tsc --noEmit` lulus dan `git diff --check` lulus. Proses Vite build dihentikan karena berjalan terlalu lama tanpa output; tidak ada compile error TypeScript.

### 2026-07-31 — Koreksi port execution detail dan batch lanjutan

- Koreksi: port `TestRunResultDetailPage` yang sempat dibuat dari source-new tidak diaktifkan dan sudah dihapus karena membutuhkan kontrak local yang belum tersedia (snapshot UI datar, issue linking, query keys, result-step API, dan attachment test-result). Source asli `pages-new` tetap dipertahankan.
- Port `TestCaseDetailPage` diterapkan dengan responsive layout, target role badge, external links read-only, dan tetap mempertahankan AI, steps, attachment, comments, serta version history.
- Menambahkan helper/hook kompatibilitas `useScreenSize`, `useProjectBreadcrumbItems`, dan `queryKeys` tanpa mengganti hook aktif.
- Menambahkan `schema_036_test_result_order_snapshot.sql` dan `schema_037_invited_project_metadata_access.sql` dari source-new secara additive.
- Verifikasi agent: `npx tsc --noEmit` dan `git diff --check` lulus pada scope masing-masing; full build dijalankan ulang oleh main agent sebelum handoff.

### 2026-07-31 — Verifikasi port TestCase, snapshot, dan compatibility hooks

- TestCase detail, snapshot Test Result, `useScreenSize`, `useProjectBreadcrumbItems`, dan `queryKeys` selesai dipertahankan sebagai port additive dari source new.
- Menambahkan snapshot urutan hasil run (`schema_036_test_result_order_snapshot.sql`) dan akses metadata project untuk undangan (`schema_037_invited_project_metadata_access.sql`).
- Verifikasi full batch: `npm run build` lulus (642 modules, warning chunk utama existing), `npm run lint` lulus dengan warning existing pada scaffold/pages-new, dan `git diff --check` lulus.

### 2026-07-31 — Port minimal dialog dan audit tabs source new

- Menjalankan `graphify query` terlebih dahulu untuk memetakan source-new dialogs/tabs ke `ProjectDetailPage` aktif.
- Menambahkan `frontend/src/components/dialogs/CustomTestRunDialog.tsx` dengan kontrak state lokal: nama run, daftar test case, validasi tombol, error, loading, dan callback save.
- Mengaktifkan dialog baru tersebut di `frontend/src/pages/projects/ProjectDetailPage.tsx`; logika `testRunService.startCustom` dan state page tetap dipertahankan.
- Source-new components dan tab utama lulus TypeScript terisolasi. Port tab penuh belum diaktifkan karena page aktif masih menggunakan state/cache legacy, sedangkan tab source-new bergantung pada query keys, server-side filters, dan callback mutation yang berbeda; memaksa penggantian akan menyentuh page logic besar di luar scope aman.
- Tidak menyentuh domain, helper, hook, repository, service, atau schema pada batch ini.
- Verifikasi: `npm run build` lulus; TypeScript terisolasi untuk `components/dialogs`, `issues`, `notifications`, `profile`, `ui-new`, serta source-new tabs/dialogs lulus; `git diff --check` dijalankan setelah perubahan.

### 2026-07-31 — Port minimal pages utama Projects dan Test Plans

- Menjalankan `graphify query` terlebih dahulu untuk memetakan page active, page source-new, tab, dialog, dan route terkait Projects/Test Plans.
- Membandingkan kontrak source-new dengan active local. Source-new memakai query/dialog API yang belum aktif, sedangkan page local sudah memiliki fitur tambahan seperti AI, import/export, attachment, comments, activity, dan custom run; karena itu port dilakukan additive dan compile-safe.
- Mengubah `frontend/src/pages/test-plans/TestPlansPage.tsx`: menambahkan breadcrumb sesuai pola source-new tanpa mengubah project context atau fitur status lokal.
- Mengubah `frontend/src/pages/test-plans/TestPlanDetailPage.tsx`: menambahkan edit metadata Test Plan (kode, nama, deskripsi, status) dan tab Activity menggunakan `ActivityPanel` local; alur add case, filtering, run, environment, dan delete run tetap dipertahankan.
- Tidak mengubah domain, helper, hook, repository, service, schema, atau route. Tidak mengaktifkan source-new tabs/dialogs secara langsung karena kontraknya belum cocok dengan active local.
- Verifikasi: `npm run build` lulus; `npm run lint` lulus dengan warning existing pada scaffold/source-new; `git diff --check` lulus.
- Blocker/catatan: sub-agent launcher tidak tersedia pada sesi ini, sehingga pekerjaan diselesaikan langsung dengan scope write yang sama.
## 2026-07-31 — Port pages Test Runs/Issues (compile-safe)

- Menganalisis source-new dengan Graphify dan membandingkan page active dengan hook/service/repository lokal.
- Mencoba port pages source-new TestRunIssues dan IssueDetail ke folder active.
- Dibatalkan secara terbatas karena source-new membutuhkan kontrak yang belum tersedia di active local: AuthContext.user, field IssueWithDetails.tags/linkedTestResults/module/targetRole, signature issueService/attachmentService, serta komponen paginator.
- Mengembalikan dua page active ke baseline repository agar tidak menambah error compile dan tidak menyentuh domain/repository/service/schema.
- Blocker port penuh: sinkronisasi kontrak layer internal harus dikerjakan lebih dulu sebelum source-new pages dapat diaktifkan.

## 2026-07-31 — Port pages/dialogs/tabs utama dari source new

- Menjalankan `graphify query` sebelum menelusuri relasi page, tab, dialog, route, dan kontrak service lokal.
- Menjalankan tiga sub-agent dengan scope terpisah untuk Projects/Test Plans, Test Runs/Issues, serta dialogs/tabs.
- Port aman yang diterapkan: breadcrumb pada daftar Test Plans, edit metadata dan Activity pada detail Test Plan, serta `CustomTestRunDialog` reusable yang diaktifkan di `ProjectDetailPage`.
- Projects tidak diganti karena page aktif sudah memiliki fitur lokal yang lebih lengkap. Port penuh Test Runs/Issues dan tabs source-new belum diaktifkan karena kontrak source-new memakai query/mutation/API yang belum tersedia atau berbeda di layer lokal.
- Menjaga folder `source-new` tetap terisolasi melalui pengecualian TypeScript; tidak menghapus fitur lokal.
- Verifikasi: `npx tsc --noEmit` lulus, `npm run lint` lulus dengan warning existing pada scaffold/source-new, `git diff --check` lulus setelah memperbaiki blank line EOF, dan `graphify update .` selesai.
- Blocker lanjutan: sinkronisasi domain/helper/hook/repository/service perlu diselesaikan sebelum port penuh Test Runs/Issues dan tabs dapat diaktifkan tanpa mengarang kontrak.

## 2026-07-31 — Sinkronisasi kontrak Issue, Test Suite, dan execution pages

- Menjalankan `graphify query` terlebih dahulu lalu meluncurkan tiga sub-agent dengan scope terpisah: Issue layer, Test Suite/structured-step layer, serta pages Test Runs/Issues.
- Domain diperluas secara additive untuk project visibility, Test Suite, Test Suite item/step, issue detail metadata, dan relasi hasil eksekusi; API lokal yang sudah ada tetap dipertahankan.
- Repository Issue kini memuat target role dan detail linked test result secara read-only; repository/service Test Suite ditambahkan untuk suite, item, detailed steps, bulk item, dan visibility filtering.
- Test Run Detail mempertahankan flow lokal dan menambahkan editing status structured steps; Issue Detail menampilkan tipe issue dan external links read-only; custom run tetap didukung.
- Tidak mengaktifkan seluruh source-new pages mentah karena masih bergantung pada React Query/mutation/attachment contract yang berbeda. Perubahan hanya diaktifkan bila compile-safe.
- Verifikasi: `npx tsc --noEmit` lulus, lint lulus dengan warning existing pada scaffold/source-new dan satu warning mapper yang kemudian diperbaiki, `git diff --check` lulus, dan `graphify update .` selesai.

## 2026-07-31 — Adaptasi minimal pages Test Runs dan Issues

- Menjalankan `graphify query` terlebih dahulu untuk memetakan page active, page source-new, route, hook, dan service terkait Test Runs/Issues.
- Scope write dibatasi pada `frontend/src/pages/test-runs/**`, `frontend/src/pages/issues/**`, dan dokumentasi ini; domain/helper/repository/service tidak disentuh.
- Memperluas pilihan status issue pada `TestRunIssuesPage` dan `IssueDetailPage` agar mencakup `backlog`, `rejected`, dan `duplicate` yang sudah tersedia di domain serta label local.
- Menambahkan tampilan read-only tipe issue dan external links pada `IssueDetailPage` ketika data tersedia; tidak menambahkan mutation baru karena kontrak `issueService.update` local belum mendukung field tersebut.
- Fitur active seperti record result, structured steps, AI issue draft, attachment, comments, assignment, dan status transition tetap dipertahankan.
- Blocker konkret port source-new penuh: source-new membutuhkan React Query contracts, `IssueEditor`, actor-aware mutation signatures, project-member profile shape berbeda, attachment entity issue generik, dan test-result detail/result-step APIs yang belum tersedia atau berbeda di local.
- Tool launcher sub-agent tidak tersedia di runtime sesi ini; pekerjaan diselesaikan sebagai pass terisolasi dengan scope yang sama.
- Verifikasi dilakukan dengan `npm run build`, `npm run lint`, `git diff --check`, dan `graphify update .` setelah patch.

## 2026-07-31 — Execution UX compile-safe Test Runs/Issues

- Menjalankan `graphify query` sebelum membaca relasi page active, hook, service, ActivityPanel, dan AttachmentPanel.
- Scope write dibatasi pada `frontend/src/pages/test-runs/**`; domain, repository, service, dan helper tidak diubah.
- `TestRunDetailPage`: menambahkan filter hasil berdasarkan status dan pencarian kode/judul/tester, navigasi kontekstual ke Issues, responsive table scroll, dan Activity panel berbasis `testRun.projectId`. Structured steps, record result, attachment, issue creation, dan AI flow tetap memakai kontrak lokal.
- `TestRunIssuesPage`: menambahkan pencarian issue, filter status dan prioritas, reset filter, navigasi kembali ke hasil eksekusi, serta responsive table scroll. Mutation status, assignment, archive, dan delete tetap melalui service lokal.
- Blocker: port penuh source-new tidak diaktifkan karena masih membutuhkan React Query dan signature layer yang berbeda. Launcher sub-agent tidak tersedia di runtime sesi ini, sehingga pekerjaan dilakukan langsung dengan scope terisolasi.
- Verifikasi: `npm run build` lulus, `git diff --check` lulus. Graphify update dan lint menjadi langkah akhir batch.

## 2026-07-31 — Adaptasi additive Project Test Plan Tab

- Menjalankan `graphify query` terlebih dahulu untuk memetakan `ProjectDetailPage`, tab Test Plan/Test Case source-new, dan service lokal.
- Menambahkan `frontend/src/pages/projects/ProjectTestPlanTab.tsx` dengan UX teradaptasi dari source-new: filter status multi-select, inline rename/status, responsive row, selection, bulk delete, dan aksi create/edit/delete.
- Mengganti markup tab Test Plans di `ProjectDetailPage` agar memakai komponen baru tersebut; handler dialog, delete, cache reload, role check, dan service lokal tetap dipakai.
- TestCaseTab source-new belum diaktifkan penuh karena kontraknya masih membutuhkan bulk edit, test role, import dialog, dan callback mutation yang belum identik dengan page aktif. Tidak menyentuh domain/repository/service/test-suites.
- Verifikasi: `npx tsc -b --force` lulus.

## 2026-07-31 — Aktivasi Test Suite pages dan execution UX lanjutan

- Menjalankan `graphify query` sebelum port batch berikutnya dan meluncurkan tiga sub-agent untuk Test Suite pages, project Test Plan tab, serta execution UX.
- Menambahkan/aktifkan `TestSuitesPage` dan `TestSuiteDetailPage` berbasis service lokal, termasuk filter visibility, duplicate suite/item, detailed steps, bulk delete, dan edit metadata.
- Menambahkan `ProjectTestPlanTab` pada `ProjectDetailPage` dengan filter status, inline edit, selection, bulk delete, dan aksi create/edit/delete melalui service lokal.
- Memperluas UX `TestRunDetailPage` dan `TestRunIssuesPage` dengan search/filter, navigasi hasil-issue, responsive table, Activity panel, dan structured-step status tanpa mengganti kontrak lokal.
- Memperbaiki warning lint baru pada mapper/import/konstanta yang tidak terpakai.
- Verifikasi: `npx tsc -b --force` lulus, lint lulus dengan warning existing pada scaffold/source-new, `git diff --check` lulus. Graphify perlu diperbarui setelah batch ini.
# 2026-07-31 — Integrasi compile-safe dialogs, notifications, dan profile

- Menjalankan Graphify query untuk memetakan kontrak source-new terhadap layout, notification service, profile, dan halaman aktif.
- Mengaktifkan komponen reusable `TestPlanDialog`, `TestSuiteDialog`, dan `CustomTestRunDialog` melalui struktur komponen aktif yang kompatibel; tidak mengganti auth flow atau menambah API fiktif.
- Mengadaptasi `NotificationPanel` ke domain lokal (`kind`, `message`, `readAt`) dan menghubungkannya ke `AppTopbar` melalui `notificationService` yang sudah ada. Aksi remove/clear tidak dipaksakan karena repository lokal belum menyediakan kontraknya.
- Mengadaptasi `ProfileView` ke domain `Profile` lokal (`fullName`, `email`, `avatarUrl`, `createdAt`), menghapus ketergantungan source-new pada `username`, `displayName`, dan `bio`.
- Menghapus exclusion TypeScript untuk `components/dialogs`, `components/notifications`, dan `components/profile` agar komponen tersebut ikut diverifikasi oleh build.
- Verifikasi: `npm run build` lulus; `npm run lint` lulus dengan warning existing dan warning import layout yang kemudian dirapikan. Blocker yang dicatat: halaman source-new penuh masih memakai auth/profile/notification contract berbeda dan tidak diaktifkan mentah.

## 2026-07-31 — Membuat task integrasi penuh source-new

- Menjalankan `graphify query` untuk memetakan backlog, domain aktif, source-new, route, dan folder yang masih dikecualikan TypeScript.
- Menambahkan epic `SRC-EPIC` di `TODO.md`.
- Menambahkan task detail `SRC-01` sampai `SRC-14` di `FEATURE_BACKLOG.md`, mencakup components, helpers, hooks, pages, repositories, services, domain, App routing, dan migration `supabase-new`.
- Menambahkan Definition of Done: compile/build/lint, smoke test route utama, verifikasi migration/RLS/Storage, dan sinkronisasi worklog/checklist.
- Task ini bersifat additive: fitur lokal tidak boleh dihapus dan source-new tidak boleh diaktifkan mentah jika kontraknya berbeda.

## 2026-07-31 — FIX-00a duplikasi domain TestCase

- Menjalankan `graphify query` sebelum menelusuri deklarasi dan pemakaian `projectId`/`moduleId`.
- Menghapus deklarasi duplikat opsional hasil merge pada interface `TestCase`; kontrak lokal dipertahankan sebagai `projectId: string` dan `moduleId: string | null`.
- `npx tsc -b --force` dan `npm run build` tidak lagi melaporkan TS2300/TS2687/TS2717 dari `types/domain.ts`, tetapi masih gagal karena error TypeScript di luar scope FIX-00a pada ImportCasesDialog, NotificationPanel, ProfileView, ProjectDetailPage, ProjectTestCaseTab, dan ProjectTestPlanTab.
- `graphify update .` dijalankan, tetapi Graphify menolak overwrite karena graph baru hanya memiliki 1721 node dibanding graph existing 2595 node; opsi destruktif `--force` tidak dijalankan.

## 2026-07-31 — FIX-00b error TypeScript ProjectDetailPage

- Menjalankan `graphify query` untuk menelusuri `ProjectDetailPage`, komponen tab Test Case, dan kontrak tipe terkait sebelum membaca source.
- Menghapus import, opsi status, serta state/filter/sort Test Case lama yang sudah dipindahkan ke `ProjectTestCaseTab`; halaman kini meneruskan data Test Case mentah agar filtering tetap dimiliki komponen tab.
- Mengganti `projectId` opsional dari parameter route dengan `project.id` yang sudah terjamin setelah guard project.
- `npx tsc -b --force` tidak lagi melaporkan error pada `ProjectDetailPage.tsx` (16 error FIX-00b selesai). Command masih exit non-zero karena 14 error di file lain yang berada di luar scope task ini.
- `npm run build` mencapai tahap TypeScript dan tidak melaporkan error pada `ProjectDetailPage.tsx`, tetapi belum dapat melanjutkan ke Vite karena 14 error TypeScript di file task lain.
- `graphify update .` dijalankan; Graphify menolak overwrite karena hasil baru 1721 node lebih kecil daripada graph existing 2595 node. Opsi destruktif `--force` tidak dijalankan.
### 2026-07-31 — SRC-12 konsolidasi domain aktif

- Membandingkan `frontend/src/types/domain-new.ts` dengan `frontend/src/types/domain.ts` serta memvalidasi perbedaannya terhadap schema, mapper, repository, service, dan fitur lokal.
- Menghapus `domain-new.ts` yang sudah tidak diimpor agar `types/domain.ts` menjadi satu-satunya sumber domain aktif; kontrak lokal untuk AI, attachment, activity, custom run, automation, reporting, dan traceability tetap dipertahankan.
- Menetapkan `TestCase.stepType` sebagai field domain wajib yang backward-compatible dengan default `simple`, lalu menyelaraskan mapper, repository, dan service agar `step_type` dibaca dan ditulis konsisten. Persistensi `external_links` Test Case juga diselaraskan dengan field domain/schema yang sudah valid.
- Verifikasi: `npm run build` lulus (651 modules; warning ukuran chunk existing), `npm run lint` lulus dengan 7 warning existing, dan `git diff --check` lulus.

### 2026-07-31 — SRC-07 port helper source-new

- Menjalankan `graphify query` sebelum mengaudit `helpers/helpers-new`, helper aktif, tipe domain, dan pemakai terkait.
- Memindahkan helper yang belum tersedia ke folder aktif: routing/URL entity activity, deskripsi event activity, ekstraksi dan linkifikasi mention, serta parser dan template impor CSV (termasuk validasi row, priority, dan detailed steps).
- Menambahkan label dan severity `ProjectMemberStatus` ke `statusLabels.ts` sambil mempertahankan label Bahasa Indonesia milik aplikasi aktif.
- Mapper snake_case ke camelCase tetap hanya berada di `helpers/mappers.ts`; mapper source-new yang tidak kompatibel dengan domain/schema lokal tidak diduplikasi. Helper date, toast/error, validation, dan export/import yang sudah tersedia juga tidak diduplikasi.
- Menandai SRC-07 selesai di `FEATURE_BACKLOG.md` dan menjalankan `graphify update .` hingga graph berhasil dibangun ulang (1767 node, 3546 edge).
- Verifikasi: `npm run build` lulus (warning ukuran chunk existing), `npm run lint` lulus dengan 7 warning existing, `npm test -- --run` lulus (4 test), dan `git diff --check` lulus.

### 2026-07-31 — SRC-10 sinkronisasi repository source-new

- Menjalankan `graphify query` sebelum membandingkan repository aktif dengan `frontend/src/repositories/repositories-new` dan membaca keputusan teknis FEATURE_BACKLOG Section 7.
- Menambahkan query kompatibel untuk pagination, filter, pencarian kode, bulk insert, lookup detail, reorder plan case, sinkronisasi snapshot result, step result, summary project, notification center, dan pencarian profile pada repository aktif project, test case, test plan, test run, result, issue, notification, serta profile.
- Mempertahankan query lokal yang sudah lengkap untuk suite, activity, attachment, dan integration. Kontrak source-new `entity_activity`, `entity_attachments`, notification `user_id/is_read`, dan profile `username/display_name/bio` tidak diaktifkan karena tidak cocok dengan schema/domain lokal; query lokal tetap memakai `audit_logs`, `attachments`, `recipient_id/read_at`, dan `full_name/email`.
- Tidak mengubah service/hook/page, tidak menjalankan migration, dan tidak memasukkan business rule baru ke repository; perubahan bersifat query Supabase serta pemetaan lewat mapper aktif.
- Menandai SRC-10 selesai di `FEATURE_BACKLOG.md`.
- Verifikasi: `npm run build` lulus (warning ukuran chunk existing) dan `git diff --check` lulus sebelum pembaruan graph akhir.

### 2026-07-31 — SRC-11 sinkronisasi business rule service source-new

- Menjalankan `graphify query` sebelum membandingkan service aktif dengan `frontend/src/services/services-new` dan membaca scope FEATURE_BACKLOG Section 7.
- Menyelaraskan validasi Test Case berdasarkan `stepType`: tipe `simple` tetap mewajibkan steps dan expected result, sedangkan tipe `detailed` mewajibkan minimal satu action yang tidak kosong dan menyimpan detail step melalui service aktif.
- Menambahkan orkestrasi summary Test Run terpagination yang tetap menghitung agregat dari `test_results` saat dibaca, tanpa kolom cache, serta sinkronisasi snapshot Test Result yang ditolak bila run sudah `completed`.
- Mempertahankan invariant lokal yang lebih ketat: `start`/`startCustom` selalu membuat Test Run baru, completion hanya melalui aksi manual `complete()`, hasil pada run completed tidak dapat diubah sebelum reopen, dan `issueService.create()` memverifikasi Test Result berstatus `fail`.
- Kontrak source-new yang bergantung pada schema/profile/notification berbeda tidak diaktifkan mentah; repository tetap bebas business rule dan tidak ada migration atau akses Supabase target.
- Menandai SRC-11 selesai di `FEATURE_BACKLOG.md`.
- Verifikasi: `npm run build` lulus (warning ukuran chunk existing), `npm test` lulus (4 test), `npm run lint` lulus dengan 7 warning existing, dan `git diff --check` lulus.
- `graphify update .` berhasil menyinkronkan knowledge graph menjadi 1.771 node dan 3.554 edge; Graphify memberi warning 7 file konfigurasi/non-source menghasilkan zero node.
# 2026-07-31 — SRC-08 sinkronisasi hooks-new

- Mengaudit seluruh kandidat `frontend/src/hooks/hooks-new` terhadap hook aktif, kontrak domain/service lokal, lifecycle cleanup, dan permission behavior.
- Menambahkan hook aktif `useActivity`, `useNotifications`, dan `useRealtimeSync`; activity/notification sekarang mengikuti alur Component → Hook → Service → Repository → Supabase dan subscription realtime dipusatkan di layout dengan cleanup saat user berubah/unmount.
- Menambahkan utility hook `useStoredState` dan `useTabQueryParam` dengan validasi storage, penanganan perubahan key, preservasi query parameter lain, serta validasi indeks tab.
- Memperluas `notificationService` untuk list dan unread count agar hook tidak melewati service layer; `ActivityPanel` dan `AppTopbar` tidak lagi mengakses Supabase/service secara langsung untuk lifecycle data.
- Mempertahankan hook auth, project context/role, screen size, breadcrumb, theme, dan feature-specific yang aktif: kandidat source-new bergantung pada model `users`, username/public routes, `/app` base path, serta permission matrix yang berbeda. Menggantinya sebelum SRC-12/SRC-13 akan mengubah kontrak login/RBAC. Implementasi aktif yang sudah punya cancellation/request guard juga tidak diturunkan ke varian yang kurang aman.
- Folder `hooks-new` tetap dikecualikan TypeScript sebagai corpus referensi source-new karena varian yang ditolak masih bergantung pada type/schema/route yang baru diaudit pada SRC-12 dan SRC-13; tidak ada import runtime dari folder tersebut.
- Verifikasi: `cd frontend && npm run build` lulus; `npm run lint` lulus dengan warning existing dan satu warning hook baru yang kemudian diperbaiki; `git diff --check` lulus. Vite tetap memberi warning ukuran chunk existing (>1500 kB).
- Verifikasi akhir: 4 test Vitest lulus dan lint lulus dengan 7 warning existing di luar perubahan SRC-08. `graphify update .` sempat gagal karena permission watcher, lalu pembaruan AST-only melalui `graphify . --update --code-only` berhasil menghasilkan 1.780 node dan 3.223 edge; 5 file konfigurasi/hasil test non-source menghasilkan zero node.
## 2026-07-31 — SRC-06 audit dan port shared UI

- Mengaudit komponen `components/ui-new` untuk search, filter, markdown, mention,
  activity, owner label, hover card, attachment, pagination, dan bulk action serta
  seluruh pemakai aktifnya. Kontrak props versi aktif tetap kompatibel dan lolos
  type-check.
- Memport paginator DataTable bersama ke `components/ui/dataTablePaginator.tsx`
  dengan label Indonesia dan konstanta scroll height yang dapat dipakai ulang.
- Mengaktifkan GitHub-flavored Markdown pada `MarkdownPreview` melalui
  `react-markdown` dan `remark-gfm`; tautan eksternal dibuka aman di tab baru.
- Memperbaiki layering `UserHoverCard`: pengambilan profil sekarang melalui hook
  `useProfile` dan `profileService`, bukan mengimpor repository langsung.
- Menandai checklist FEATURE_BACKLOG SRC-06 selesai.
- Verifikasi: `npm run build` lulus; `npm run lint` lulus dengan 7 warning existing
  di luar scope; `git diff --check` lulus. Instalasi npm melaporkan 3 high severity
  vulnerability existing/transitif untuk ditinjau terpisah; tidak menjalankan
  `npm audit fix --force` karena berisiko breaking change dan di luar scope.

## 2026-07-31 — SRC-01 aktivasi dialog source-new

- Menjalankan `graphify query` sebelum memetakan dialog source-new, service lokal, dan halaman aktif sesuai FEATURE_BACKLOG Section 7.
- Mengaktifkan `TestPlanDialog` pada halaman detail Project dan Test Plan, serta menambahkan loading, validasi nama, error service, dan callback terkontrol yang konsisten.
- Menyelaraskan `TestSuiteDialog`, `CustomTestRunDialog`, dan `ImportCasesDialog`: aksi async memiliki loading state, dialog tidak dapat ditutup saat submit, error pemuatan/import ditampilkan, dan validasi tetap melalui service lokal.
- Menambahkan `IssueDialog` reusable untuk flow pembuatan issue dari hasil gagal dan menghubungkannya ke `issueService`; dialog inline sebelumnya dihapus.
- Mempertahankan attachment aktif melalui `AttachmentPanel` → `useAttachments` → `attachmentService` → repository, termasuk validasi ukuran/file kosong, loading upload/list, error, reload callback, dan konfirmasi delete.
- Menandai SRC-01 selesai di `FEATURE_BACKLOG.md`; tidak menjalankan migration, commit, push, atau perubahan di luar scope.
- Verifikasi: `npm run build` lulus (warning ukuran chunk existing) dan `git diff --check` lulus sebelum sinkronisasi graph akhir.
- Verifikasi akhir: `npm run build` lulus, `npm run lint` lulus dengan 7 warning existing, dan `graphify update .` berhasil memperbarui graph menjadi 1.798 node/3.602 edge (warning 7 file konfigurasi/non-source menghasilkan zero node).

## 2026-07-31 — SRC-02 integrasi komponen Issue

- Menjalankan `graphify query` sebelum memetakan `IssueEditor`, halaman detail, domain, mapper, issue service/repository, comments, attachment, dan relasi Test Result sesuai FEATURE_BACKLOG Section 7.
- Mengaktifkan `IssueEditor` sebagai editor metadata pada `IssueDetailPage` untuk tipe, prioritas, status, assignee, target role, deskripsi, actual/expected result, dan external links. Komponen dibuat presentational; pemuatan test role dan project member berjalan melalui `useIssueEditorOptions` → service → repository.
- Mempertahankan model lokal Issue yang terhubung langsung ke satu `test_result_id`; Test Case dan Test Run tertaut tetap ditampilkan pada detail tanpa memperkenalkan junction source-new. Flow pembuatan Issue dari hasil FAIL, comments, attachment lokal, archive/delete, dan transisi status tetap dipertahankan.
- Menambahkan migration aditif `schema_039_issue_editor_metadata.sql` untuk kolom `issues.type` dan `issues.external_links`; migration tidak dijalankan ke Supabase target. Repository dan service diperluas untuk menyimpan metadata tersebut serta `target_role_id` melalui mapper aktif.
- Menandai SRC-02 selesai di `FEATURE_BACKLOG.md`.
- Verifikasi: `npm run build` lulus (warning ukuran chunk existing), `npm run lint` lulus dengan 7 warning existing di luar scope, `npm test -- --run` lulus (4 test), dan `git diff --check` lulus.
- `graphify update .` berhasil menyinkronkan knowledge graph menjadi 1.802 node dan 3.600 edge; Graphify memberi warning 7 file konfigurasi/non-source menghasilkan zero node.

## 2026-07-31 — SRC-04 penyelesaian notification center

- Menjalankan `graphify query` sebelum memetakan NotificationPanel, hook, service, repository, mapper, realtime sync, topbar, route tujuan, dan RLS sesuai FEATURE_BACKLOG Section 7.
- Menyelesaikan unread count, mark-as-read individual/semua, remove individual, clear all, serta state loading/error/pending melalui alur Component → Hook → Service → Repository → Supabase.
- Menambahkan navigasi notification: assignment/perubahan status menuju detail Issue, sedangkan mention komentar menuju detail Issue atau Test Case berdasarkan target komentar yang dipetakan repository.
- Mempertahankan refresh realtime aktif melalui `useRealtimeSync` di `AppLayout`, yang menginvalidasi daftar notification dan unread count untuk perubahan milik recipient saat ini.
- Menambahkan migration aditif `schema_040_notification_delete_policy.sql` agar SELECT/UPDATE/DELETE hanya berlaku untuk recipient sendiri yang approved; migration tidak dijalankan ke Supabase target.
- Menandai SRC-04 selesai di `FEATURE_BACKLOG.md`; tidak menjalankan migration, commit, push, atau perubahan di luar scope.
- Verifikasi: `npm run build` lulus (warning ukuran chunk existing), `npm run lint` lulus dengan 7 warning existing di luar scope, dan `git diff --check` lulus sebelum sinkronisasi graph akhir.
- Verifikasi tambahan: 4 test Vitest lulus; `graphify update .` berhasil menyinkronkan knowledge graph menjadi 1.805 node dan 3.607 edge dengan warning 7 file konfigurasi/non-source menghasilkan zero node.

### 2026-07-31 — SRC-05 aktivasi profile view lokal

- Graphify query digunakan lebih dulu untuk memetakan `ProfileView`, profile repository/service/hook, `UserDetailPage`, dan route `/users/:id`.
- Mengaktifkan `frontend/src/components/profile/ProfileView.tsx` pada halaman detail user melalui alur `Page → Hook → Service → Repository → Supabase`.
- Profile view menampilkan kontrak lokal `fullName`, `email`, `avatarUrl`, role, serta status persetujuan yang diturunkan dari role (`pending` berarti menunggu persetujuan); tidak menambahkan atau memakai `username`/`bio`.
- Profile service mengorkestrasi profile beserta project dan test suite milik user untuk tampilan penuh, tanpa perubahan schema atau migration.
- Route admin `/users/:id` tetap aktif dan sekarang merender shared profile view.
- Verifikasi: `npm run build` lulus (661 modules), `npm run lint` lulus dengan 7 warning existing di luar scope, dan `git diff --check` lulus; warning ukuran chunk utama tetap existing. Migration tidak dibuat maupun dijalankan ke Supabase target.
- `graphify update .` berhasil menyinkronkan knowledge graph menjadi 1.808 node dan 3.611 edge; Graphify memberi warning 7 file konfigurasi/non-source menghasilkan zero node.

### 2026-07-31 — SRC-09a port halaman utama batch 1

- Menjalankan `graphify query` sebelum memetakan halaman aktif dan referensi
  `pages-new` untuk Projects, Project Detail, Test Cases, dan Test Plans sesuai
  FEATURE_BACKLOG Section 7.
- Memport perilaku responsif source-new ke empat halaman aktif: representasi
  baris ringkas pada layar kecil, paginator/scroll DataTable bersama, pilihan
  jumlah baris, dan detail Project yang dapat diringkas.
- Mempertahankan route serta seluruh fitur lokal pada halaman terkait, termasuk
  filter dan sorting, bulk update, AI test case, import Excel/library, custom
  test run, activity, penghapusan terkontrol, dan pemeriksaan RBAC. `App.tsx`
  tidak diganti dan tidak ada migration yang dijalankan.
- Verifikasi: `npm run build` lulus (warning ukuran chunk existing), `npm run
  lint` lulus dengan 7 warning existing di luar scope, dan `git diff --check`
  lulus sebelum sinkronisasi graph akhir.
- `graphify update .` berhasil menyinkronkan knowledge graph menjadi 1.813 node
  dan 3.638 edge; Graphify memberi warning 7 file konfigurasi/non-source
  menghasilkan zero node.

### 2026-07-31 — SRC-09c port halaman utama batch 3

- Menjalankan `graphify query` sebelum mengaudit Dashboard, Requirements,
  Integrations, Automation, serta User/Profile aktif dan referensi `pages-new`
  sesuai FEATURE_BACKLOG Section 7.
- Memport UX daftar user yang kompatibel dengan domain lokal: pencarian nama
  atau email, filter multi-role, reset filter, paginator bersama, pilihan jumlah
  baris, dan representasi baris responsif pada layar kecil.
- Mempertahankan seluruh aksi approval, promote/demote, revoke, delete, route
  admin `/users` dan `/users/:id`, serta profile view lokal berbasis `fullName`,
  `email`, dan `avatarUrl`; kontrak source-new `username`/`bio` dan public
  profile tidak diaktifkan karena tidak didukung schema lokal.
- Dashboard, Requirements, Integrations, dan Automation dipertahankan pada
  halaman aktif karena tidak memiliki pasangan referensi di snapshot
  `pages-new`; route dan fitur lokalnya telah diaudit tanpa mengganti `App.tsx`.
- Tidak ada migration yang dibuat atau dijalankan. Verifikasi `npm run build`
  lulus (663 modul; warning ukuran chunk existing).
- `graphify update .` berhasil menyinkronkan knowledge graph menjadi 1.816 node
  dan 3.672 edge; Graphify memberi warning 7 file konfigurasi/non-source
  menghasilkan zero node.

### 2026-07-31 — SRC-13 audit App-new (BLOCKED untuk promosi)

- Menjalankan `graphify query` sebelum menelusuri `App.tsx`, `App-new.tsx`,
  guard auth/admin, layout, toast, fallback, redirect, dan halaman tujuan sesuai
  FEATURE_BACKLOG Section 7 SRC-13.
- Keputusan: `App-new.tsx` **tidak menggantikan** `App.tsx`. Promosi diblokir
  karena route parity, auth, dan RBAC belum setara; `App.tsx` aktif tetap menjadi
  sumber route aplikasi.
- Parity yang sudah ada: kedua app memakai `ProtectedRoute` di luar
  `AppLayout`, memakai `AdminRoute` untuk `/users` dan `/users/:id`, serta
  mempertahankan route bersama `/login`, Project detail/settings, Test
  Plan/Case/Suite list-detail, Test Run list issue/detail, dan Issue detail.
- Selisih route/auth aktif yang hilang dari App-new: public
  `/pending-approval`; `/home`; `/dashboard`; Project integrations,
  requirements, CI/CD, automation, data management, dan custom Test Run; serta
  admin `/admin/data-retention`. Ketiadaan `/pending-approval` memutus tujuan
  redirect user ber-role `pending` dari `ProtectedRoute`.
- Konflik route: `/` aktif membuka Projects, sedangkan App-new membuka Home;
  App-new memindahkan Projects ke `/projects`. Route `/test-runs/:id` juga
  mengganti `TestRunDetailPage` aktif dengan `TestRunResultDetailPage` yang tidak
  tersedia pada source aktif.
- Route tambahan App-new `/settings` dan `/:usernameWithAt` belum bisa
  diaktifkan karena `SettingsPage`, `PublicProfilePage`, dan kontrak public
  profile `username` tidak tersedia/didukung oleh domain lokal. Wildcard dinamis
  tingkat-root tersebut juga berisiko menangkap URL yang tidak dikenal; kedua
  app belum memiliki catch-all `*`/404 redirect eksplisit.
- Guard dan layout yang direferensikan sama, tetapi cakupan RBAC App-new lebih
  lemah karena route data-retention admin hilang. Redirect guard aktif tetap:
  tanpa sesi → `/login`, pending → `/pending-approval`, tidak approved →
  `/login`, dan non-admin → `/`.
- Lazy loading/fallback belum parity dengan kriteria target: kedua app masih
  memakai import eager dan tidak memakai `React.lazy`/`Suspense`; fallback yang
  tersedia hanya spinner loading auth di `ProtectedRoute`, tanpa fallback
  route-level atau error/404 fallback.
- App-new juga tidak dapat dikompilasi apa adanya karena merujuk `AppToast`,
  `useDialogResizeFix`, `TestRunResultDetailPage`, `SettingsPage`, dan
  `PublicProfilePage` yang tidak ada pada source aktif. Karena file referensi
  tersebut tidak diaktifkan, tidak ada smoke test seluruh halaman App-new yang
  dapat dinyatakan lulus.
- Tidak ada migration, perubahan route aktif, commit, push, atau refactor di
  luar scope. Tindak lanjut sebelum promosi memerlukan penyelesaian SRC-09 dan
  SRC-12, pemulihan seluruh route lokal/RBAC/auth di kandidat app, keputusan
  produk untuk landing `/` dan public profile/settings, implementasi lazy +
  fallback/404, lalu smoke test semua halaman.
- Verifikasi aplikasi aktif: `npm run build` lulus (663 modul; warning chunk
  utama existing sekaligus bukti belum ada route-level code splitting) dan
  `git diff --check` lulus. `graphify update .` berhasil menyinkronkan graph
  menjadi 1.818 node/3.674 edge dengan warning 7 file konfigurasi/non-source
  menghasilkan zero node.

### 2026-07-31 — SRC-DOD audit exclusion TypeScript source-new

- Menjalankan `graphify query` dan mengacu pada FEATURE_BACKLOG Section 7
  sebelum mengaudit `frontend/tsconfig.app.json`.
- Menghapus exclusion `src/components/issues` karena implementasi aktifnya
  sudah kompatibel dengan domain/service lokal dan lulus pemeriksaan TypeScript.
- Exclusion berikut masih dipertahankan dengan alasan tertulis:
  - `src/components/layout-new`: snapshot masih memakai kontrak auth/profile dan
    notification source-new (`user`, `username`, `displayName`,
    `referenceType`/`referenceId`) yang tidak tersedia pada domain lokal.
  - `src/components/ui-new`: snapshot masih memakai type dan API activity,
    attachment, profile, serta import service source-new yang tidak tersedia
    atau berbeda dari kontrak aktif.
  - `src/helpers/helpers-new`: import relatif snapshot menunjuk
    `../types/domain` dari lokasi yang salah dan helper tersebut sudah dipilih
    atau diadaptasi ke helper aktif pada SRC-07, bukan diaktifkan mentah.
  - `src/hooks/hooks-new`: import relatif snapshot menunjuk service,
    repository, config, type, dan component dari lokasi yang salah; lifecycle
    serta permission behavior yang valid sudah dipindahkan ke hook aktif.
  - `src/pages/pages-new`: SRC-09 belum selesai dan halaman snapshot belum
    memiliki parity route, fitur lokal, auth, serta RBAC penuh.
  - `src/repositories/repositories-new`: import relatif snapshot menunjuk
    config/helper/type dari lokasi yang salah dan kontrak query yang kompatibel
    sudah dipindahkan ke repository aktif pada SRC-10.
  - `src/services/services-new`: import relatif snapshot menunjuk repository,
    helper, config, dan type dari lokasi yang salah; business rule yang valid
    sudah dipindahkan ke service aktif pada SRC-11.
  - `src/App-new.tsx`: SRC-13 belum dapat dipromosikan karena route parity,
    auth/RBAC, lazy fallback, sejumlah component/page, dan kontrak public
    profile belum tersedia.
- Percobaan type-check tanpa seluruh exclusion `*-new` mengonfirmasi alasan di
  atas melalui error import/kontrak; exclusion tersebut dipulihkan tanpa
  mengubah snapshot referensi. Tidak ada migration, commit, push, atau perubahan
  fitur di luar scope.
- Verifikasi final lulus: `npx tsc -b --force`, `npm run build` (663 modul;
  warning ukuran chunk existing), `npm run lint` (7 warning existing di luar
  scope), dan `git diff --check`. `graphify update .` berhasil menyinkronkan
  knowledge graph menjadi 1.818 node dan 3.674 edge dengan warning 7 file
  konfigurasi/non-source menghasilkan zero node.

### 2026-07-31 — E03-T06 audit filter priority dan status Test Case

- Menjalankan `graphify query` sebelum menelusuri implementasi halaman Test Case dan membaca scope `FEATURE_BACKLOG.md`.
- Memverifikasi bahwa `TestCasesPage.tsx` pada baseline saat ini sudah menyediakan Dropdown priority (`low`, `medium`, `high`, `critical`) dan status (`active`, `archived`), meneruskan nilainya lewat `testCaseService.listFiltered()`, serta membersihkan keduanya melalui aksi Reset.
- Tidak mengubah source fitur karena scope E03-T06 sudah terpenuhi oleh implementasi existing; tidak ada migration, perubahan database, dependency, commit, push, atau refactor di luar scope.
- Verifikasi frontend: `npm run build` lulus.

### 2026-07-31 — E06-T14 status rejected approval user

- Menjalankan `graphify query` sebelum menelusuri alur Profile dan membaca scope approval user di `FEATURE_BACKLOG.md`, `TODO.md`, serta open question `docs/PRD.md`.
- Menambahkan migration baru `schema_041_profile_rejected_role.sql` untuk memperluas check constraint `profiles.role` dengan status `rejected`; migration tidak dijalankan ke Supabase target.
- Memperbarui `UserRole`, mapper Profile, dan `profileService.reject()` tanpa mengubah layering repository yang sudah menerima domain `UserRole` melalui `updateRole()`.
- Memperbarui User Management dengan label/filter status Ditolak, aksi Tolak untuk user pending, konfirmasi dan toast, serta opsi approve ulang untuk user rejected. Cabut Akses tetap mengembalikan user approved ke `pending` karena berbeda dari penolakan pendaftaran eksplisit.
- Verifikasi lulus: `npm run build`, `npm run lint` (7 warning existing di luar scope), dan `git diff --check`. Knowledge graph disinkronkan kembali dengan `graphify update .`.
