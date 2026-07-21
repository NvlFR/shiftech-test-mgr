# TASKS — TestManager (shiftech-test-mgr)

Hierarchical work breakdown (Epic → Feature → Task). Rujuk ID task ini saat
membuat perubahan atau mengambil item dari [`TODO.md`](../TODO.md).

Status: `done` · `in-progress` · `todo` · `blocked`

---

## E01 — Fondasi Arsitektur

| ID      | Task                                                                            | Status |
| ------- | ------------------------------------------------------------------------------- | ------ |
| E01-T01 | Scaffold Vite + React + TS                                                      | done   |
| E01-T02 | Install & konfigurasi PrimeReact 10 + PrimeFlex + PrimeIcons                    | done   |
| E01-T03 | Setup Supabase client (`config/supabaseClient.ts`) + `.env.example`             | done   |
| E01-T04 | Definisikan domain types (`types/domain.ts`)                                    | done   |
| E01-T05 | Buat schema SQL (`supabase/schema.sql`) + seed                                  | done   |
| E01-T06 | Buat mapper row↔domain (`helpers/mappers.ts`)                                   | done   |
| E01-T07 | Setup routing (`react-router-dom`) + layout shell (Menubar)                     | done   |
| E01-T08 | Dokumentasi: CLAUDE.md, AGENTS.md, README.md, docs/PRD.md, docs/ARCHITECTURE.md | done   |

## E02 — Modul Projects

| ID      | Task                                                                    | Status |
| ------- | ----------------------------------------------------------------------- | ------ |
| E02-T01 | Repository `projectRepository` (findAll, create)                        | done   |
| E02-T02 | Service `projectService` (validasi nama)                                | done   |
| E02-T03 | Halaman `ProjectsPage` (list + create dialog)                           | done   |
| E02-T04 | Edit & delete project                                                   | todo   |
| E02-T05 | Project selector/context global (dipakai TestPlansPage & TestCasesPage) | todo   |

## E03 — Modul Test Cases

| ID      | Task                                                                                                                  | Status |
| ------- | --------------------------------------------------------------------------------------------------------------------- | ------ |
| E03-T01 | Repository `testCaseRepository` (CRUD + `findAllByProjectWithDetails` join module/tags)                               | done   |
| E03-T02 | Service `testCaseService` (validasi title/steps/expected, archive/reactivate, tag saving)                             | done   |
| E03-T03 | Halaman `TestCasesPage` (list lintas project via dropdown, read-only — CRUD ada di tab Project Detail)                | done   |
| E03-T04 | Form create/edit test case (Dialog) — Module, Objective, Preconditions, Steps, Expected Result, Priority, Tags, Notes | done   |
| E03-T05 | Delete test case + konfirmasi                                                                                         | done   |
| E03-T06 | Filter by priority/status                                                                                             | todo   |

## E04 — Modul Test Plans

| ID      | Task                                                                                                                           | Status     |
| ------- | ------------------------------------------------------------------------------------------------------------------------------ | ---------- |
| E04-T01 | Repository `testPlanRepository` (CRUD)                                                                                         | done       |
| E04-T02 | Service `testPlanService` (create/rename/status, `listCases` — TANPA summary, lihat E08)                                       | done       |
| E04-T03 | Hook `useTestPlans`, `useTestPlanDetail`                                                                                       | done       |
| E04-T04 | Halaman `TestPlansPage` (list + navigasi ke detail)                                                                            | done       |
| E04-T05 | Halaman `TestPlanDetailPage`: tab Test Cases (cakupan plan) + tab Test Runs                                                    | done       |
| E04-T06 | Form create test plan (Dialog)                                                                                                 | done       |
| E04-T07 | UI tambah/keluarkan test case ke plan (MultiSelect dari test case pool project)                                                | done       |
| E04-T08 | ~~UI catat hasil eksekusi per test case~~ — **dipindah ke Test Run** (lihat E08), Test Plan sendiri tidak lagi menyimpan hasil | superseded |

## E07 — Project Lifecycle (search, filter, sort, status, hapus permanen, detail)

| ID      | Task                                                                                                                 | Status |
| ------- | -------------------------------------------------------------------------------------------------------------------- | ------ |
| E07-T01 | Schema: `projects.status` + index status/name (`supabase/schema_project_lifecycle.sql`)                              | done   |
| E07-T02 | Repository `projectRepository`: `findAll(query)` dengan search/filter/sort, `updateStatus`, `deletePermanently`      | done   |
| E07-T03 | Service `projectService`: `update`, `changeStatus`, `deletePermanently`                                              | done   |
| E07-T04 | Hook `useProjects(query)`                                                                                            | done   |
| E07-T05 | `ProjectsPage`: search bar, dropdown filter status, kolom sortable, menu aksi per baris (edit/status/hapus permanen) | done   |
| E07-T06 | `ProjectDetailPage`: info project + tab Test Plans/Test Cases + hapus permanen                                       | done   |
| E07-T07 | Route `/projects/:id`                                                                                                | done   |

## E05 — Polish (opsional, sesuai kebutuhan validasi arsitektur)

| ID      | Task                                     | Status |
| ------- | ---------------------------------------- | ------ |
| E05-T01 | Toast notification global (sukses/error) | todo   |
| E05-T02 | Loading skeleton konsisten               | todo   |
| E05-T04 | Vitest + Testing Library setup           | todo   |

## E06 — Auth & RBAC (Google Login + User Management)

| ID      | Task                                                                                                                 | Status                            |
| ------- | -------------------------------------------------------------------------------------------------------------------- | --------------------------------- |
| E06-T01 | Schema `profiles` + trigger auto-create on signup (`supabase/schema_auth.sql`)                                       | done                              |
| E06-T02 | RLS berbasis role (`is_admin()`, `is_approved()`) di semua tabel domain + `profiles`                                 | done                              |
| E06-T03 | Domain type `Profile`, `UserRole` + mapper                                                                           | done                              |
| E06-T04 | Repository & service `profileRepository`/`profileService` (getOwnProfile, listAll, approve, reject, promote, demote) | done                              |
| E06-T05 | `AuthProvider` (`hooks/useAuth.tsx`) — session + profile + role state, `signInWithGoogle`, `signOut`                 | done                              |
| E06-T06 | Halaman `LoginPage` (tombol Sign in with Google)                                                                     | done                              |
| E06-T07 | Halaman `PendingApprovalPage`                                                                                        | done                              |
| E06-T08 | Route guard `ProtectedRoute` (redirect login/pending) & `AdminRoute`                                                 | done                              |
| E06-T09 | Halaman `UserManagementPage` (list user, approve, promote/demote)                                                    | done                              |
| E06-T10 | Update `AppLayout` — avatar, nama user, tombol logout, menu User Management khusus admin                             | done                              |
| E06-T11 | Konfigurasi Google OAuth provider di Supabase Dashboard (Client ID/Secret dari Google Cloud Console)                 | done (dikonfirmasi user)          |
| E06-T12 | Set admin pertama manual via Supabase Table Editor setelah login pertama kali                                        | done (dikonfirmasi user)          |
| E06-T13 | Halaman reject eksplisit / status "rejected" terpisah dari "pending" (jika diperlukan)                               | todo — lihat open question di PRD |
| E06-T14 | Schema: `profiles.deleted_at` (soft delete) + RLS diperbarui (`supabase/schema_project_lifecycle.sql`)               | done                              |
| E06-T15 | Repository/service: `softDelete`/`remove`, `revokeAccess`, `getById`                                                 | done                              |
| E06-T16 | Halaman `UserDetailPage` (`/users/:id`)                                                                              | done                              |
| E06-T17 | `UserManagementPage`: tombol Detail, Cabut Akses, Hapus + `ConfirmDialog`/`Toast`                                    | done                              |

## E08 — Test Management v2 (Module, Tag, Test Run, Test Result, Issue)

Reshape besar mengikuti konsep produk: pisahkan template (Test Case) dari
riwayat eksekusi (Test Run/Result). Lihat `docs/PRD.md` §3 dan
`docs/ARCHITECTURE.md` §4.0 untuk rationale lengkap.

| ID      | Task                                                                                                                                                                                                                    | Status |
| ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| E08-T01 | Schema `schema_test_management_v2.sql`: modules, tags, test_case_tags, test_runs, test_results, issues; reshape test_cases (+module_id, objective, notes, status active/archived) & test_plan_cases (hapus kolom hasil) | done   |
| E08-T02 | Domain types baru: `Module`, `Tag`, `TestRun`, `TestResult`, `Issue` + update `TestCase`/`TestPlanCase`                                                                                                                 | done   |
| E08-T03 | Mapper untuk semua entity baru                                                                                                                                                                                          | done   |
| E08-T04 | Repository/service Module (`moduleRepository`/`moduleService`/`useModules`)                                                                                                                                             | done   |
| E08-T05 | Repository/service Tag dengan creatable resolution (`tagRepository.findOrCreate`, `tagService.saveTagsForTestCase`)                                                                                                     | done   |
| E08-T06 | Repository/service Test Run (`testRunService.start` seeds test_results, `complete`/`reopen` manual, `getWithResults` summary otomatis)                                                                                  | done   |
| E08-T07 | Repository/service Test Result (`recordResult`)                                                                                                                                                                         | done   |
| E08-T08 | Repository/service Issue (1:many terhadap Test Result, `listByTestRun` join test_results)                                                                                                                               | done   |
| E08-T09 | `ProjectDetailPage`: tab Modules (CRUD) + tab Test Cases lengkap (dialog Module/Tag/Objective/Notes)                                                                                                                    | done   |
| E08-T10 | `TestPlanDetailPage`: hapus progress lama, tab Test Cases (add/remove cakupan) + tab Test Runs (mulai run, riwayat)                                                                                                     | done   |
| E08-T11 | `TestRunDetailPage`: summary otomatis, catat hasil per test case (status/tester/notes), tombol selesaikan/buka kembali run                                                                                              | done   |
| E08-T12 | `TestRunIssuesPage`: list issue per run, ubah status & assignee inline                                                                                                                                                  | done   |
| E08-T13 | Routing `/test-runs/:id`, `/test-runs/:id/issues`                                                                                                                                                                       | done   |
| E08-T14 | Halaman reject eksplisit / status "rejected" terpisah (jika diperlukan)                                                                                                                                                 | todo   |
| E08-T15 | Attachment Issue (jika diperlukan — link URL atau upload file, lihat open question PRD)                                                                                                                                 | todo   |

## E09 — Restrukturisasi Monorepo (frontend/ + backend/)

| ID      | Task                                                                                                                     | Status                   |
| ------- | ------------------------------------------------------------------------------------------------------------------------ | ------------------------ |
| E09-T01 | Pindahkan aplikasi React ke `frontend/` (package.json, node_modules, vite.config, tsconfig, index.html, public, .env)    | done (oleh user)         |
| E09-T02 | Pindahkan `src/` ke `frontend/src/`                                                                                      | done                     |
| E09-T03 | Siapkan folder `backend/` untuk migrasi PHP + SQLite masa depan                                                          | done (kosong, disiapkan) |
| E09-T04 | Migrasi repository layer ke backend PHP (mengganti isi `repositories/*.ts` dari Supabase call ke `fetch()` endpoint PHP) | todo — belum prioritas   |

## E10 — Kode Entity Auto-Generate (Module, Test Case, Test Plan, Test Run)

Default otomatis (`MOD-0001`, `TC-0001`, `TP-0001`, `TR-0001`, per project per
jenis entity), selalu bisa diedit user.

| ID      | Task                                                                                                                                                                                                                     | Status |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------ |
| E10-T01 | Schema `schema_entity_codes.sql`: tabel `entity_code_sequences`, fungsi `next_entity_code()`, trigger `before insert` di modules/test_cases/test_plans/test_runs, backfill kode untuk row lama, unique index per project | done   |
| E10-T02 | Domain types: tambah field `code` di `Module`/`TestCase`/`TestPlan`/`TestRun`                                                                                                                                            | done   |
| E10-T03 | Mapper: map kolom `code` untuk keempat entity                                                                                                                                                                            | done   |
| E10-T04 | Repository/service: `create()` terima `code` opsional (kosong → trigger DB isi otomatis), `update()` terima `code` untuk override manual                                                                                 | done   |
| E10-T05 | UI: kolom "Kode" di semua tabel (Modules, Test Cases, Test Plans, Test Runs) + field "Kode" (placeholder "Otomatis jika dikosongkan") di dialog create/edit Module, Test Case, Test Plan                                 | done   |
| E10-T06 | Judul halaman detail (`TestPlanDetailPage`, `TestRunDetailPage`) menampilkan kode                                                                                                                                        | done   |

## E11 — Perbaikan Gap (audit menyeluruh setelah E08)

Ditemukan saat audit: Tag dan Test Run sudah punya backend lengkap (E08) tapi
UI-nya belum sepenuhnya terhubung/terlihat.

| ID      | Task                                                                                                                                                             | Status |
| ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| E11-T01 | Repository/service Tag: tambah `update`(rename)/`remove` (sebelumnya hanya `findOrCreate`)                                                                       | done   |
| E11-T02 | Tab "Tags" di `ProjectDetailPage`: list, rename (dialog), hapus — melengkapi Tag yang sebelumnya cuma bisa dibuat on-the-fly tanpa cara melihat/mengelola daftar | done   |
| E11-T03 | Repository `testRunRepository.findAllByProject` — join test_runs ke test_plans untuk listing lintas plan dalam satu project                                      | done   |
| E11-T04 | Halaman `TestRunsPage` (`/test-runs`) — daftar Test Run lintas project, pola sama seperti `TestCasesPage`/`TestPlansPage`                                        | done   |
| E11-T05 | Tambah item "Test Runs" ke `AppMenu` (sidebar) — sebelumnya tidak ada entri navigasi ke Test Run kecuali lewat Test Plan Detail                                  | done   |
