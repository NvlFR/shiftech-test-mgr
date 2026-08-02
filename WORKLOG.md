# Worklog

## 2026-08-02 — SRC-13 ditutup: App-new ditolak, 404 ditambahkan

**Keputusan produk diambil (sebelumnya memblokir SRC-13):**

- `App-new.tsx` **DITOLAK untuk promosi** dan berkasnya dihapus. Ini bukan
  judgment call — buktinya diverifikasi ulang pada sesi ini:
  - `/pending-approval` ada di `App.tsx` aktif tetapi hilang di App-new,
    padahal itu tujuan redirect `ProtectedRoute` untuk user ber-role `pending`.
    Mempromosikannya = memutus alur RBAC.
  - `/dashboard`, `/home`, `/admin/data-retention`, Project integrations,
    requirements, CI/CD, automation, data management, dan custom Test Run
    juga hilang. Total 32 route aktif vs 18 route App-new.
  - Merujuk 4 modul yang tidak ada di source aktif (`AppToast`,
    `useDialogResizeFix`, `TestRunResultDetailPage`, `PublicProfilePage`),
    jadi tidak dapat dikompilasi apa adanya.
  - Berkas gitignored dan tidak pernah ter-commit, sehingga penghapusan tidak
    dapat dibatalkan lewat git. Dicadangkan ke scratchpad sesi sebelum dihapus.

**Celah nyata yang ditemukan dan diperbaiki:**

- **Kedua app sama-sama tidak punya catch-all `*`.** URL tak dikenal merender
  halaman kosong tanpa penjelasan — pengguna tidak bisa membedakan salah alamat
  dari aplikasi rusak. Ditambahkan `pages/NotFoundPage.tsx` dan route `*` di
  dalam `AppLayout`, sehingga 404 tetap tampil bersama navigasi aplikasi.
  Pengunjung yang belum login tetap dialihkan `ProtectedRoute` ke `/login`.

**Tiga ide dari App-new dipindah jadi fitur tersendiri (Section 17 baru):**

- 17.1 Halaman Settings user, 17.2 public profile `/@username`, 17.3 landing `/`
  menjadi Home. Dikerjakan di atas `App.tsx` aktif, bukan lewat penggantian
  berkas route wholesale.
- Catatan keputusan teknis ditambah: **jangan memakai wildcard root (`/:param`)
  untuk profil publik** seperti yang dilakukan App-new — pola itu menangkap
  setiap URL tak dikenal dan membuat catch-all 404 tidak pernah tercapai.
  Gunakan prefix eksplisit `/@:username`.
- Section "Catatan keputusan teknis" bergeser 17 → 18.

**Antrean:** SRC-13 dipindah ke Selesai, 3 task APPNEW-01..03 ditambahkan.
Status: 12 antrean, 151 selesai, **0 diblokir**.

**Verifikasi:** tsc 0 error, vitest 178/178, `smoke.sh` lolos.


## 2026-08-02 — Loop berhenti karena kuota Codex habis, bukan karena kode

**Penyebab sebenarnya dari 10 task yang "diblokir":**

- Seluruhnya gagal dengan `codex exec gagal (exit 1)` dalam ~75 detik per task,
  jauh lebih cepat dari siklus normal ~6 menit. Isi session log:
  `ERROR: You've hit your usage limit ... try again at Aug 8th, 2026 3:33 AM`.
- Jadi 9 task TIDAK PERNAH benar-benar dijalankan — Codex ditolak server sejak
  awal. Melabelinya `blocked` menyesatkan: seolah task-nya bermasalah.
- Kuota reset 8 Agustus 2026 pukul 03:33.
- Kesalahan sekunder di log: refresh OAuth MCP `supabase` gagal (HTTP 530
  error 1033). Transien dan bukan penyebab berhentinya loop.

**AUDIT-02 ternyata selesai, hanya gagal melapor:**

- Perubahannya ada di disk (FEATURE_BACKLOG.md Section 9–11 direkonsiliasi +
  entri WORKLOG), tetapi prosesnya ditolak server sebelum menulis verdict.
- Klaimnya diverifikasi manual sebelum di-commit: `--headed`, `--slow-mo`,
  `--ui`, `PWDEBUG`, `deviceProfile` memang ada di `runner/src`;
  `schema_029_project_repositories.sql` dan domain `ProjectRepository` memang ada.
- Di-commit sebagai `agent-task 90`.

**Dua perbaikan pada `run.sh`:**

1. **Deteksi kegagalan sistemik.** Bila session log memuat pola kuota/otentikasi
   (`hit your usage limit`, `quota exceeded`, `rate limit`, `401 Unauthorized`,
   `not authenticated`), loop BERHENTI TOTAL dan task dikembalikan ke antrean
   tanpa ditandai `blocked`. Tanpa ini, satu kuota habis akan menghanguskan
   seluruh sisa antrean dalam hitungan menit. Notifikasi Telegram 🛑 dikirim
   berisi pesan limit dan waktu reset. Diuji terhadap session log asli: terdeteksi.
2. **Perbaikan hitungan `blocked_n`.** Versi lama memakai
   `awk '/^## Diblokir/{f=1;next} f && /^- /'` yang ikut menghitung section
   "Butuh Manusia" di bawahnya, sehingga melaporkan 17 padahal hanya 11.
   Kini berhenti pada heading berikutnya dan hanya menghitung `^- [`.

**Antrean dirapikan:** 9 task dikembalikan ke Antrean (AUDIT-03..05,
E2E-INFRA-01..03, CONN-10, CLEAN-01..02), AUDIT-02 dipindah ke Selesai.
Status: 9 antrean, 150 selesai, 1 diblokir (SRC-13, butuh keputusan produk).

**Verifikasi repo:** tsc 0 error, semua commit sudah ter-push.


## 2026-08-02 — AUDIT-02 rekonsiliasi FEATURE_BACKLOG Section 9–11

- Menjalankan `graphify query` sebelum audit, lalu merekonsiliasi setiap checkbox
  Section 9, 10, dan 11 terhadap source, migration, test, dokumentasi runner/MCP,
  serta bukti implementasi PW-01–19, REPO-01–10, dan E2E-01–19 di worklog.
- Section 9 kini seluruhnya tercentang; lima item mode headed/slow-mo, UI, debug,
  watch, serta browser/device yang tertinggal sudah terbukti oleh implementasi dan
  unit test runner PW-01–03.
- Dari 25 item Section 10 yang sebelumnya kosong, 22 dicentang berdasarkan bukti
  model/layer repository, mode local/GitHub/git URL, Vault dan Edge Function,
  konteks MCP, clone/pull script, traceability/regression, serta UI. Tiga gap riil
  tetap kosong: GitHub App installation token, aksi revoke kredensial repository
  dari UI (backend revoke ada, tetapi belum tersambung ke UI), dan sinkronisasi
  dua arah Issue TestManager dengan GitHub Issue.
- Section 11 diselaraskan dengan implementasi E2E yang sudah ada. Dua item tetap
  kosong karena belum ada bukti cukup: pemantauan otomatis Issue `resolved` yang
  belum diverifikasi, dan acceptance run utuh dari satu requirement sampai
  `verified` dengan hanya dua langkah manual yang diizinkan.
- Tidak mengubah kode aplikasi atau schema, tidak menjalankan migration ke target,
  tidak mengakses credential, tidak menghapus data, serta tidak commit/push.

## 2026-08-02 — AUDIT-01 rekonsiliasi FEATURE_BACKLOG Section 6–8

- Menjalankan `graphify query` sebelum menelusuri Section 6–8, lalu
  memverifikasi setiap item yang masih kosong terhadap source, migration, test,
  konfigurasi, dan dokumentasi repo.
- Mencentang hanya deliverable dengan bukti konkret: permission granular
  (`schema_080`), port halaman/domain dan audit App-new, alasan exclusion
  TypeScript, sinkronisasi dokumentasi source-new, fondasi/auth/project scope/
  read-only/docs MCP, tool write Test Case/Test Plan, serta guardrail MCP.
- Membiarkan item environment tetap kosong: seluruh route tanpa error console,
  smoke test workflow lengkap, dan migration Supabase target belum memiliki
  bukti eksekusi yang cukup di repo. Klaim tidak hilangnya fitur/RBAC juga tidak
  dinaikkan hanya dari pemeriksaan statis.
- Tidak menjalankan migration, tidak mengakses Supabase target, dan tidak
  mengubah kode aplikasi.
- Verifikasi frontend lulus: `npx tsc -b --force`, `npm run build`, dan
  `npm run lint` (delapan warning existing, tanpa error). Build tetap memuat
  warning ukuran chunk utama yang sudah dikenal; `git diff --check` dijalankan
  setelah perubahan dokumentasi final.
- Verifikasi MCP lulus: `cd mcp && npm test` menjalankan build TypeScript dan
  21/21 test file tanpa kegagalan.

## 2026-08-01 — Audit pasca-loop: 59 task salah diblokir, suite test diperbaiki

**Temuan utama: bug pada gate driver memblokir 59 task yang sebenarnya berhasil.**

- `changed_files()` di `run.sh` memakai `git diff --name-only HEAD`, yang TIDAK
  memuat berkas baru (untracked). Mayoritas task membuat berkas baru, sehingga
  lapis "klaim jujur" menyimpulkan `files_changed` tidak cocok dengan git.
- Dari 61 item Diblokir: 59 karena bug ini, 1 (TEST-10) karena sandbox Codex
  menolak binding localhost, 1 (SRC-13) karena butuh keputusan produk.
- Hasil kerja 59 task tetap utuh di disk, hanya tidak pernah ter-commit karena
  driver hanya commit pada status `completed`.
- Perbaikan: `changed_files()` kini menggabungkan `git diff --name-only HEAD`
  dengan `git ls-files --others --exclude-standard`.

**Verifikasi independen sebelum commit (tidak memakai laporan Codex):**

- Deliverable tiap blok dicek keberadaannya: `packages/agent-core` (kontrak
  Transport/Executor/ArtifactStorage/Auth/Repo + `SecretRedactorStream`),
  `runner/src/init.ts`, `schema_085_boot01_agent_bootstrap_codes.sql`,
  `.github/workflows/agent-runtime-dependencies.yml`, `ProjectConnectPage.tsx`,
  `skills/manifest.json`, 5 komponen automation, `vitest.config.ts`,
  `docs/TEST_DEBT.md`, `docs/MANUAL_SMOKE.md`. Semua ADA.
- Hasil: tsc 0 error, vitest 178/178 (stabil 3x), build hijau, runner 48/48,
  `smoke.sh` lolos (build + vite preview + muat aplikasi di headless browser),
  lint hanya warning.
- Test frontend naik dari 7 menjadi 178.

**Tiga cacat nyata ditemukan dan diperbaiki:**

1. `runner/test/runnerTokenRevocation.test.mjs` MENGGANTUNG (bukan gagal). Mock
   API-nya tidak punya `pollDiagnostic()` yang ditambahkan RUI-06 belakangan;
   pemanggilannya melempar TypeError yang tertangkap catch umum, lalu loop
   berputar selamanya. Kode runner sendiri benar. Ditambahkan stub.
2. `frontend/src/helpers/mappers.test.ts` gagal 3 test: daftar mapper usang
   (52 vs 54 aktual) dan ekspektasi field usang setelah `mapApiTokenRow` dan
   `mapAutomationRunnerRow` diperluas task berikutnya. Helper diperluas dengan
   parameter opsional untuk field default yang tidak berasal dari row.
3. Component test flaky: 3–5 test gagal berubah-ubah tiap run karena
   `testTimeout` bawaan 5 detik terlampaui saat beban paralel — bukan
   pencemaran antar-test. `vitest.config.ts` dinaikkan ke 20 detik, plus
   `restoreMocks`/`clearMocks`/`unstubEnvs`/`unstubGlobals`.

Pola yang sama pada ketiga cacat: task berikutnya memperluas kontrak tanpa
memperbarui test task sebelumnya, dan karena SEMUA task diblokir, tidak ada satu
pun yang menjalankan suite penuh sehingga kerusakannya tidak terlihat.

**Antrean dirapikan:**

- 59 task dipindah dari Diblokir ke Selesai dengan catatan bukti verifikasi.
- TEST-10 dipindah ke Selesai setelah `smoke.sh` dijalankan manual dan lolos.
- Sisa Diblokir tinggal 1: SRC-13 (butuh keputusan produk soal landing `/`,
  settings, dan public profile sebelum `App-new.tsx` boleh dipromosikan).
- Selesai: 148 task.

**Blok N ditambahkan (11 task) — rekonsiliasi backlog & sisa nyata:**

- FEATURE_BACKLOG.md masih memuat ~128 item `- [ ]` karena langkah "perbarui
  checkbox" pada 59 task yang diblokir tidak pernah dijalankan. Isinya campuran:
  checkbox usang, pernyataan kebijakan yang salah ditulis sebagai task, dan sisa
  pekerjaan nyata.
- AUDIT-01..05 merekonsiliasi per Section dengan syarat mencentang hanya bila ada
  bukti berkas, lalu menghasilkan `docs/REMAINING_WORK.md`.
- E2E-INFRA-01..03: Playwright untuk E2E aplikasi sendiri BELUM terpasang sama
  sekali di `frontend/` — ini sisa nyata, bukan checkbox usang. Dijalankan per
  batch, tidak dimasukkan ke gate per-task.
- CONN-10 (daftar skill + checkbox di halaman Connect), CLEAN-01 (berkas yatim),
  CLEAN-02 (bundle 2,55 MB melewati ambang peringatan Vite).


## 2026-08-01 — TEST-15 daftar smoke test manual sebelum rilis

- Menjalankan `graphify query` sebelum menelusuri autentikasi/RBAC, workflow
  Test Management, import/export Excel, dan attachment, lalu mengikuti scope
  Section 16.7 `FEATURE_BACKLOG.md`.
- Menambahkan `docs/MANUAL_SMOKE.md` berisi prasyarat, langkah, hasil yang
  diharapkan, dan tabel rekap untuk login Google, approval user pending, workflow
  Project → Test Case → Test Plan → Test Run → Test Result → Issue, import Test
  Case Excel, export Test Case dan laporan Test Run ke Excel, serta upload dan
  akses attachment private.
- Checklist menegaskan invariant manual completion Test Run, relasi Issue dari
  hasil FAIL, pembatasan akses user pending, validasi isi workbook, dan privasi
  attachment. Tidak mengubah kode, dependency, database, atau migration; tidak
  menjalankan migration ke Supabase target, tidak menghapus data, tidak commit,
  dan tidak push.
- Verifikasi lulus: seluruh cakupan wajib ditemukan pada dokumen dan
  `cd frontend && npm run build` berhasil (hanya warning ukuran chunk Vite yang
  sudah ada). `graphify update .` berhasil menyinkronkan knowledge graph menjadi
  2.783 node dan 5.655 edge; warning tujuh source tanpa node tidak menggagalkan
  proses.

## 2026-08-01 — Gate berlapis + Section 16 verifikasi fitur

**Audit kondisi testing:**

- Frontend hanya punya 2 berkas test / 7 test untuk ~80 task fitur, dibanding
  `runner/` yang punya 9 berkas / 31 test dan `supabase/functions` 2 contract test.
- Tidak ditemukan penanda TODO/FIXME/not-implemented sama sekali di frontend,
  dan 7 test yang ada lolos. Namun ini bukti lemah: halusinasi agent justru
  berbentuk kode yang tampak lengkap.
- Ditemukan 4 hook yatim yang tidak pernah diimpor siapa pun: `useModules`,
  `useProjectBreadcrumbItems`, `useStoredState`, `useTabQueryParam`.
- Belum ada `jsdom`/`happy-dom`, `@testing-library/react`, maupun Playwright di
  frontend, sehingga component test dan E2E belum mungkin dijalankan.
- Kesimpulan jujur: tidak ada bukti kuat fitur rusak, tapi juga tidak ada bukti
  fitur jalan — karena tidak ada satu pun alat yang benar-benar menjalankannya.

**`run.sh` — gate diperluas dari 2 menjadi 6 lapis:**

1. Ada perubahan nyata — `completed` tanpa perubahan berkas ditolak.
2. Klaim jujur — berkas pada `files_changed` diverifikasi ke `git diff`.
3. Tanpa lubang baru — TODO/FIXME/not-implemented pada berkas yang diubah ditolak.
4. Tipe — jumlah error `tsc` tidak boleh naik (sudah ada sebelumnya).
5. Test — jumlah test gagal tidak boleh naik, DAN jumlah test tidak boleh
   berkurang (mencegah test dihapus/di-skip agar hijau).
6. Build + smoke — `smoke.sh` opsional dijalankan setelah build hijau untuk
   membuktikan aplikasi benar-benar boot; dilewati bila skrip belum ada.

- Env baru: `CODEX_LOOP_GATE_TEST`, `CODEX_LOOP_GATE_SMOKE`.
- Parser jumlah test diverifikasi terhadap output vitest nyata (gagal=0 total=7).

**FEATURE_BACKLOG.md Section 16 baru — "Verifikasi bahwa fitur benar-benar jalan":**

- 16.1 aturan main, 16.2 infrastruktur, 16.3 test invariant domain,
  16.4 unit test logika murni, 16.5 component test terbatas, 16.6 smoke & E2E,
  16.7 audit utang test, 16.8 endgame dogfooding. Catatan keputusan teknis
  bergeser 16 → 17.
- Keputusan yang ditulis eksplisit: **task menulis test wajib terpisah dari task
  implementasi** dan dikerjakan di sesi agent berbeda. Alasannya, test yang
  ditulis penulis kode yang sama dalam sesi yang sama hanya membuktikan
  tautologi — kalau agent salah paham requirement, test-nya ikut salah.
- Oracle independen yang dipakai adalah aturan domain di `CLAUDE.md`, karena
  ditulis manusia sebelum kodenya ada.
- E2E Playwright sengaja TIDAK masuk gate per-task: butuh boot aplikasi dan reset
  database tiap task, terlalu lambat dan rapuh. Dijalankan per batch.

**queue.md — Blok M (15 task) disisipkan di posisi paling depan:**

- TEST-01/02 infrastruktur, TEST-03..06 invariant domain, TEST-07..09 unit test,
  TEST-10 `smoke.sh`, TEST-11/12 component test terbatas, TEST-13 audit hook
  yatim, TEST-14 inventaris utang test, TEST-15 daftar smoke manual.
- Ditaruh paling depan karena lapis 5 dan 6 gate baru tidak punya arti sebelum
  infrastruktur test ada. Antrean 52 → 67 task.


## 2026-08-01 — Pemulihan setelah mati listrik + commit/push otomatis

**Pemeriksaan pasca mati listrik (PC mati ~03:48):**

- Loop sempat menyelesaikan 6 task (E2E-07 s/d E2E-12), semuanya ter-commit.
- Task ke-7 (E2E-13) mati ~40 detik setelah mulai; `session.log`-nya 0 byte,
  Codex belum sempat menulis apa pun.
- Tidak ada kerusakan: working tree bersih, E2E-13 tetap berada di posisi teratas
  Antrean (tidak hilang, tidak terduplikasi), `tsc` 0 error, `npm run build` hijau,
  test runner 31/31 lolos. Antrean/Selesai/Diblokir = 52/81/1.
- Penyebab selamatnya: `move_task` baru dipanggil SETELAH Codex selesai, sehingga
  task yang terpotong tidak pernah dipindahkan; ditambah auto-commit per task.

**Perubahan `run.sh`:**

- Pesan commit `codex-loop:` diganti menjadi `agent-task <N>:`.
- `<N>` dihitung dari riwayat git (`git log -E --grep='^(codex-loop|agent-task)'`),
  bukan dari counter sesi, supaya penomoran berlanjut setelah restart/mati mendadak
  dan tidak pernah terulang. Commit berikutnya = `agent-task 81`.
- Push otomatis tiap 10 task selesai (`--push-every N`, `--no-push`), plus push
  terakhir saat loop berakhir agar tidak ada commit tertinggal di lokal.
- Kegagalan push tidak menghentikan loop — commit tetap aman di lokal, dan
  notifikasi ⚠️ dikirim ke Telegram.
- Diedit langsung pada `run.sh` karena driver sedang tidak berjalan (diverifikasi
  dengan `ps` setelah `pgrep` sempat memberi false positive dari command sendiri).


## 2026-08-01 — Notifikasi Telegram codex-loop + konvensi DataTable

**Notifikasi Telegram (agar loop bisa ditinggal pergi):**

- `scripts/codex-loop/run.sh.next` — versi run.sh dengan fungsi `notify()` berbasis
  curl ke Telegram Bot API. Aktif hanya bila `TELEGRAM_BOT_TOKEN` dan
  `TELEGRAM_CHAT_ID` terisi; kalau tidak, senyap total dan loop tetap jalan.
- Titik notifikasi: loop mulai, task selesai, task diblokir, task dipecah, loop
  selesai, dan **driver mati mendadak** (lewat `trap ... EXIT`). Yang terakhir yang
  paling penting saat ditinggal — tanpa itu, loop yang mati dini hari baru
  ketahuan keesokan harinya.
- Sengaja tanpa `parse_mode`: isi pesan memuat potongan kode dan pesan error yang
  mudah membuat Telegram menolak pesan karena markup tidak valid.
- Kredensial dibaca dari `scripts/codex-loop/.env` (folder sudah di-gitignore);
  ditambahkan `.env.example` berisi cara memperoleh token dan chat id.
- `scripts/codex-loop/apply-update.sh` — skrip pergantian aman. **run.sh yang
  sedang berjalan tidak boleh ditimpa**: bash membaca skrip bertahap dari disk
  sambil menjalankannya, sehingga menimpanya dapat membuat bash mengeksekusi
  potongan byte yang salah. Skrip melakukan STOP rapi → tunggu → cadangkan →
  tukar → jalankan lagi.
- Patch dikerjakan pada salinan `run.sh.next`, bukan pada `run.sh` yang sedang
  berjalan. Diverifikasi driver tetap hidup dan tidak tersentuh.

**Konvensi PrimeReact DataTable (AGENTS.md):**

- Error TS2769 "No overload matches this call" pada `DataTable` sudah muncul
  berulang: `ProjectTestPlanTab.tsx` (diperbaiki manual 2026-07-31) dan
  `AiTestCaseReviewPage.tsx` pada task E2E-05. Codex memperbaikinya sendiri di
  percobaan kedua setelah gate menolak regresi 0→2 error.
- Karena berulang, akar penyebabnya ditulis sebagai konvensi di `AGENTS.md`:
  `DataTableProps` memakai discriminated union, sehingga `selectionMode`,
  bentuk `selection`, dan tipe event `onSelectionChange` harus konsisten.
  `selectionMode` tidak boleh `undefined` (pakai `null`), dan selection berbentuk
  array wajib memakai `DataTableSelectionMultipleChangeEvent<T[]>`.
  Dilarang menambal dengan `as unknown as T[]`.
- Ini mencegah pengulangan pada task Blok K dan L yang banyak membuat DataTable.

**Catatan penggunaan token (diukur dari 62 log sesi):**

- Total terpakai 5,49 juta token; rata-rata 88.500/task, median 89.900,
  rentang 40.400–143.200. Durasi 6 jam 12 menit, ~6 menit/task.
- Proyeksi sisa antrean: ~6,5 juta token (~7,3 jam), atau ~7,1 juta dengan
  overhead retry. Total proyek diperkirakan ~12 juta token.
- `auth_mode` Codex = `chatgpt`, sehingga batasnya berupa rate limit langganan
  (jendela 5 jam + kuota mingguan), bukan tagihan per token. Angka di atas
  kemungkinan batas atas karena memuat cached input token.


## 2026-08-01 — E2E-05 perbaikan gate verifikasi DataTable

- Memperbaiki overload TypeScript PrimeReact pada tabel review batch AI dengan mendeklarasikan `selectionMode="multiple"` langsung pada `DataTable` dan menghapus type assertion array yang keliru pada `onSelectionChange`.
- Verifikasi ulang: `cd frontend && npm run build` dan `npm run lint` lulus; lint hanya melaporkan 7 warning lama pada file yang tidak terkait, sedangkan peringatan ukuran chunk Vite tetap bersifat non-blocking. `git diff --check` juga lulus.
- Menjalankan `graphify update .`; ekstraksi melaporkan tidak ada pembaruan lalu proses watch gagal dengan `Operation not permitted` karena batas izin lingkungan.

## 2026-08-01 — E2E-05 review batch Test Case AI

- Menambahkan migration `schema_071_ai_test_case_review.sql` untuk identitas batch AI, keputusan review, approver, waktu review, indeks antrean, dan RPC bulk review atomik. Migration hanya dibuat sebagai file dan tidak dijalankan ke Supabase target.
- Menambahkan halaman `/test-cases/ai-review` dengan pemilih batch, seleksi massal, approve/reject per pilihan atau seluruh batch, serta editor field utama/module/tag sebelum keputusan.
- Menambahkan alur lengkap `AiTestCaseReviewPage -> useAiTestCaseReview -> testCaseService -> testCaseRepository -> Supabase`; keputusan manusia mengaktifkan atau mengarsipkan draf dan metadata approver ikut masuk ke audit trigger yang sudah ada.
- Generator sekarang memberi satu UUID batch pada seluruh draf dalam satu penyimpanan dan label aksi diperjelas menjadi `Simpan sebagai Draf`.
- Verifikasi: `cd frontend && npm run build` lulus; `cd frontend && npm run lint` lulus dengan 7 warning lama di file yang tidak terkait; `git diff --check` lulus.

## 2026-08-01 — 37 task baru masuk antrean Codex

- Menambahkan 37 task ke `scripts/codex-loop/queue.md` dari Section 12, 13, dan 14
  `FEATURE_BACKLOG.md`. Antrean 36 → 73 task tersisa.
- Blok H (10) — Adapter pattern & jahitan bersama: `packages/agent-core`,
  `TransportAdapter`/`ExecutorAdapter`/`ArtifactStorageAdapter`/`AuthAdapter`/
  `RepoAdapter`, konfigurasi terpadu, logging + redaksi rahasia, heartbeat seragam.
- Blok I (6) — Bootstrap code & setup anti-bocor: tabel `agent_bootstrap_codes`,
  `runner init --code`, permission 0600, trust repo eksplisit, peringatan eksekusi
  kode, pencabutan token berlaku seketika.
- Blok J (5) — Distribusi: paket `@testmanager/runner`, tarball + SHA256, matriks
  versi runner↔server, catatan networking Docker, guard CI nol runtime dependency.
- Blok K (9) — Halaman "Connect your agent": kerangka, panel MCP, feature groups,
  langkah + copy, skills pack, prompt starter, bootstrap satu perintah, keamanan,
  kualitas UI.
- Blok L (7) — Runner UI/UX: wizard onboarding, status runner, penjelasan job tidak
  terambil, papan job, mapping script, diagnostik, responsif.
- Blok H sengaja ditempatkan sebelum Blok K dan L: halaman Connect dan Runner UI
  keduanya menempel pada kontrak koneksi, jadi kontraknya harus jadi lebih dulu.
- **ADM-02 dikoreksi** — teks lama menyuruh "tolak `script_ref` di luar
  `TM_PROJECT_DIR`", padahal itu tidak cukup: `npx playwright test` memuat
  `playwright.config.ts` (kode Node biasa) sebelum satu test pun berjalan.
  Task diubah menjadi trust di level repo, bukan level file.
- Penulisan dilakukan saat driver sedang berjalan di task #61. Task baru
  di-append di ujung Antrean (driver mengambil dari atas) dan penulisan dilakukan
  saat Codex sedang mid-task, sehingga tidak bertabrakan dengan `move_task`.
  Diverifikasi setelahnya: driver tetap hidup, hitungan Selesai (60) dan Diblokir
  (1) tidak berubah, dan task berikutnya tetap PW-11 seperti sebelum penulisan.


## 2026-08-01 — Arsitektur & distribusi Local Agent (runner + MCP)

Hasil diskusi arsitektur runner. Ditulis ke `FEATURE_BACKLOG.md`.

**Keputusan yang diambil:**

- Runner dan MCP server **tetap dua proses untuk sekarang**, disatukan jadi satu
  **Local Agent** nanti. Alasan pemisahan: target deploy pertama adalah
  self-hosted dan backend custom belum ada. Kriteria penyatuan ditulis di 14.5.
- **Adapter pattern wajib** (Section 14.1): `TransportAdapter`, `ExecutorAdapter`,
  `ArtifactStorageAdapter`, `AuthAdapter`, `RepoAdapter`. Tidak boleh ada
  pemanggilan Supabase langsung di luar adapter, supaya backend custom bisa masuk
  tanpa membongkar isi runner/mcp.
- Distribusi lewat **npm/npx** sebagai jalur utama (14.3), tarball self-hosted +
  SHA256 untuk instance tertutup, Docker untuk mesin bersama, binary
  tertandatangani ditunda sampai ada permintaan nyata. `curl | bash` tidak dipakai
  selama belum ada penandatanganan rilis.
- **Bootstrap code menggantikan token** pada perintah setup (14.4): sekali pakai,
  umur 10 menit, hanya berwenang menukar diri jadi runner token. Runner token asli
  dibuat di mesin lokal, ditulis dengan permission 0600, tidak pernah tampil di
  layar/clipboard/prompt/riwayat shell.
- Section 12.8 baru: **bootstrap runner lewat agent** — prompt di halaman Connect
  menghasilkan satu perintah `npx @testmanager/runner init --code <CODE>`, dan
  halaman berpindah sendiri ke "Runner terhubung" saat heartbeat pertama masuk.

**Temuan yang dicatat sebagai keputusan teknis (Section 16):**

- Kepercayaan harus di **level repo, bukan level file**: `npx playwright test`
  memuat `playwright.config.ts` (kode Node biasa) sebelum satu test pun berjalan,
  jadi validasi `script_ref` saja tidak pernah cukup. Ini mengoreksi asumsi pada
  task ADM-02 di antrean Codex.
- **Nol runtime dependency runner** dinaikkan statusnya jadi keputusan keamanan,
  bukan kerapian — setiap dependency adalah pintu masuk supply chain ke mesin
  developer pengguna.
- Local runner tetap diperlukan walau nanti ada cloud runner: browser tidak bisa
  dijalankan dari halaman web, jadi pengujian `localhost` selalu menuntut proses
  di mesin pengguna.

**Urutan implementasi diperbarui:** adapter pattern (15) dan bootstrap code (16)
didahulukan sebelum halaman Connect (17) dan Runner UI (18), karena kedua UI itu
menempel pada kontrak koneksi — kalau kontraknya berubah setelah UI jadi, dua-duanya
dibongkar ulang. Penyatuan Local Agent jadi langkah terakhir (24).

Renumber: Urutan implementasi 14→15, Catatan keputusan teknis 15→16.
Belum ada perubahan kode pada sesi ini — dokumentasi/perencanaan saja.


## 2026-08-01 — Backlog: halaman "Connect your agent" + Runner UI/UX

- `FEATURE_BACKLOG.md` Section 12 baru — **Halaman "Connect your agent"**, meniru
  pola modal "Connect to your project" Supabase: panel konfigurasi MCP (client
  selector, read-only toggle, feature groups), langkah bernomor dengan perintah
  siap salin, Agent Skills pack, dan prompt starter. Tahap 1 **hanya Claude Code**;
  client lain disiapkan di struktur data tapi disabled di UI.
- Sub-section: 12.1 kerangka halaman, 12.2 panel MCP, 12.3 langkah + perintah,
  12.4 skills pack (4 skill: workflow, authoring, triage, regression),
  12.5 prompt starter, 12.6 keamanan, 12.7 kualitas UI.
- Keputusan keamanan yang ditulis eksplisit: token **tidak boleh ditanam di string
  perintah** yang ditampilkan/disalin, karena perintah tempel masuk `bash_history`
  dan screenshot halaman ini akan beredar di grup chat. Token project-scoped,
  ada masa berlaku, bisa dicabut dari halaman yang sama.
- Grup tool berat/berisiko (`AUTOMATION`, `REPO`) default off — alasan sama dengan
  Supabase mematikan Storage secara default: menjaga jumlah tool terkelola.
- `FEATURE_BACKLOG.md` Section 13 baru — **Runner UI/UX yang lebih ramah**.
  Baseline sekarang `AutomationPage.tsx` hanya 3 tab tabel mentah (Runner, Mapping
  Script, Job). Ditambahkan: 13.1 wizard onboarding runner, 13.2 status runner
  terbaca, 13.3 papan job, 13.4 mapping script, 13.5 diagnostik, 13.6 responsif.
- Pembagian tanggung jawab dicatat: Section 9 mengurus *kemampuan* runner,
  Section 13 mengurus *pengalaman memakainya*.
- Renumber: Urutan implementasi 12→14, Catatan keputusan teknis 13→15. Daftar
  urutan diperbarui — Connect page (15) setelah MCP tools write, Runner UI/UX (16)
  menyusul, dengan alasan halaman Connect itu generator konfigurasi sehingga tidak
  ada yang bisa digenerate sebelum tool MCP-nya nyata.
- Belum ada perubahan kode pada sesi ini — dokumentasi/perencanaan saja.


## 2026-07-31 — MCP-14 tool konteks repository

- Menambahkan tool read-only MCP `testmanager.repo.list_files`, `repo.read_file`,
  `repo.search`, dan `repo.diff` dengan layering Tool → Service → Repository.
- Menambahkan RPC `mcp_get_repository_configuration` pada
  `schema_057_mcp_repo_tools.sql` untuk membaca repository aktif yang terikat ke
  project sesi; credential private diambil internal dari Vault dan tidak masuk
  output tool maupun log.
- Mendukung checkout `local_path` tanpa mutasi serta clone/update repository
  remote dalam cache yang dapat dikonfigurasi lewat
  `TM_MCP_REPOSITORY_CACHE_DIR`.
- Menambahkan guard path traversal/symlink, validasi revision, batas file 128 KiB,
  batas hasil pencarian/list, dan batas patch 192 KiB.
- Verifikasi: `cd mcp && npm test` lulus (14 test suite, 14 pass) termasuk test
  konfigurasi RPC, scoping subdirectory, traversal rejection, search, read, list,
  dan diff.

## 2026-07-31 — MCP-10 tool workflow Test Run

- Menambahkan tool `testmanager.testrun.create`, `testmanager.testrun.record_result`, dan `testmanager.testrun.complete` melalui alur MCP tool → service → repository → Supabase RPC, termasuk validasi UUID, nama run, status hasil, dan tester terdaftar.
- Menambahkan migration `schema_053_mcp_test_run_workflow.sql`: create selalu meng-insert Test Run baru dan snapshot result/step, record_result hanya mengubah satu Test Result pada run `in_progress`, dan complete hanya mengubah status melalui aksi eksplisit serta menghitung summary on-the-fly.
- Seluruh RPC memvalidasi API token dengan scope `write:test-runs` dan project scope. Migration tidak dijalankan ke Supabase target; tidak ada secret/token, data, commit, atau push yang dilakukan.
- Menambahkan unit test tool registration, validasi service, pemetaan repository/RPC, dan project scoping. Verifikasi lulus: `cd mcp && npm test` (9 suite/subtest entry, seluruhnya lulus).

## 2026-07-31 — REPO-08 traceability repository pada Test Run

- Menambahkan migration baru `schema_045_test_run_repository_traceability.sql` yang secara idempotent memastikan kolom `branch` dan `commit_sha`, menambahkan `repository_id` dengan foreign key `on delete set null` ke `project_repositories`, serta index repository/commit. Migration tidak dijalankan ke Supabase target.
- Memperluas domain dan mapper Test Run dengan `repositoryId`, serta meneruskan metadata repository, branch, dan commit melalui repository dan service. Service memvalidasi repository berasal dari project Test Plan/Test Run sebelum metadata disimpan.
- Memperluas `useTestRunDetail` melalui service untuk memuat traceability dan menampilkan indikator repository, branch, serta commit SHA ringkas (dengan SHA penuh pada tooltip) di halaman detail Test Run.
- Tidak menambahkan secret/token, menghapus data, menjalankan migration target, commit, push, atau refactor di luar scope REPO-08.
- Verifikasi lulus: `cd frontend && npm run build` (669 modul; warning ukuran chunk existing) dan `git diff --check`.
- Knowledge graph disinkronkan dengan `graphify update .` menjadi 1.910 node dan 3.839 edge; Graphify memberi warning existing bahwa 7 file konfigurasi/non-source menghasilkan zero node.

## 2026-07-31 — REPO-07 mode `local_path` pada runner

- Menambahkan inspeksi repository lokal pada runner dengan validasi fail-fast: `TM_PROJECT_DIR` wajib absolut, path harus ada, berupa direktori yang terbaca, memiliki `.git`, dan dikenali Git sebagai root repository.
- Runner membaca metadata Git lokal melalui argumen `git -C` tanpa shell: branch aktif (nullable saat detached HEAD), commit SHA, serta status dirty/clean. Inspeksi dijalankan saat startup dan kembali sebelum laporan job agar metadata sesuai commit yang benar-benar diuji.
- Payload laporan ke server pusat hanya menambahkan object `repository` berisi `path`, `branch`, `commitSha`, dan boolean `dirty`; tidak ada pembacaan atau pengiriman isi file source.
- Memperketat konfigurasi/contoh environment dan mendokumentasikan kontrak path absolut serta batas privasi source code.
- Menambahkan pengujian Node bawaan untuk bentuk metadata, perintah Git yang dibatasi, pencegahan field isi file, serta penolakan path relatif/hilang/non-git. Tidak ada migration yang dijalankan, secret dicatat, data dihapus, commit, atau push.
- Verifikasi lulus: `cd runner && npm test`, `npm run typecheck`, dan build TypeScript runner (dijalankan oleh script test).

## 2026-07-31 — REPO-04 tab Repository di Project Settings

- Menambahkan tab Repository pada `ProjectSettingsPage` dengan daftar repository, dialog tambah/edit, konfirmasi hapus, status aktif, dan aksi Test Connection berupa stub notifikasi.
- Seluruh lifecycle dan mutasi memakai `useProjectRepositories` → `projectRepositoryLinkService` → `projectRepositoryLinkRepository` → Supabase; halaman tidak mengakses repository atau Supabase langsung.
- Kredensial hanya ditampilkan sebagai mask tanpa nilai token penuh. UI menampilkan waktu referensi kredensial dibuat dari timestamp repository dan tanggal kedaluwarsa sebagai `-` karena metadata expiry belum tersedia pada model REPO-01; form tidak menerima atau membaca ulang secret dari browser.
- Menambahkan peringatan scope minimum untuk repository private/generic Git dan menegaskan bahwa kredensial dikelola oleh layanan server/Vault.
- Tidak menjalankan migration ke Supabase target, tidak menambah secret/token, serta tidak melakukan commit atau push.
- Verifikasi lulus: `npm run build` (667 modul; warning ukuran chunk existing) dan `git diff --check`. `graphify update .` sudah dijalankan, tetapi rebuild watch melaporkan `Operation not permitted`; artefak graph yang sebelumnya sudah dirty tidak dihapus atau dipulihkan.

## 2026-07-31 — REPO-02 domain, mapper, dan CRUD project repository links

- Menambahkan domain `ProjectRepository` beserta union `ProjectRepositorySourceType` sesuai Section 10.1 `FEATURE_BACKLOG.md`.
- Menambahkan `mapProjectRepositoryRow()` sebagai pusat konversi row `project_repositories` dari snake_case ke domain camelCase.
- Menambahkan `projectRepositoryLinkRepository` dengan operasi create, read, update, dan delete murni melalui Supabase tanpa validasi atau business rule.
- Tidak menjalankan migration ke Supabase target, tidak menambah secret/token, dan tidak melakukan commit atau push.
- Verifikasi lulus: `npm run build` (664 modul; warning ukuran chunk existing) dan `git diff --check`. Knowledge graph diperbarui lewat `graphify update .` menjadi 1.842 node/3.713 edge dengan warning 7 file konfigurasi/non-source menghasilkan zero node.

## 2026-07-31 — REPO-01 project repositories migration

- Menambahkan `supabase/schema_029_project_repositories.sql` untuk tabel tautan repository per project, termasuk tipe sumber, metadata branch/subdirectory, status aktif, dan timestamps.
- Kredensial tidak disimpan di tabel; `credential_id` hanya mereferensikan UUID secret di Supabase Vault dengan perilaku `on delete set null`.
- Mengaktifkan RLS project-scoped: anggota yang memiliki akses project dapat membaca, sedangkan insert/update/delete hanya diizinkan melalui `is_project_manager(project_id)` (owner/manager project atau global admin).
- Migration hanya dibuat dan diverifikasi secara lokal; tidak dijalankan ke Supabase target.

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

### 2026-07-31 — REPO-03 service dan hook project repository

- Menjalankan `graphify query` sebelum menelusuri implementasi, lalu mengikuti keputusan Section 10.1–10.4 `FEATURE_BACKLOG.md` dan policy `is_project_manager` pada schema.
- Menambahkan `projectRepositoryLinkService.ts` untuk validasi nama dan lokasi per `sourceType`: `local_path` wajib path absolut, sedangkan `github_public`/`github_private` wajib URL HTTP(S) valid.
- Service menolak field payload browser yang mengandung token/secret/password/nilai kredensial; frontend hanya dapat meneruskan referensi `credentialId`, bukan nilai rahasia.
- Mutasi create, update, dan delete kini memverifikasi actor sebagai global admin atau member project ber-role `manager`, selaras dengan RLS `is_project_manager`; RLS tetap menjadi batas keamanan utama.
- Menambahkan `useProjectRepositories.ts` untuk lifecycle list/reload serta aksi create/update/remove melalui service dengan context auth aktif.
- Tidak menjalankan migration, mengubah database target, menambahkan dependency, commit, push, atau refactor di luar scope.
- Verifikasi frontend lulus: `npm run build` (664 modul; warning ukuran chunk existing), `npm run lint` (7 warning existing di luar scope), dan `git diff --check`.

### 2026-07-31 — REPO-05 Edge Function kredensial repository

- Menjalankan `graphify query` sebelum menelusuri implementasi dan mengikuti keputusan penyimpanan kredensial pada Section 10.4 `FEATURE_BACKLOG.md`.
- Menambahkan migration `schema_043_repository_credentials_vault.sql` tanpa menjalankannya ke target. RPC service-role-only menyimpan, merotasi, dan mencabut secret Supabase Vault secara atomik; hanya admin global, owner project, atau manager project aktif yang diizinkan.
- Menambahkan metadata aman `credential_mask`, waktu dibuat, dan waktu kedaluwarsa pada `project_repositories`; nilai credential tetap hanya berada di Vault, sedangkan tabel hanya menyimpan UUID referensi dan metadata non-rahasia.
- Menambahkan Edge Function `repo-credentials` dengan autentikasi bearer user, validasi payload ketat, respons allow-list yang hanya berisi `credential_id` dan mask, error generik, dan tanpa logging payload maupun error upstream.
- Menambahkan contract test untuk mask, larangan token pada revoke, proyeksi respons yang membuang field rahasia tak terduga, dan redaksi implisit error upstream.
- Audit event store/rotate/revoke dicatat tanpa nilai credential. Tidak ada migration target, dependency, commit, push, atau perubahan frontend.
- Verifikasi lulus: `node --experimental-strip-types --test supabase/functions/repo-credentials/contract.test.ts`, `npm run build` (667 modul; warning ukuran chunk existing), dan `git diff --check`.
- `graphify update .` pertama berhasil menyinkronkan graph menjadi 1.881 node dan 3.790 edge. Pemanggilan ulang setelah penyempitan tipe respons mendeteksi tidak ada AST yang perlu diperbarui, lalu watcher melaporkan `Operation not permitted`; graph hasil pembaruan pertama tetap tersedia dan perubahan terakhir hanya menghapus field respons dari interface/fixture.
## 2026-07-31 — REPO-06 Test Connection GitHub

- Menambahkan aksi `test` pada Edge Function `repo-credentials` untuk menguji repository `github_public` tanpa token dan `github_private` memakai token yang hanya dibaca di service context.
- Menambahkan pemanggilan GitHub Repository API yang mengembalikan nama repo, default branch, permission terdeteksi, serta warning eksplisit ketika scope/capability yang terdeteksi lebih luas dari `contents: read`; respons dan error tidak mengekspos token.
- Menambahkan `schema_044_repository_connection_test.sql` berupa RPC service-role-only yang memverifikasi actor admin/owner/manager sebelum membaca credential dari Vault. Migration tidak dijalankan ke target Supabase.
- Menyambungkan tombol Test di Project Settings melalui alur `Page → Hook → Service → Repository → Supabase Edge Function`, termasuk loading per-row, hasil metadata, warning scope, error, dan pembatasan UI untuk GitHub public/private.
- Menambahkan tes kontrak Edge Function untuk GitHub private (warning scope berlebih dan token tidak bocor) serta GitHub public (tanpa Authorization).
- Verifikasi: `node --experimental-strip-types --test supabase/functions/repo-credentials/contract.test.ts` lulus; `cd frontend && npm run build` lulus; `cd frontend && npm run lint` lulus dengan 7 warning lama yang tidak terkait; `git diff --check` lulus.
## 2026-07-31 — REPO-09 dukungan `git_url` generik

- Menambahkan validasi URL HTTP(S), penyimpanan/rotasi token generik melalui alur UI → hook → service → repository → Edge Function, serta metadata mask/waktu credential pada domain dan mapper repository.
- Edge Function `repo-credentials` kini menguji GitHub Enterprise melalui API `/api/v3` dan fallback GitLab self-hosted melalui API `/api/v4`, selalu memakai bearer token pada host repository dan tidak mengembalikan nilai token.
- UI Project Settings menerima token generik opsional untuk `git_url`, mempertahankan token lama saat edit dikosongkan, menampilkan mask credential aktual, dan mengaktifkan Test connection untuk `git_url`.
- Contract test ditambah untuk GitHub Enterprise dan GitLab self-hosted. Verifikasi lulus: contract test Edge Function, `npm run build`, `npm run lint` (hanya warning lama di file di luar scope), dan `git diff --check`.
- Tidak menjalankan migration ke target Supabase, tidak menghapus data, tidak commit, dan tidak push.

## 2026-07-31 — REPO-10 automation script dari repository

- Menjalankan `graphify query` sebelum menelusuri alur automation runner dan mengikuti keputusan Section 10.5 `FEATURE_BACKLOG.md`.
- Menambahkan migration `schema_046_runner_repository_scripts.sql` tanpa menjalankannya ke target. `poll_automation_job` kini menyertakan repository aktif yang ditautkan pada Test Run dan membaca credential Vault hanya ketika membentuk respons job untuk runner terautentikasi; credential kedaluwarsa tidak diteruskan.
- Runner kini mendukung `local_path` serta clone/pull repository HTTP(S) remote ke cache per repository sebelum Playwright berjalan. `script_ref` di-resolve dari root/subdirectory repo, sedangkan Test Run tanpa repository tetap memakai `TM_PROJECT_DIR` sebagai fallback.
- Token private/generic repository hanya dipasang pada environment proses Git melalui `http.extraHeader`; token tidak dimasukkan ke URL, argumen command, konfigurasi/file cache, artifact, source, dokumentasi, atau log. URL berkredensial, path absolut/traversal pada `script_ref`, dan subdirectory di luar root ditolak.
- Kegagalan menyiapkan repository dilaporkan sebagai hasil `blocked` agar job tidak tertinggal berstatus running dan tetap mengikuti mekanisme retry yang ada.
- Menambahkan contract/unit test clone private, pull cache, isolasi token dari argumen, validasi URL, dan proteksi traversal. Verifikasi lulus: `cd runner && npm test`, `cd frontend && npm run build` (warning ukuran chunk existing), pencarian pola secret, dan `git diff --check`.
- Tidak menjalankan migration ke Supabase target, tidak menghapus data, tidak menambah dependency, tidak commit, dan tidak push.

## 2026-07-31 — MCP-01 fondasi MCP server stdio

- Menjalankan `graphify query` sebelum menelusuri Section 8.1 `FEATURE_BACKLOG.md` dan membatasi scope pada scaffold serta transport stdio tanpa tool.
- Menambahkan workspace mandiri `mcp/` berbasis Node.js 20+, TypeScript strict, dan `@modelcontextprotocol/sdk`, lengkap dengan lockfile npm.
- Menambahkan server MCP stdio yang dapat melakukan handshake, belum mendaftarkan tool, dan memuat konfigurasi project-scoped dari `TM_SUPABASE_URL`, `TM_SUPABASE_ANON_KEY`, `TM_API_TOKEN`, `TM_PROJECT_ID`, serta flag `TM_MCP_READONLY` (`0`/`1`).
- Menambahkan `.env.example`, proteksi ignore untuk file env/build/dependency, dan README setup/operasional tanpa menyimpan secret nyata.
- Verifikasi lulus: `cd mcp && npm run build`, smoke test handshake JSON-RPC melalui stdio, audit otomatis saat `npm install` (0 vulnerability), dan `git diff --check`. Percobaan ulang `npm audit` setelahnya tidak mendapat respons registry karena DNS sementara (`EAI_AGAIN`); tidak memengaruhi hasil audit instalasi awal.
- Tidak menjalankan migration atau mengakses Supabase target, tidak menambah tool MCP, tidak commit, dan tidak push.

## 2026-07-31 — MCP-02 autentikasi dan project scoping MCP

- Menjalankan `graphify query` sebelum menelusuri Section 8.1, scaffold MCP, dan skema API token P2.
- Menambahkan RPC `authenticate_mcp_api_token` pada migration baru `schema_047_mcp_auth.sql`; RPC security-definer mencocokkan SHA-256 token aktif dan hanya mengembalikan ID token, `project_id`, serta scopes. Migration tidak dijalankan ke target Supabase.
- Menambahkan lapisan MCP `AuthRepository → AuthService → ProjectSession`: token hanya dibaca dari `TM_API_TOKEN`, dikirim di body autentikasi internal, tidak menjadi argumen tool/URL/log, dan error upstream tidak diteruskan.
- Startup server sekarang wajib mengautentikasi token dan menolak sesi jika project token berbeda dari `TM_PROJECT_ID`. Guard project juga menolak referensi `project_id`/`projectId` lintas project termasuk yang bersarang sebelum handler tool meneruskan operasi ke service/repository.
- Menambahkan contract test untuk sesi valid, penolakan token lintas project, penolakan argumen tool lintas project, dan redaksi kegagalan autentikasi.
- Verifikasi lulus: `cd mcp && npm test` (build TypeScript + test), `git diff --check`, dan pemeriksaan source untuk memastikan credential tidak masuk URL/error. Tidak mengakses Supabase target, tidak commit, dan tidak push.

## 2026-07-31 — MCP-03 helper response bersama

- Menjalankan `graphify query` sebelum menelusuri scaffold MCP dan mengikuti keputusan Section 8.1 serta guardrail Section 8.3 `FEATURE_BACKLOG.md`.
- Menambahkan helper response bersama untuk seluruh tool MCP berikutnya: default pagination 50 item, maksimum 100 item, cursor halaman berikutnya, dan batas response JSON UTF-8 sebesar 256 KiB.
- Response pagination menerima maksimal `limit + 1` row dari repository, tidak mengirim row pendeteksi tambahan, dan memperpendek halaman secara aman bila batas byte tercapai. Satu item yang sendiri melampaui batas menghasilkan error recoverable.
- Menambahkan envelope error konsisten berisi `code`, `message`, dan `hint`, wrapper handler async, serta redaksi detail error tidak dikenal menjadi `INTERNAL_ERROR` agar respons tidak membocorkan error upstream.
- Menambahkan contract test untuk validasi limit, cursor/metadata pagination, pembatasan byte tanpa JSON rusak, oversized item, error terstruktur, redaksi error internal, dan response non-pagination.
- Verifikasi lulus: `cd mcp && npm test` (build TypeScript + seluruh test) dan `git diff --check`. Tidak menjalankan migration atau mengakses Supabase target, tidak mengubah dependency, tidak commit, dan tidak push.

## 2026-07-31 — MCP-04 mode read-only pada registrasi tool

- Menjalankan `graphify query` sebelum menelusuri fondasi MCP dan mengikuti keputusan mode read-only pada Section 8.1 `FEATURE_BACKLOG.md`.
- Menambahkan registry tool terpusat yang memisahkan registrar `read` dan `write`; startup server meneruskan `config.readonly` ke registry.
- Saat `TM_MCP_READONLY=1`, registry berhenti setelah mendaftarkan grup baca sehingga registrar tool tulis sama sekali tidak dijalankan dan tool tulis tidak muncul pada discovery MCP. Mode normal tetap mendaftarkan kedua grup.
- Menambahkan contract test untuk kedua mode dan memperjelas perilaku registrasi pada dokumentasi MCP.
- Verifikasi lulus: `cd mcp && npm test`, `cd mcp && npm run build`, dan `git diff --check`. Tidak mengakses Supabase target, tidak mengubah dependency, tidak commit, dan tidak push.

## 2026-07-31 — MCP-05 tool read batch 1

- Menjalankan `graphify query` sebelum menelusuri fondasi MCP dan mengikuti katalog Discovery/read Section 8.2 `FEATURE_BACKLOG.md`.
- Menambahkan tool read-only `testmanager.project.list`, `testmanager.project.get`, `testmanager.testcase.search`, dan `testmanager.testcase.get` melalui layering `Tool → ReadService → ReadRepository → Supabase RPC`.
- `testcase.search` mendukung filter module UUID/nama/kode, tag, priority, status, free-text, pagination cursor stabil, batas 100 item, dan envelope respons bersama. `testcase.get` mengembalikan metadata lengkap, simple steps, structured steps, expected result, serta riwayat versi terurut terbaru.
- Menambahkan migration `schema_048_mcp_read_batch_1.sql` tanpa menjalankannya ke target. RPC security-definer read-only memvalidasi ulang hash token aktif dan project scope pada setiap panggilan agar API token tidak melewati batas project meskipun query berjalan di luar sesi JWT user.
- Menambahkan mapper snake_case ke camelCase, tipe domain MCP, dependency langsung `zod`, dokumentasi tool, serta contract/unit test untuk payload RPC, mapping, redaksi error upstream, cursor, validasi UUID, dan penolakan lintas project.
- Verifikasi lulus: `cd mcp && npm test` (5 suite), `cd mcp && npm run build`, dan `git diff --check`. Tidak mengakses atau menjalankan migration ke Supabase target, tidak menghapus data, tidak commit, dan tidak push.

## 2026-07-31 — MCP-06 tool read batch 2

- Menjalankan `graphify query` sebelum menelusuri implementasi MCP dan mengikuti katalog Discovery/read Section 8.2 `FEATURE_BACKLOG.md`.
- Menambahkan tool read-only `testmanager.testplan.list/get`, `testmanager.testrun.list/get`, dan `testmanager.testresult.list` melalui layering `Tool → ReadService → ReadRepository → Supabase RPC`.
- Detail Test Plan menyertakan test case terurut beserta module, tag, isi, structured steps, dan versions. Daftar Test Result mendukung filter status, tester, serta run; seluruh daftar memakai cursor stabil, batas halaman bersama, dan project scope sesi.
- Menambahkan migration `schema_049_mcp_read_batch_2.sql` tanpa menjalankannya ke target. Setiap RPC memvalidasi ulang token/project, mendukung standard maupun custom run, dan menghitung summary Test Run on-the-fly dari `test_results` tanpa kolom hasil atau cache summary.
- Menambahkan tipe domain, mapper snake_case ke camelCase, validasi UUID/cursor, dokumentasi setup/tool batch 2, serta test untuk registrasi kelima tool, payload/filter repository, nested mapping, cursor result, dan summary hasil per status.
- Verifikasi lulus: `cd mcp && npm test` (6 suite), `git diff --check`, dan `graphify update .` (2.130 node/4.280 edge). Tidak mengakses atau menjalankan migration ke Supabase target, tidak menghapus data, tidak mengubah dependency, tidak commit, dan tidak push.

## 2026-07-31 — MCP-07 tool read batch 3

- Menjalankan `graphify query` sebelum menelusuri implementasi MCP, skema Requirement/Issue/Artifact, dan keputusan katalog Discovery/read Section 8.2 `FEATURE_BACKLOG.md`.
- Menambahkan tool read-only `testmanager.issue.search/get`, `testmanager.requirement.list/get/coverage`, dan `testmanager.artifact.get_url` melalui layering `Tool → ReadService → ReadRepository → Supabase RPC/Edge Function`.
- Menambahkan migration `schema_050_mcp_read_batch_3.sql` tanpa menjalankannya ke target. RPC memvalidasi ulang token/project; pencarian issue mendukung status, priority, assignee, run, case, dan free-text; query requirement dimulai dari tabel `requirements` dengan left join sehingga requirement tanpa test tetap muncul dan terhitung uncovered.
- Memperluas Edge Function `automation-artifacts` dengan aksi signed download yang memvalidasi hash API token aktif, prefix project pada object path, bucket private yang diizinkan, serta TTL 30–3.600 detik; service role tetap hanya berada di environment Edge Function.
- Menambahkan tipe domain, mapper snake_case ke camelCase, validasi UUID/path/cursor, dokumentasi operasional, status backlog, serta test untuk registrasi tool, mapping uncovered requirement, pagination requirement, project-scoped artifact, dan kontrak signer.
- Verifikasi lulus: `cd mcp && npm test` (6 suite) dan `git diff --check`. Migration dan Edge Function tidak dijalankan/deploy ke Supabase target; tidak menghapus data, tidak menambah dependency, tidak commit, dan tidak push.
# 2026-07-31 — MCP-08 write test case/test plan tools

- Menambahkan tujuh tool MCP write: `testcase.create_bulk`, `testcase.update`, `testcase.duplicate`, `testcase.archive`, `testplan.create`, `testplan.add_cases`, dan `testplan.remove_cases`.
- Implementasi mengikuti layering MCP `Tool → Service → Repository → Supabase RPC`, validasi UUID/input/batas bulk 100 item, project scoping, serta registrasi yang otomatis dinonaktifkan oleh `TM_MCP_READONLY=1`.
- Semua respons mutation ditandai `status: draft` dan `mode: review_only`; test plan disimpan sebagai `draft`, perubahan scope hanya diizinkan pada plan draft, dan archive tidak menghapus test case.
- Menambahkan `supabase/schema_051_mcp_write_test_cases_plans.sql` (belum dijalankan ke target) dengan RPC security-definer, validasi token/project/scope `write:test-cases` atau `write:test-plans`, serta validasi relasi lintas project.
- Menambahkan unit test registrar, service marker/validasi, dan repository RPC/credential-safe error.
- Verifikasi: `cd mcp && npm test` lulus (9 test files), `cd mcp && npm run build` lulus, dan `git diff --check` lulus.

## 2026-07-31 — MCP-09 gate manusia approval Test Plan

- Menjalankan `graphify query` sebelum menelusuri implementasi MCP serta mengikuti keputusan Section 8.2 dan 11.2 `FEATURE_BACKLOG.md`.
- Menambahkan tool `testmanager.testplan.approve` melalui layering `Tool → WriteService → WriteRepository → Supabase RPC`; tool hanya menerima `approver_id` valid dan konfirmasi literal `explicit_approval: true` untuk sesi API-token.
- Menambahkan migration `schema_052_mcp_testplan_approval.sql` tanpa menjalankannya ke target. RPC memvalidasi ulang scope token `write:test-plans`, profile approver aktif (`user`/`admin`), dan akses approver ke project sebelum mengubah Test Plan `draft` menjadi `active`.
- Approval dicatat atomik di `audit_logs` dengan `changed_by` sebagai approver manusia, tipe approval eksplisit, dan ID token non-rahasia; token mentah/hash tidak dicatat.
- Menambahkan unit/contract test untuk penolakan flag non-eksplisit, penerusan approver ke RPC, isolasi token dari URL, hasil approval, dan registrasi tool; dokumentasi MCP serta status backlog diperbarui.
- Verifikasi lulus: `cd mcp && npm test` (9/9 test file), pemeriksaan pola secret, dan `git diff --check`. Tidak menjalankan migration ke Supabase target, tidak menghapus data, tidak menambah dependency, tidak commit, dan tidak push.

## 2026-07-31 — MCP-11 workflow Issue

- Menjalankan `graphify query` sebelum menelusuri MCP, domain Issue, comments, dan action AI sesuai Section 8.2 serta Section 4 `FEATURE_BACKLOG.md`.
- Menambahkan tool `testmanager.issue.create`, `issue.comment`, `issue.update_status`, dan `issue.detect_duplicate` melalui layering `Tool → WriteService → WriteRepository → Supabase RPC/Edge Function` serta registrasi write yang otomatis hilang dalam mode read-only.
- `issue.create` mewajibkan `test_result_id`, memvalidasi relasi project di RPC, dan membuat Issue berstatus awal `backlog`/review-only. Comment memakai profile pemilik API token sebagai author; perubahan status dibatasi ke workflow status Issue yang sah.
- `issue.detect_duplicate` mengambil maksimal 300 kandidat project-scoped dari RPC lalu membungkus action `duplicate_issue_detection` pada Edge Function `ai-gateway`. JWT user approved dibaca hanya dari environment `TM_SUPABASE_ACCESS_TOKEN`, tidak dari argumen tool atau source code; respons AI ditandai `draft` dan `review_only`.
- Menambahkan migration `schema_054_mcp_issue_workflow.sql` tanpa menjalankannya ke target, scope token `write:issues`, dokumentasi konfigurasi/migration, serta test registrasi, validasi relasi wajib, marker review AI, payload RPC, project scope, dan adapter gateway.
- Verifikasi lulus: `cd mcp && npm test`, `cd mcp && npm run build`, `git diff --check`, dan pemeriksaan pola secret. Tidak menjalankan migration/deploy ke Supabase target, tidak menghapus data, tidak menambah dependency, tidak commit, dan tidak push.

## 2026-07-31 — MCP-12 tool Automation

- Menjalankan `graphify query` sebelum menelusuri MCP dan mengikuti katalog Automation Section 8.2 `FEATURE_BACKLOG.md`.
- Menambahkan `testmanager.automation.map_script`, `automation.enqueue`, `automation.job_status`, dan `automation.runner_list` melalui layering `Tool → AutomationService → AutomationRepository → Supabase RPC`.
- `map_script` melakukan upsert mapping Test Case ke `script_ref`; `enqueue` menerima tepat satu Test Case atau Test Plan, selalu membuat Test Run baru, dan menggabungkan label mapping dengan label runner eksplisit. Status job dan daftar runner bersifat read-only; online dihitung dari heartbeat 90 detik dan token hash tidak pernah dikembalikan.
- Menambahkan migration `schema_055_mcp_automation.sql` tanpa menjalankannya ke target, validasi ulang token/project pada setiap RPC, dan scope `write:automation` untuk mutation.
- Menambahkan unit/contract test untuk registrasi read/write, validasi target enqueue, normalisasi label, payload RPC project-scoped, dan redaksi error upstream; dokumentasi MCP serta checklist backlog diperbarui.
- Verifikasi lulus: `cd mcp && npm test` (12/12 test file) dan `cd mcp && npm run build`. Tidak menjalankan migration ke Supabase target, tidak menghapus data, tidak menambah dependency, tidak commit, dan tidak push.

## 2026-07-31 — MCP-13 selective rerun failed

- Menjalankan `graphify query` sebelum menelusuri implementasi Automation MCP dan mengikuti keputusan Section 8.2 serta 11.7 `FEATURE_BACKLOG.md`.
- Menambahkan tool `testmanager.automation.rerun_failed` melalui layering `Tool → AutomationService → AutomationRepository → Supabase RPC` untuk Issue `resolved` yang berasal dari Test Result `fail`.
- Regression memilih hanya Test Case aktif dan terotomasi yang tertaut langsung ke Issue atau berbagi module, tag, maupun requirement dengan Test Case gagal. Eksekusi selalu membuat Test Run baru dan tidak mengubah run lama.
- Menambahkan ambang konfigurasi `TM_MCP_RERUN_FAILED_MAX_TESTS` (default 25, rentang 1–500). Jika jumlah terpilih melewati ambang, RPC tidak membuat run/job dan service mengembalikan `HUMAN_CONFIRMATION_REQUIRED`; retry membutuhkan profile anggota project pada `confirmed_by` serta `explicit_confirmation: true`.
- Menambahkan migration `schema_056_mcp_rerun_failed.sql` tanpa menjalankannya ke target, audit aksi/konfirmasi tanpa payload rahasia, dokumentasi konfigurasi, serta test service/repository/registrar.
- Verifikasi lulus: `cd mcp && npm test` (12/12 test file; mencakup build TypeScript) dan `git diff --check`. Tidak menjalankan migration ke Supabase target, tidak menghapus data, tidak menambah dependency, tidak commit, dan tidak push.
## 2026-07-31 — MCP-15 tool analisis

- Menjalankan `graphify query` sebelum menelusuri implementasi MCP dan mengikuti katalog Analisis Section 8.2 `FEATURE_BACKLOG.md`.
- Menambahkan tool read-only `testmanager.analysis.run_summary`, `analysis.flaky_candidates`, dan `analysis.suggest_retest` melalui layering `Tool → AnalysisService → AnalysisRepository → Supabase RPC`.
- Menambahkan migration `schema_058_mcp_analysis.sql` tanpa menjalankannya ke target. Seluruh metrik dihitung on-the-fly; flaky ditentukan dari transisi pass/fail pada jendela run, sedangkan rekomendasi retest diranking dari status, priority, issue aktif, dan instabilitas historis.
- Menambahkan batas jendela 2–50 run, batas respons 1–100 kandidat, validasi UUID/project scope, mapper snake_case ke camelCase, dokumentasi, dan unit/contract test.
- Verifikasi lulus: `cd mcp && npm test` (17/17), `cd mcp && npm run build`, `git diff --check`, dan `graphify update .` (2.373 node/4.913 edge). Tidak menjalankan migration ke Supabase target, tidak menghapus data, tidak mengubah dependency, tidak commit, dan tidak push.

## 2026-07-31 — MCP-16 rate limit dan audit tool MCP

- Menjalankan `graphify query` sebelum menelusuri fondasi MCP dan mengikuti keputusan Section 8.1 `FEATURE_BACKLOG.md`.
- Menambahkan governance global pada registrasi tool sehingga seluruh tool MCP melewati layering `Tool → GovernanceService → GovernanceRepository → Supabase RPC` tanpa perubahan handler satu per satu.
- Menambahkan rate limit atomik yang dapat dikonfigurasi per API token dan nama tool (`TM_MCP_RATE_LIMIT`, `TM_MCP_RATE_LIMIT_WINDOW_SECONDS`), dengan penolakan sebelum business operation dijalankan.
- Menambahkan migration `schema_059_mcp_rate_limit_audit.sql` tanpa menjalankannya ke target. Setiap panggilan membuat `ai_audit_events` berisi nama tool, status, dan latency; argumen, hasil, payload mentah, serta token tidak disimpan di audit.
- Menambahkan test repository/service/wrapper untuk metadata minimal, status sukses/gagal/rate-limited, latency, dan redaksi kegagalan upstream; fixture konfigurasi existing disesuaikan untuk opsi baru.
- Verifikasi lulus: `cd mcp && npm test` (19/19 test file, termasuk build TypeScript) dan `git diff --check`. Tidak menjalankan migration ke Supabase target, tidak menghapus data, tidak menambah dependency, tidak commit, dan tidak push.

## 2026-08-01 — Eksekusi seluruh migration melalui MCP Supabase

- Mengautentikasi MCP Supabase untuk project `fohuxwzczepdqyrfkovc`, membandingkan 61 file migration lokal (tanpa `seed.sql`) dengan migration history remote, dan menemukan 29 file sudah terwakili.
- Berhasil menerapkan 18 migration berurutan dari `schema_029_project_ownership_visibility.sql` sampai `schema_045_test_run_repository_traceability.sql`.
- Eksekusi awal `schema_046_runner_repository_scripts.sql` gagal dengan PostgreSQL `42601` karena variabel `%ROWTYPE` dan scalar dipakai bersama dalam satu daftar `SELECT INTO`.
- Memperbaiki migration `schema_046_runner_repository_scripts.sql` dengan mengambil row repository dan secret Vault melalui dua query terpisah; perilaku expiry credential dan payload runner tetap dipertahankan.
- Setelah perbaikan, berhasil menerapkan `schema_046_runner_repository_scripts.sql` hingga `schema_059_mcp_rate_limit_audit.sql` melalui MCP Supabase. Error transport HTTP 502 pada percobaan awal `schema_056` direkonsiliasi dengan `list_migrations`, lalu migration diterapkan ulang karena belum tercatat.
- Verifikasi akhir lewat MCP `list_migrations`: seluruh 61 file migration lokal selain `seed.sql` sudah terwakili. Remote memiliki 62 entri karena migration 028 tercatat sebagai dua bagian (`028a` dan `028b`).
- Menjalankan `graphify update .` setelah perbaikan migration; graph diperbarui menjadi 2.399 node dan 4.965 edge. Tidak menjalankan seed, tidak menghapus data, tidak commit, dan tidak push.

## 2026-08-01 — Sinkronisasi output Graphify ke GitHub

- Menjalankan `graphify query` sebelum meninjau perubahan repository.
- Memastikan tidak ada perubahan pada `frontend/`; commit dibatasi pada perubahan `graphify-out/` dan catatan wajib `WORKLOG.md`.
- Mengecualikan `graphify-out/.rebuild.lock` karena merupakan file lock sementara, serta mempertahankan perubahan `mcp/` dan `FEATURE_BACKLOG.md` di working tree karena berada di luar cakupan permintaan.
- Verifikasi sebelum commit: `git diff --check` untuk cakupan commit.

## 2026-08-01 — Posisi loading Home dan eksekusi seed

- Menjalankan `graphify query` untuk menelusuri `HomePage`, state loading dashboard, dan layout terkait.
- Memusatkan `ProgressSpinner` loading awal Home secara horizontal dan vertikal di area konten dengan PrimeFlex, serta menambahkan label aksesibilitas `Memuat dashboard`.
- `npm run build` frontend lulus dan `graphify update .` dijalankan setelah perubahan UI.
- MCP `list_migrations` memastikan seluruh 61 migration lokal non-seed sudah terwakili dan tidak ada migration yang dijalankan ulang.
- Eksekusi seed awal gagal tanpa data parsial karena trigger `handle_new_project()` membutuhkan `auth.uid()`, sementara MCP berjalan tanpa user session.
- Memperbaiki `supabase/seed.sql` agar idempotent dan dapat dijalankan dari SQL Editor/CLI/MCP: memilih profile approved aktif, memasang claim user hanya untuk transaksi seed, lalu membuat Sample Project beserta membership melalui trigger normal.
- Seeder yang diperbaiki berhasil dijalankan melalui MCP `execute_sql`. Verifikasi remote menemukan tepat 1 Sample Project, 1 project dengan `owner_id` terisi, dan 1 membership owner berstatus `accepted` dengan role `manager`.

## 2026-08-01 — Perbaikan gagal memuat dashboard

- Menjalankan `graphify query` untuk menelusuri alur `HomePage → useDashboard → dashboardService → dashboardRepository → Supabase`.
- Log API/PostgreSQL Supabase menunjukkan count `test_runs`, `test_results`, dan `issues` gagal HTTP 500 dengan PostgreSQL `42P17: infinite recursion detected in policy for relation test_runs`; count `projects`, `test_cases`, dan `test_plans` tetap HTTP 200.
- Akar masalah adalah policy `project access - test_runs select` dari migration structured custom runs yang melakukan subquery kembali ke tabel `test_runs` yang sedang dilindungi.
- Menambahkan migration `schema_060_fix_test_runs_rls_recursion.sql` untuk mengganti policy select/update/delete `test_runs` agar memakai `custom_project_id` atau project dari `test_plan_id` pada row saat ini tanpa self-query.
- Migration `schema_060_fix_test_runs_rls_recursion` berhasil diterapkan melalui MCP Supabase dan tercatat sebagai version `20260801004504`.
- Verifikasi RLS dijalankan dalam transaksi read-only sebagai role efektif `authenticated` dengan `auth.uid()` owner Sample Project, lalu di-rollback. Count berhasil untuk projects (3), test_cases (2), test_plans (2), test_runs (4), test_results (8), dan issues (1), termasuk seluruh filter status dashboard; tidak ada lagi `42P17` atau HTTP 500.

## 2026-08-01 — MCP-17 audit tool destruktif

- Menjalankan `graphify query` sebelum menelusuri registrasi tool MCP dan mengaudit katalog terhadap guardrail Section 8.3 `FEATURE_BACKLOG.md`.
- Hasil audit: tidak ada tool hapus project, hapus Test Case, atau hapus Test Run yang teregistrasi. Katalog hanya menyediakan baca project/Test Case/Test Run, mutation non-destruktif, `testcase.archive` (soft archive), dan `testplan.remove_cases` yang hanya melepas relasi scope plan tanpa menghapus Test Case.
- Registrasi aktual ditelusuri dari `mcp/src/index.ts` melalui seluruh registrar di `mcp/src/tools/`; `toolRegistry` bawaan kosong dan mode read-only tetap mengecualikan seluruh registrar write.
- Verifikasi lulus: pencarian statis seluruh pemanggilan `registerTool` dan pola delete/remove/destroy pada `mcp/`, serta `cd mcp && npm test` (19/19 test file, termasuk build TypeScript). Tidak mengubah kode, tidak menjalankan migration, tidak menghapus data, tidak commit, dan tidak push.

## 2026-08-01 — MCP-18 transport HTTP/SSE

- Menjalankan `graphify query` sebelum menelusuri fondasi MCP dan mengikuti keputusan transport serta autentikasi Section 8.1 `FEATURE_BACKLOG.md`.
- Menambahkan mode `TM_MCP_TRANSPORT=http` dengan Streamable HTTP modern pada `/mcp`, kompatibilitas HTTP/SSE pada `/sse` + `/messages`, dan health check minimal pada `/health`; stdio tetap menjadi default.
- Mengekstrak factory MCP server agar setiap koneksi remote memperoleh instance server dan transport sendiri, tetapi seluruh mode tetap memakai `AuthService` yang sama sebelum listener dibuka, API token/JWT dari env, project scope sesi yang sama, governance, dan read-only registration yang sama.
- Menambahkan konfigurasi host/port dengan default loopback, batas request body 1 MiB, lifecycle session in-memory, penutupan bersih, dokumentasi endpoint dan kewajiban TLS/reverse proxy, serta test parsing konfigurasi transport. Tidak menambah dependency atau mengekspos token pada URL/header/argumen tool.
- Verifikasi lulus: `cd mcp && npm test`, `cd mcp && npm run build`, dan `git diff --check`. Listener HTTP tidak di-smoke-test melalui socket karena sandbox menolak operasi listen (`EPERM`); routing dibangun langsung dengan transport resmi MCP SDK. Tidak menjalankan migration, tidak menghapus data, tidak commit, dan tidak push.

## 2026-08-01 — MCP-19 dokumentasi MCP server

- Menjalankan `graphify query` sebelum menelusuri fondasi MCP dan mengikuti keputusan setup, autentikasi, project scoping, read-only, transport, serta keamanan pada Section 8.1 `FEATURE_BACKLOG.md`.
- Menambahkan `docs/MCP_SERVER.md` berisi persyaratan dan setup Node.js 20+, konfigurasi environment, katalog 42 tool aktual per domain/mode, contoh `claude_desktop_config.json` dan `.mcp.json`, serta panduan validasi awal client.
- Seluruh nilai konfigurasi menggunakan placeholder; dokumentasi menegaskan token hanya berasal dari environment/secret manager, scope minimum, RLS dan project isolation, read-only, human gate, audit/rate limit, signed URL, serta TLS/firewall untuk HTTP/SSE.
- Verifikasi lulus: dua contoh JSON berhasil di-parse, katalog dokumentasi cocok dengan 42 registrasi tool aktual, `cd mcp && npm run build`, dan `git diff --check`. `graphify update .` juga dijalankan; tidak ada source code untuk diekstrak ulang karena perubahan hanya dokumentasi, sedangkan watcher melaporkan batasan sandbox `EPERM`.
- Tidak mengubah kode, dependency, atau database; tidak menjalankan migration, tidak menghapus data, tidak commit, dan tidak push.

## 2026-08-01 — PW-01 mode headed dan slow-mo runner

- Menjalankan `graphify query` sebelum menelusuri runner dan mengikuti keputusan mode eksekusi lokal pada Section 9.1 `FEATURE_BACKLOG.md`.
- Menambahkan flag runner `--headed` dan `--slow-mo=<milidetik>`/`--slow-mo <milidetik>`, beserta default env `TM_PLAYWRIGHT_HEADED` dan `TM_PLAYWRIGHT_SLOW_MO_MS`.
- Menambahkan override per job melalui field payload opsional `headed` dan `slow_mo_ms`; nilai job mengalahkan default runner, sedangkan slow-mo tanpa pilihan headed eksplisit otomatis menjalankan browser terlihat.
- Executor meneruskan `--headed` ke Playwright CLI dan nilai slow-mo efektif ke proses Playwright lewat `TM_PLAYWRIGHT_SLOW_MO_MS`. Dokumentasi menjelaskan konfigurasi `use.launchOptions.slowMo` karena Playwright Test tidak menyediakan flag CLI slow-mo.
- Menambahkan validasi integer non-negatif, dokumentasi `.env`/CLI, dan unit test precedence serta parsing opsi.
- Verifikasi lulus: `cd runner && npm test` (3/3 test file, termasuk build TypeScript). Tidak menjalankan migration, tidak menghapus data, tidak menambah dependency, tidak commit, dan tidak push.

## 2026-08-01 — PW-02 browser dan device profile automation runner

- Menambahkan pilihan browser `chromium|firefox|webkit` dan device profile mobile pada dialog enqueue Automation, lengkap melalui service dan repository.
- Menambahkan migrasi `schema_060_pw02_browser_device_jobs.sql` untuk menyimpan target pada job/Test Run dan memasukkannya ke payload polling runner; migrasi hanya dibuat, tidak dijalankan ke target Supabase.
- Runner memvalidasi payload, menerapkan browser melalui CLI Playwright, dan meneruskan device profile melalui `TM_PLAYWRIGHT_DEVICE_PROFILE` untuk dipakai konfigurasi emulasi Playwright.
- Verifikasi lulus: `cd runner && npm test` (3/3 test file) dan `cd frontend && npm run build`.
- `graphify update .` sudah dijalankan dan memperbarui artifact graph, tetapi proses mengembalikan warning akhir `Operation not permitted` dari watcher sandbox. Tidak ada migrasi yang dijalankan, data dihapus, dependency ditambah, commit, atau push.

## 2026-08-01 — PW-03 mode UI, debug, dan watch runner

- Menjalankan `graphify query` sebelum menelusuri CLI runner dan mengikuti keputusan mode eksekusi interaktif pada Section 9.1 `FEATURE_BACKLOG.md`.
- Menambahkan subcommand lokal `runner ui`, `runner debug`, dan `runner watch`; argumen setelah subcommand diteruskan ke Playwright dan mode lokal tidak memerlukan kredensial/polling server TestManager.
- Mode UI menjalankan Playwright dengan `--ui`, mode debug dengan `--debug` dan `PWDEBUG=1`, sedangkan mode watch menjalankan test pada awal sesi lalu menjadwalkan ulang ketika file `*.spec.*` atau `*.test.*` berubah, dengan debounce dan pengecualian direktori dependency/artifact/report.
- Menambahkan unit test parsing subcommand dan pembentukan invocation Playwright, serta dokumentasi penggunaan dan penghentian watch dengan Ctrl+C.
- Verifikasi lulus: `cd runner && npm test` (3/3 test file, termasuk build TypeScript) dan `cd frontend && npm run build` (dengan warning ukuran chunk Vite yang sudah ada). Tidak menjalankan migration, tidak menghapus data, tidak menambah dependency, tidak commit, dan tidak push.
- `graphify update .` memperbarui graph menjadi 2.454 node dan 5.108 edge; pemanggilan ulang setelah koreksi kecil mendeteksi tidak ada source tersisa untuk diperbarui lalu watcher sandbox melaporkan `Operation not permitted`.
## 2026-08-01 — PW-04 bukti kegagalan lengkap di runner

- Mengubah eksekusi runner agar trace memakai `retain-on-failure` dan contoh konfigurasi Playwright memakai screenshot `only-on-failure`, video `retain-on-failure`, serta trace `retain-on-failure`.
- Menambahkan fixture observability otomatis pada example project untuk merekam semua level console browser dengan timestamp ISO, network HAR (request/response/status/timing), dan snapshot DOM pada titik gagal beserta computed style penting.
- Memperluas kontrak, klasifikasi, MIME upload, dan tipe frontend artifact dengan tipe `network` dan `dom`; menambahkan unit test klasifikasi bundle bukti.
- Memperbarui README runner dan checklist Section 9.3 untuk enam artefak dalam scope PW-04. Metadata lingkungan tetap belum dicentang karena bukan bagian task ini.
- Verifikasi lulus: `runner/npm test` (4 test), type-check fixture example project, dan `frontend/npm run build`. Uji Playwright failure menghasilkan trace tetapi browser lokal belum terpasang, sehingga pengujian browser penuh berhenti pada pesan executable Chromium tidak tersedia; tidak mengunduh browser karena task tidak mengizinkan kebutuhan network eksternal.

## 2026-08-01 — PW-05 metadata lingkungan laporan runner

- Menjalankan `graphify query` sebelum menelusuri runner dan mengikuti scope Section 9.3 serta sumber commit SHA dari Section 10 `FEATURE_BACKLOG.md`.
- Menambahkan metadata laporan terstruktur berisi browser dan versi binary browser Playwright, OS, viewport, base URL environment, build version Test Run, dan commit SHA repository yang benar-benar disiapkan runner.
- Menambahkan migrasi `schema_061_pw05_runner_environment_metadata.sql` untuk membawa base URL/build version pada payload poll, memvalidasi serta menyimpan metadata sebagai JSONB di automation job, dan menyalin commit SHA ke Test Run. Migrasi hanya dibuat dan tidak dijalankan ke target Supabase.
- Viewport default Playwright adalah `1280x720` dan dapat dicatat sesuai konfigurasi project melalui `TM_PLAYWRIGHT_VIEWPORT=WIDTHxHEIGHT`; dokumentasi dan contoh environment telah diperbarui.
- Menambahkan unit test untuk metadata lengkap, nilai nullable, dan fallback viewport. Tidak menambah dependency, tidak menghapus data, tidak commit, dan tidak push.
- Verifikasi lulus: `cd runner && npm test` (5/5 test file, termasuk build TypeScript), `cd frontend && npm run build` (warning ukuran chunk Vite yang sudah ada), dan `git diff --check`.

## 2026-08-01 — PW-06 upload dan penautan bundle artifact automation

- Menjalankan `graphify query` sebelum menelusuri alur runner, Edge Function, Storage, dan `test_results`, lalu mengikuti kontrak bukti lengkap Section 9.3/11.4 `FEATURE_BACKLOG.md`.
- Mengubah upload runner menjadi all-or-nothing: tidak ada fallback path lokal atau metadata parsial; kegagalan signing/upload serta bundle FAIL yang tidak memiliki screenshot, video, trace, console log, HAR, dan DOM dilaporkan sebagai `blocked` dan di-retry sesuai batas job.
- Memperketat Edge Function `automation-artifacts` agar menolak nama file kosong/duplikat setelah sanitasi dan tetap membatasi object ke prefix project/job milik runner.
- Menambahkan migration `schema_062_pw06_automation_artifacts.sql` untuk kolom JSONB `test_results.automation_artifacts`, validasi metadata Storage/bundle FAIL lengkap, dan penautan metadata yang sama saat laporan job final. Migration hanya dibuat dan tidak dijalankan ke target Supabase.
- Menambahkan mapping domain frontend untuk artifact pada Test Result serta unit test kelengkapan bundle dan upload atomik. Tidak menambah dependency, tidak menghapus data, tidak commit, dan tidak push.
- Verifikasi lulus: `cd runner && npm test` (6/6 file test), `cd frontend && npm run build` (warning ukuran chunk Vite yang sudah ada), dan `git diff --check`.

## 2026-08-01 — PW-07 viewer bukti Test Result

- Menjalankan `graphify query` sebelum menelusuri alur Test Result dan mengikuti keputusan viewer Section 9.4 serta bukti langsung Section 11.4 `FEATURE_BACKLOG.md`.
- Menambahkan halaman detail Test Result terlindungi di `/test-results/:id`, beserta aksi lihat detail dari tabel hasil pada halaman Test Run.
- Menambahkan tab bukti Screenshot, Video, Console, Network, dan DOM: gambar serta video diputar lewat signed URL Storage, console/network ditampilkan inline sebagai teks, dan DOM snapshot dirender dalam iframe sandbox tanpa unduh manual.
- Menambahkan alur lengkap Page → Hook → Service → Repository → Supabase untuk mengambil detail hasil, membuat signed URL artifact private, dan membaca artifact teks; kegagalan satu artifact tidak menutup bukti lain yang masih tersedia.
- Memperbarui checklist scope PW-07 pada Section 9.4 dan 11.4. Tidak menambah dependency atau migrasi, tidak menjalankan migration, tidak menghapus data, tidak commit, dan tidak push.
- Verifikasi lulus: `cd frontend && npm run build` (warning ukuran chunk Vite yang sudah ada), `cd frontend && npm run lint` (hanya warning lama di file di luar scope), dan `git diff --check`. `graphify update .` berhasil memperbarui graph menjadi 2.494 node dan 5.185 edge.

## 2026-08-01 — PW-08 Playwright trace viewer

- Menjalankan `graphify query` sebelum menelusuri alur artefak Test Result dan mengikuti keputusan viewer Section 9.4 `FEATURE_BACKLOG.md`.
- Menambahkan tab Trace pada halaman detail Test Result yang meng-embed Playwright Trace Viewer memakai signed URL artefak private, serta menyediakan aksi membuka viewer di tab baru dan mengunduh file trace sebagai fallback.
- URL dasar viewer dapat diarahkan ke deployment self-hosted melalui `VITE_PLAYWRIGHT_TRACE_VIEWER_URL`; default tetap `https://trace.playwright.dev/`. Tidak menambah dependency, migrasi, atau akses data baru; alur artefak tetap Page → Hook → Service → Repository → Supabase.
- Verifikasi lulus: `cd frontend && npm run build`, `cd frontend && npm run lint` (hanya tujuh warning lama di luar file scope), dan `git diff --check`.

## 2026-08-01 — PW-09 diff screenshot antar run

- Menjalankan `graphify query` sebelum menelusuri alur Test Result dan mengikuti keputusan viewer regresi visual pada Section 9.4 `FEATURE_BACKLOG.md`.
- Menambahkan alur Page → Hook → Service → Repository → Supabase untuk mengambil screenshot dari Test Case yang sama pada run sebelumnya, memilih run terdahulu terdekat yang memiliki screenshot, dan menyiapkan signed URL Storage.
- Menambahkan tab Diff Screenshot pada halaman detail Test Result dengan informasi run before/after, pencocokan screenshot berdasarkan nama (fallback urutan), dan slider overlay interaktif untuk membandingkan perubahan visual.
- Memperbarui checklist PW-09 Section 9.4. Tidak menambah dependency atau migrasi, tidak menjalankan migration, tidak menghapus data, tidak commit, dan tidak push.
- Verifikasi lulus: `cd frontend && npm run build`, `cd frontend && npm run lint` (hanya tujuh warning lama di luar file scope), dan `git diff --check`.

## 2026-08-01 — PW-10 live log streaming automation job

- Menjalankan `graphify query` sebelum menelusuri alur automation runner dan mengikuti scope live log pada Section 9.4 `FEATURE_BACKLOG.md`.
- Menambahkan migrasi `schema_063_pw10_live_job_logs.sql` untuk log job append-only, RLS baca berbasis akses project, RPC append yang memvalidasi token/assignment/status/attempt runner, batas chunk 32 KiB, serta publikasi Supabase Realtime. Migrasi hanya dibuat dan tidak dijalankan ke target Supabase.
- Runner menangkap stdout/stderr Playwright, membagi output besar, lalu mengirim batch log tiap satu detik dengan sequence idempotent; kegagalan streaming bersifat best-effort dan tidak menggagalkan eksekusi job.
- Menambahkan alur Repository → Service → Hook untuk initial load dan subscription insert Realtime, serta viewer dialog monospace pada tabel job yang diperbarui otomatis ketika job berjalan.
- Tidak menambah dependency, tidak menghapus data, tidak commit, dan tidak push.
- Verifikasi lulus: `cd runner && npm test` (6/6 file test), `cd frontend && npm run build` (warning ukuran chunk Vite yang sudah ada), `cd frontend && npm run lint` (hanya tujuh warning lama di luar file scope), dan `git diff --check`.
- `graphify update .` berhasil menyinkronkan knowledge graph menjadi 2.533 node dan 5.255 edge; terdapat warning tujuh file konfigurasi/hasil test tanpa node, tanpa kegagalan proses.

## 2026-08-01 — PW-11 sanity check base URL automation runner

- Menjalankan `graphify query` sebelum menelusuri alur runner dan mengikuti scope sanity check pada Section 9.5 `FEATURE_BACKLOG.md`.
- Menambahkan sanity check sebelum proses Playwright dibuat: base URL HTTP/HTTPS divalidasi dan diakses dari mesin runner dengan timeout 10 detik; base URL kosong tetap didukung untuk job yang tidak memiliki environment URL.
- Kegagalan URL invalid, protokol/kredensial URL, HTTP non-sukses, timeout, DNS, koneksi ditolak/diputus, serta host/jaringan tidak terjangkau dilaporkan sebagai hasil `blocked` dengan pesan spesifik. URL hanya dicatat sebagai origin agar path/query sensitif tidak masuk live log.
- Menambahkan unit test untuk skip URL kosong, respons sukses, status HTTP error, URL invalid, DNS, dan timeout; memperbarui checklist Section 9.5. Tidak menambah dependency atau migrasi, tidak menjalankan migration, tidak menghapus data, tidak commit, dan tidak push.
- Verifikasi lulus: `cd runner && npm test` (7/7 file test), `cd frontend && npm run build` (warning ukuran chunk Vite yang sudah ada), dan `git diff --check`.

## 2026-08-01 — PW-12 Run locally satu Test Case

- Menjalankan `graphify query` sebelum menelusuri alur UI automation dan runner, lalu mengikuti scope Section 9.1 `FEATURE_BACKLOG.md` serta arsitektur runner outbound-only.
- Menambahkan tombol **Run locally** pada setiap Test Case yang sudah memiliki mapping script, dengan dialog pemilihan Test Plan, browser, device profile, dan nama run opsional.
- Menambahkan alur Page → Hook → Service → Repository → Supabase untuk membuat satu Test Run, satu Test Result, dan tepat satu job automation; Test Case wajib menjadi anggota plan dan memiliki mapping script.
- Menambahkan migration `schema_064_pw12_run_single_locally.sql` dengan validasi project/plan/case, permission editor, browser/device, audit event, dan grant RPC terautentikasi. Migrasi hanya dibuat dan tidak dijalankan ke target Supabase.
- Memperbarui checklist PW-12 Section 9.1. Tidak menambah dependency, tidak menghapus data, tidak commit, dan tidak push.
- Verifikasi lulus: `cd frontend && npm run build` (warning ukuran chunk Vite yang sudah ada) dan `git diff --check`.

## 2026-08-01 — PW-13 retry manual satu Test Result

- Menjalankan `graphify query` sebelum menelusuri alur Test Result dan automation job, lalu mengikuti scope interaktivitas terarah Section 9.5 `FEATURE_BACKLOG.md`.
- Menambahkan tombol **Retry test** pada halaman detail Test Result dengan alur lengkap Page → Hook → Service → Repository → Supabase dan notifikasi hasil enqueue.
- Menambahkan migration `schema_065_pw13_manual_test_retry.sql` untuk membuat job automation baru pada Test Run dan Test Result yang sama, memakai mapping script serta browser/device job sebelumnya, tanpa membuat Test Run baru atau mengubah status Test Run.
- RPC memvalidasi permission `can_run_tests`, mapping script, dan menolak job retry ganda yang masih queued/running; lock pada Test Result mencegah enqueue ganda akibat request bersamaan. Job lama tetap dipertahankan sebagai histori dan hasil final runner tetap ditulis ke Test Result yang sama.
- Memperbarui checklist PW-13 Section 9.5. Migration hanya dibuat dan tidak dijalankan ke target Supabase; tidak menghapus data, tidak menambah dependency, tidak commit, dan tidak push.
- Verifikasi lulus: `cd frontend && npm run build` (warning ukuran chunk Vite yang sudah ada) dan `git diff --check`.
- `graphify update .` berhasil menyinkronkan knowledge graph menjadi 2.556 node dan 5.280 edge; terdapat warning tujuh file konfigurasi/hasil test tanpa node, tanpa kegagalan proses.

## 2026-08-01 — PW-14 runner Playwright codegen

- Menjalankan `graphify query` sebelum menelusuri runner, model automation script, dan Section 9.2 `FEATURE_BACKLOG.md`.
- Menambahkan subcommand `runner codegen <url>` yang memvalidasi URL HTTP(S), menampilkan pilihan Test Case aktif pada proyek runner, membuka Playwright Codegen, dan menyimpan rekaman ke `tests/<kode-test-case>.spec.ts` (atau mapping yang sudah ada).
- Script baru hanya di-attach setelah proses Codegen sukses dan file hasil tersedia. Attachment memakai RPC khusus runner-token yang membatasi daftar dan mutasi ke proyek runner aktif, lalu melakukan upsert `automation_scripts.script_ref` tanpa menyimpan isi source di server.
- Menambahkan migration `schema_066_pw14_runner_codegen.sql`; migration hanya dibuat dan tidak dijalankan ke target Supabase. Memperbarui README runner, checklist PW-14, parser CLI, API runner, dan unit test codegen. Tidak menambah dependency, tidak menghapus data, tidak commit, dan tidak push.
- Verifikasi lulus: `cd runner && npm test` (8/8 file test) dan `cd frontend && npm run build` (warning ukuran chunk Vite yang sudah ada).
- `graphify update .` sudah dijalankan tetapi incremental rebuild melaporkan `Operation not permitted`; tidak ada source aplikasi yang gagal dibangun dan file graph lama tetap tersedia.

## 2026-08-01 — PW-15 record-from-test-case

- Menjalankan `graphify query` sebelum menelusuri alur codegen runner, structured manual steps, dan keputusan Section 9.2 `FEATURE_BACKLOG.md`.
- Menambahkan migration `schema_067_pw15_record_from_test_case.sql` yang memperluas payload Test Case codegen dengan `test_case_steps` terurut beserta expected result; migration hanya dibuat dan tidak dijalankan ke target Supabase.
- Runner menampilkan langkah manual sebagai checklist terminal sebelum Playwright Codegen dibuka. Script hasil rekaman tetap disimpan ke repository lokal dan `script_ref` hanya di-attach setelah Codegen sukses serta file hasil tersedia.
- Menambahkan unit test formatter checklist, memperbarui README runner dan checklist backlog. Tidak menambah dependency, tidak menghapus data, tidak commit, dan tidak push.
- Verifikasi lulus: `cd runner && npm test` (8/8 file test) dan `cd frontend && npm run build` (warning ukuran chunk Vite yang sudah ada).
- `git diff --check` lulus dan `graphify update .` berhasil menyinkronkan knowledge graph menjadi 2.575 node dan 5.314 edge; terdapat warning tujuh file konfigurasi/hasil test tanpa node, tanpa kegagalan proses.

## 2026-08-01 — PW-16 sinkronisasi script ke Test Case

- Menjalankan `graphify query` sebelum menelusuri alur runner codegen, mapping `automation_scripts`, dan scope Section 9.2 `FEATURE_BACKLOG.md`.
- Menambahkan subcommand `runner sync` yang memindai `TM_PROJECT_DIR` untuk file Playwright `*.spec.*`/`*.test.*`, mengabaikan dependency, Git, report, hasil test, artifact, dan symbolic link, lalu membandingkan path relatif portabel dengan `script_ref` server.
- Setiap script baru ditawarkan melalui prompt terminal untuk dipetakan ke Test Case aktif yang belum memiliki automation. Satu Test Case hanya dapat dipilih sekali per sinkronisasi; pemetaan memakai RPC runner-token yang sudah ada dan isi source script tidak dikirim ke server.
- Memperbarui README runner dan checklist PW-16. Tidak menambah dependency atau migration, tidak menjalankan migration ke target, tidak menghapus data, tidak commit, dan tidak push.
- Verifikasi lulus: `cd runner && npm test` (8/8 file test), `cd frontend && npm run build` (warning ukuran chunk Vite yang sudah ada), dan `git diff --check`.
- `graphify update .` berhasil menyinkronkan knowledge graph menjadi 2.583 node dan 5.336 edge; warning tujuh file konfigurasi/hasil test tanpa node tidak menggagalkan proses.

## 2026-08-01 — PW-17 scaffold project Playwright lewat runner init

- Menjalankan `graphify query` sebelum menelusuri CLI runner dan mengikuti scope Section 9.2 `FEATURE_BACKLOG.md`.
- Menambahkan subcommand `runner init [directory]` yang membuat project Playwright minimal berisi `package.json`, konfigurasi Playwright, `.gitignore`, dan contoh test tanpa membutuhkan kredensial TestManager.
- Scaffold mengaktifkan screenshot, video, dan trace saat gagal sesuai kebijakan artifact runner; instalasi dependency dan browser tetap menjadi langkah eksplisit agar runner mempertahankan nol runtime dependency.
- Init memeriksa seluruh target lebih dulu, memakai exclusive file creation, dan membatalkan proses tanpa menimpa file project yang sudah ada. README runner dan checklist PW-17 diperbarui.
- Tidak menambah dependency atau migration, tidak menjalankan migration, tidak menghapus data, tidak commit, dan tidak push.
- Verifikasi lulus: `cd runner && npm test` (9/9 file test), `cd frontend && npm run build` (warning ukuran chunk Vite yang sudah ada), dan `git diff --check`.
- `graphify update .` berhasil menyinkronkan knowledge graph menjadi 2.590 node dan 5.347 edge; warning tujuh file konfigurasi/hasil test tanpa node tidak menggagalkan proses.

## 2026-08-01 — PW-18 pauseOnFailure

- Menjalankan `graphify query` sebelum menelusuri alur job automation, Local Runner, dan keputusan Section 9.5 `FEATURE_BACKLOG.md`.
- Menambahkan migration `schema_068_pw18_pause_on_failure.sql` untuk menyimpan flag `pause_on_failure`, meneruskannya melalui enqueue batch/single-case dan payload polling runner; migration hanya dibuat dan tidak dijalankan ke target Supabase.
- Menambahkan opsi **Pause & inspect saat gagal** pada dialog enqueue dan Run locally melalui alur Page → Hook → Service → Repository → Supabase, serta menampilkan nilai flag pada domain job.
- Runner otomatis memakai browser headed dan meneruskan `TM_PAUSE_ON_FAILURE=1`. Fixture observability mengumpulkan bukti kegagalan lebih dulu, lalu memberi sinyal runner untuk menghentikan timeout dan menjalankan `page.pause()` agar browser serta state halaman bertahan sampai tester menekan Resume di Playwright Inspector; timeout tetap aktif sebelum kegagalan.
- Menambahkan unit test resolusi execution mode dan dokumentasi kewajiban spec mengimpor fixture observability. Tidak menjalankan migration, tidak menghapus data, tidak commit, dan tidak push.
- Verifikasi lulus: `cd runner && npm test` (9/9 file test), `cd frontend && npm run build` (warning ukuran chunk Vite yang sudah ada), dan `git diff --check`.
- `graphify update .` berhasil menyinkronkan knowledge graph menjadi 2.596 node dan 5.353 edge; warning tujuh file konfigurasi/hasil test tanpa node tidak menggagalkan proses.

## 2026-08-01 — PW-19 step-through UI ke Local Runner

- Menjalankan `graphify query` sebelum menelusuri alur Automation UI, queue job, runner lokal, dan keputusan Section 9.5 `FEATURE_BACKLOG.md`.
- Menambahkan migration `schema_069_pw19_step_commands.sql` berisi command queue `next`/`continue`, RPC UI yang memvalidasi hak edit dan status job, serta RPC polling terautentikasi runner-token. Migration hanya dibuat dan tidak dijalankan ke target Supabase.
- Menambahkan tombol **Next** dan **Continue** pada job berstatus running melalui alur Page → Hook → Service → Repository → Supabase.
- Local Runner mengambil perintah lewat polling HTTPS outbound, lalu meneruskannya ke proses Playwright melalui channel lokal stdin JSONL dengan `TM_STEP_CONTROL_CHANNEL=stdin-jsonl`; runner tetap tidak membuka port atau koneksi inbound.
- Memperbarui dokumentasi kontrak channel runner dan checklist PW-19. Tidak menambah dependency, tidak menghapus data, tidak commit, dan tidak push.
- Verifikasi lulus: `cd runner && npm test` (9/9 file test), `cd frontend && npm run build` (warning ukuran chunk Vite yang sudah ada), dan `git diff --check`.
- `graphify update .` berhasil menyinkronkan knowledge graph menjadi 2.607 node dan 5.372 edge; warning tujuh file konfigurasi/hasil test tanpa node tidak menggagalkan proses.

## 2026-08-01 — E2E-01 generate Test Case CSV dari requirement

- Menjalankan `graphify query` sebelum menelusuri action `generate_test_cases`, template import CSV aktual, integrasi repository, dan keputusan Section 11.1 `FEATURE_BACKLOG.md`.
- Memperluas kontrak sumber requirement Edge Function agar menerima teks bebas, hasil ekstraksi file Excel/CSV/dokumen, atau referensi repository aktif milik project beserta ref/path dan potongan konteks opsional. Referensi repository diverifikasi terhadap project dan path lokal tidak diteruskan ke provider AI.
- Gateway sekarang membentuk CSV secara deterministik dari output provider dengan header persis seperti template import aktual: `Module,Title,Objective,Preconditions,Steps,Expected Result,Priority,Tags,Target Role`. Seluruh cell di-quote dan karakter quote di-escape; respons tetap berstatus draft dan menyertakan `csv` serta `csvColumns` tanpa menghilangkan `testCases` untuk kompatibilitas consumer saat ini.
- Menambahkan kontrak field `module` dan `targetRole`, schema hint provider, serta test untuk semua tipe input dan kesamaan/escaping format CSV. Tidak menambah dependency atau migration, tidak menjalankan migration, tidak menghapus data, tidak commit, dan tidak push.
- Verifikasi lulus: `cd frontend && npm run build` (warning ukuran chunk Vite yang sudah ada) dan `git diff --check`. Test Deno tidak dijalankan karena runtime Deno maupun image Docker Deno tidak tersedia di workspace.
- `graphify update .` berhasil menyinkronkan knowledge graph menjadi 2.613 node dan 5.388 edge; warning tujuh file konfigurasi/hasil test tanpa node tidak menggagalkan proses.

## 2026-08-01 — E2E-02 negative, edge case, dan requirement traceability

- Menjalankan `graphify query` sebelum menelusuri kontrak generate Test Case dan mengikuti keputusan Section 11.1 `FEATURE_BACKLOG.md`.
- Menambahkan `scenarioType` (`happy_path`/`negative`/`edge_case`) dan `requirementRef` wajib pada setiap draft test case di kontrak AI Gateway serta parser frontend.
- Validasi gateway dan frontend sekarang menolak batch generate yang tidak memiliki minimal satu skenario negatif dan satu edge case; prompt provider dan mock gateway/frontend juga menghasilkan ketiga kategori sebagai baris terpisah.
- CSV deterministik menambahkan `requirement_ref` pada setiap baris agar sumber requirement langsung dapat ditelusuri.
- Menambahkan test kontrak dan parser untuk cakupan kategori wajib, traceability, alias snake_case, dan output CSV. Tidak menambah dependency atau migration, tidak menjalankan migration, tidak menghapus data, tidak commit, dan tidak push.
- Verifikasi lulus: `cd frontend && npm run build`, `cd frontend && npm test -- --run` (4/4 test), dan `git diff --check`. Test Deno tidak dijalankan karena runtime Deno tidak tersedia di workspace.

## 2026-08-01 — E2E-03 preview CSV hasil AI

- Menjalankan `graphify query` sebelum menelusuri generator Test Case AI, kontrak CSV, alur simpan, serta keputusan Section 11.1 `FEATURE_BACKLOG.md`.
- Menambahkan preview CSV berbentuk tabel pada dialog generator AI dengan kolom utama template import dan `requirement_ref`, status per baris, serta penanda visual untuk error validasi dan peringatan kandidat duplikat.
- Menambahkan serializer CSV deterministik di service, tombol unduh dari hasil preview, dan gate yang memblokir impor selama masih ada baris tidak valid. Impor dengan kandidat duplikat tetap membutuhkan konfirmasi manusia yang sudah ada.
- Mempertahankan field `module` dan `targetRole` dari respons AI pada parser frontend agar preview dan unduhan sesuai kontrak CSV gateway. Tidak menambah dependency atau migration, tidak menjalankan migration, tidak menghapus data, tidak commit, dan tidak push.
- Verifikasi lulus: `cd frontend && npm run build` (warning ukuran chunk Vite yang sudah ada), `cd frontend && npm test -- --run` (5/5 test), dan `cd frontend && npm run lint` (hanya warning existing di file di luar scope).
- `graphify update .` sudah dijalankan; incremental rebuild melaporkan `Operation not permitted`, sementara cache statistik Graphify tetap diperbarui. Source aplikasi dan graph lama tetap tersedia.

## 2026-08-01 — E2E-04 draft Test Case hasil import AI

- Menjalankan `graphify query` sebelum menelusuri alur AI generator ke penyimpanan Test Case dan mengikuti gate review manusia pada Section 11.2 `FEATURE_BACKLOG.md`.
- Menambahkan migration `schema_070_ai_test_case_drafts.sql` untuk kolom `test_cases.source` dengan nilai terbatas `manual`/`ai`, default `manual`, serta memperluas constraint status Test Case agar menerima `draft`. Migration hanya dibuat dan tidak dijalankan ke target Supabase.
- Menambahkan `TestCaseSource` dan status `draft` pada domain, mapping `source` snake_case ke camelCase, serta meneruskan field tersebut melalui repository dan service dengan default `manual` + `active` untuk alur non-AI.
- Hasil simpan dari generator AI sekarang selalu `source = 'ai'` dan `status = 'draft'`; pencatatan approval saat import dihapus agar tidak melewati gate review manusia. Status Draft ditampilkan pada daftar dan tersedia di filter/status bulk untuk alur review berikutnya.
- Tidak menambah dependency, tidak menghapus data, tidak commit, dan tidak push.
- Verifikasi lulus: `cd frontend && npm run build` (warning ukuran chunk Vite yang sudah ada), `cd frontend && npm test` (5/5 test), dan `git diff --check`.
- `graphify update .` berhasil menyinkronkan knowledge graph menjadi 2.623 node dan 5.400 edge; warning tujuh file konfigurasi/hasil test tanpa node tidak menggagalkan proses.

## 2026-08-01 — E2E-06 deteksi duplikat sebelum simpan draf AI

- Menjalankan `graphify query` sebelum menelusuri alur generator, hook, service, repository Test Case, dan keputusan Section 11.2 `FEATURE_BACKLOG.md`.
- Deteksi duplikat kini memuat ulang test case project melalui `testCaseService` dan repository sebelum dialog konfirmasi, sehingga tidak bergantung pada snapshot daftar di UI.
- `aiTestCaseService.approveAndSave()` mengulang pemeriksaan tepat sebelum create dan menolak penyimpanan kandidat duplikat yang belum diakui manusia; acknowledgement diteruskan per draf agar tidak menjadi bypass untuk seluruh batch.
- Memperbarui checklist E2E-06. Tidak menambah dependency atau migration, tidak menjalankan migration, tidak menghapus data, tidak commit, dan tidak push.
- Verifikasi lulus: `cd frontend && npm run build` (warning ukuran chunk Vite yang sudah ada), `cd frontend && npm test` (5/5 test), dan `cd frontend && npm run lint` (tujuh warning existing di luar scope).
- `graphify update .` berhasil menyinkronkan knowledge graph menjadi 2.637 node dan 5.442 edge; warning tujuh file konfigurasi/hasil test tanpa node tidak menggagalkan proses.

## 2026-08-01 — E2E-07 audit dan penutupan bypass approval AI

- Menjalankan `graphify query` lalu mengaudit jalur AI/MCP, service, repository, RPC Supabase, review UI, dan audit trigger sesuai gate wajib Section 11.2 `FEATURE_BACKLOG.md`.
- Audit menemukan dua bypass: tool `testmanager.testplan.approve` mengizinkan agent meminjam `approver_id` manusia dengan flag konfirmasi, serta RPC `mcp_create_test_cases`/`mcp_duplicate_test_case` menyimpan hasil agent langsung berstatus `active` walaupun service menandai respons sebagai `draft`/`review_only`.
- Menghapus approval Test Plan dari seluruh layer MCP (tool, service, repository, test, dan dokumentasi). Migration `schema_072_e2e07_close_approval_bypass.sql` mencabut fungsi RPC approval lama, sehingga API token tidak mempunyai jalur untuk mengaktifkan Test Plan.
- Migration yang sama mengganti RPC create/duplicate Test Case agar selalu menyimpan `status = 'draft'`, `source = 'ai'`, dan `ai_batch_id`; constraint database mencegah draf AI menjadi aktif tanpa keputusan review.
- Menambahkan trigger database yang hanya menerima transisi keputusan review dengan sesi user terautentikasi serta selalu mengisi `reviewed_by = auth.uid()` dan `reviewed_at`. Trigger audit `test_cases` yang sudah ada kemudian mencatat actor yang sama pada `audit_logs.changed_by` dan snapshot field review pada `new_data`, sehingga approver tidak dapat kosong atau disuplai agent.
- Migration hanya dibuat dan tidak dijalankan ke Supabase target. Tidak menghapus data, tidak commit, dan tidak push.
- Verifikasi lulus: `cd mcp && npm test` (20/20 suite), `cd mcp && npm run build`, `cd frontend && npm run build` (warning ukuran chunk Vite yang sudah ada), pencarian statis memastikan simbol/tool approval tidak tersisa di runtime selain migration historis dan migration pencabutannya, serta `git diff --check`.
- `graphify update .` berhasil menyinkronkan knowledge graph menjadi 2.640 node dan 5.440 edge; warning tujuh file konfigurasi/hasil test tanpa node tidak menggagalkan proses.
## 2026-08-01 — E2E-08 pembentukan Test Plan dari hasil review

- Menambahkan migration aditif `schema_073_e2e08_reviewed_test_plan.sql` tanpa menjalankannya ke Supabase target. Migration menambah metadata approval Test Plan, RPC pembentukan plan atomik yang hanya menerima test case AI aktif dengan keputusan review `approved`, dan RPC approval plan berbasis sesi user dengan konfirmasi eksplisit.
- Menambahkan alur `AiTestCaseReviewPage -> useAiTestCaseReview -> testPlanService -> testPlanRepository -> Supabase`: reviewer dapat memilih draf, mengonfirmasi approval Test Plan secara eksplisit, lalu membentuk plan aktif dari test case yang baru lolos review.
- Menampilkan metadata status approval di detail Test Plan dan mengarahkan seluruh transisi Draft ke Aktif melalui service approval eksplisit; transisi status biasa tidak dapat dipakai untuk melewati gate.
- Memperbarui status Section 11.3 di `FEATURE_BACKLOG.md` serta domain/mapper untuk `approvedBy` dan `approvedAt`.
- Verifikasi lulus: `cd frontend && npm run build` (hanya warning ukuran chunk Vite yang sudah dikenal), `cd frontend && npm run lint` (lulus dengan tujuh warning existing di file yang tidak terkait), dan `git diff --check`.
# 2026-08-01 — E2E-09 fallback eksekusi manual tanpa automation script

- Memverifikasi kontrak Section 11.3 pada RPC MCP automation: semua test case dalam Test Plan tetap di-seed sebagai `test_results` berstatus awal `not_run`, sedangkan `automation_jobs` hanya dibuat melalui inner join ke mapping `automation_scripts`.
- Menambahkan regression contract test di `mcp/src/services/automationService.test.ts` yang membuktikan kasus tanpa script tetap tersedia untuk eksekusi manual, tidak masuk antrean automation, dan hasil otomatis hanya dapat berasal dari job runner yang valid.
- Tidak menjalankan migration atau mengubah data Supabase.
- Verifikasi lulus: `cd mcp && npm test` (20/20 suite), `cd frontend && npm run build`, dan `git diff --check`. `graphify update .` sudah meregenerasi output graph; proses watch lanjutannya berhenti karena sandbox melaporkan `Operation not permitted`.

## 2026-08-01 — E2E-10 draft Issue otomatis dari Test Result FAIL

- Menjalankan `graphify query` sebelum menelusuri alur Test Result FAIL ke draft Issue AI dan mengikuti kontrak Section 11.5 `FEATURE_BACKLOG.md`.
- Memperluas konteks repository untuk mengambil error runner, metadata environment, dan commit SHA dari Test Run/automation job yang tepat; payload juga membawa seluruh artifact yang tertaut ke Test Result.
- Draft mempertahankan secara deterministik relasi `test_result_id`, langkah reproduksi dan expected result dari snapshot Test Case saat run dibuat, ringkasan error, seluruh referensi artifact, environment, dan commit SHA. Data faktual tersebut tidak diserahkan kepada AI untuk diubah dan disimpan dalam deskripsi Issue setelah review manusia.
- Memperluas kontrak request AI Gateway untuk menerima konteks kegagalan lengkap. Tidak menambah dependency atau migration, tidak menjalankan migration, tidak menghapus data, tidak commit, dan tidak push.
- Verifikasi lulus: `cd frontend && npm run build` (warning ukuran chunk Vite yang sudah ada), `cd frontend && npm test -- --run` (5/5 test), `cd frontend && npm run lint` (tujuh warning existing di file di luar scope), dan `git diff --check`.
- `graphify update .` berhasil menyinkronkan knowledge graph menjadi 2.653 node dan 5.461 edge; warning tujuh file konfigurasi/hasil test tanpa node tidak menggagalkan proses.

## 2026-08-01 — E2E-11 duplicate Issue menjadi komentar

- Menjalankan `graphify query` sebelum menelusuri alur duplicate detection, draft Issue AI, serta layer komentar, lalu mengikuti keputusan Section 11.5 `FEATURE_BACKLOG.md`.
- Alur simpan mengulang duplicate detection di service untuk menghindari keputusan berdasarkan snapshot UI yang stale. Kandidat dengan confidence tertinggi diverifikasi masih berada pada project aktif, kemudian menerima komentar terstruktur yang membawa Test Result, detail kegagalan, metadata environment, commit, dan artifact; Issue baru hanya dibuat jika pemeriksaan terbaru tidak menemukan kandidat.
- UI review kini menampilkan kode dan judul kandidat, menandai target komentar, mewajibkan acknowledgement manusia, serta mengubah label aksi sesuai hasil deteksi. Formatter komentar membatasi payload sesuai batas 5.000 karakter pada `commentService`.
- Tidak menambah dependency atau migration, tidak menjalankan migration, tidak menghapus data, tidak commit, dan tidak push.
- Verifikasi lulus: `cd frontend && npm run build` (warning ukuran chunk Vite yang sudah ada), `cd frontend && npm test -- --run` (6/6 test), `cd frontend && npm run lint` (tujuh warning existing di file di luar scope), dan `git diff --check`.
- `graphify update .` berhasil menyinkronkan knowledge graph menjadi 2.655 node dan 5.468 edge; warning tujuh file konfigurasi/hasil test tanpa node tidak menggagalkan proses.

## 2026-08-01 — E2E-12 gate draft Issue hasil AI

- Menjalankan `graphify query` sebelum menelusuri alur Issue AI dan mengikuti keputusan Section 4 serta Section 11.5 `FEATURE_BACKLOG.md`.
- Menambahkan status Issue `draft` pada domain, label/filter UI, dan migration aditif `schema_074_e2e12_ai_issue_draft.sql`; migration hanya dibuat dan tidak dijalankan ke Supabase target.
- Alur AI kini memakai operasi service khusus yang memvalidasi Test Result `FAIL` dan selalu menyimpan Issue baru sebagai `draft`. Pencatatan approval prematur saat draft disimpan dihapus; manusia dapat memverifikasi dengan mengubah status melalui UI.
- Migration menambah status `draft` ke constraint database dan trigger yang menolak transisi keluar dari draft tanpa sesi user terautentikasi.
- Menambahkan regression test yang membuktikan `issueService.createAiDraft()` mengirim dan mengembalikan status `draft`.
- Tidak menambah dependency, tidak menghapus data, tidak commit, dan tidak push.
- Verifikasi lulus: `cd frontend && npm test -- --run` (7/7 test) dan `cd frontend && npm run build` (warning ukuran chunk Vite yang sudah ada).
- `git diff --check` lulus. `graphify update .` berhasil menyinkronkan knowledge graph menjadi 2.662 node dan 5.476 edge; warning tujuh file tanpa node tidak menggagalkan proses.

## 2026-08-01 — TEST-01 infrastruktur test frontend

- Menambahkan `jsdom`, `@testing-library/react`, dan provider coverage V8 sebagai devDependency frontend.
- Menambahkan `vitest.config.ts` dengan environment `jsdom`, setup file bersama untuk cleanup DOM setelah setiap test, dan konfigurasi coverage V8.
- Menambahkan skrip `npm run test:coverage`; skrip `npm test` tetap mencakup seluruh berkas test yang ada.
- Verifikasi lulus: `cd frontend && npm test` (2 berkas, 7/7 test), `cd frontend && npm run test:coverage` (7/7 test dan laporan coverage berhasil), serta `cd frontend && npm run build` (warning ukuran chunk Vite yang sudah ada).
- Instalasi npm melaporkan tiga kerentanan high severity pada dependency tree; tidak menjalankan `npm audit fix --force` karena berpotensi mengubah versi secara breaking dan berada di luar scope TEST-01.
- `graphify update .` berhasil menyinkronkan perubahan kode menjadi 2.683 node dan 5.495 edge. Pemanggilan kedua setelah hanya menambah ignore coverage tidak menemukan perubahan AST dan proses watch berakhir dengan warning sandbox `Operation not permitted`; graph hasil pemanggilan pertama tetap tersinkron.

## 2026-08-01 — TEST-02 utilitas test bersama frontend

- Menambahkan factory deterministik dengan dukungan `overrides` untuk Project, Module, Tag, TestCase, TestPlan, TestRun, TestResult, Issue, dan Profile di `frontend/src/test/`.
- Menambahkan mock Supabase client reusable yang mendukung query chain thenable, terminal `single`/`maybeSingle`, RPC, auth, storage, functions, pengaturan respons per tabel, dan inspeksi spy query.
- Menambahkan barrel export utilitas test serta mendokumentasikan lokasi, pola nama berkas, nama factory, dan penggunaan mock Supabase di `AGENTS.md`.
- Verifikasi lulus: `cd frontend && npm run build` (hanya warning ukuran chunk yang sudah dikenal), `npm test -- --run` (7/7 test), `npm run lint` (tujuh warning existing di luar scope), dan `git diff --check`.
- `graphify update .` berhasil menyinkronkan knowledge graph menjadi 2.704 node dan 5.528 edge; warning tujuh source tanpa node tidak menggagalkan proses.

## 2026-08-01 — TEST-03 invariant penyimpanan hasil dan summary Test Run

- Menjalankan `graphify query` sebelum menelusuri alur Test Plan, Test Case, Test Run, dan Test Result, lalu mengikuti invariant CLAUDE.md serta Section 16.3 `FEATURE_BACKLOG.md`.
- Menambahkan test service-level dengan repository mock yang membuktikan `testRunService.start()` hanya meneruskan ID Test Case untuk membuat seed `test_results`; status eksekusi tidak ditulis ke `test_cases` maupun junction `test_plan_cases`.
- Menambahkan test yang membuktikan `testRunService.getWithResults()` membaca ulang `test_results` dan menghitung summary/progress terbaru pada setiap pemanggilan, tanpa menyimpan summary atau progress melalui repository Test Run.
- Tidak menambah dependency atau migration, tidak menjalankan migration ke Supabase target, tidak menghapus data, tidak commit, dan tidak push.
- Verifikasi lulus: `cd frontend && npm test -- --run src/services/testRunService.test.ts` (2/2 test) dan `cd frontend && npm run build` (warning ukuran chunk Vite yang sudah ada).
- `graphify update .` berhasil menyinkronkan knowledge graph menjadi 2.707 node dan 5.536 edge; warning tujuh source tanpa node tidak menggagalkan proses.

## 2026-08-01 — TEST-04 invariant re-run dan completion manual Test Run

- Menjalankan `graphify query` sebelum menelusuri service dan test Test Run, lalu mengikuti invariant `CLAUDE.md` serta Section 16.3 `FEATURE_BACKLOG.md`.
- Menambahkan test service-level dengan repository mock yang membuktikan setiap pemanggilan ulang `testRunService.start()` membuat Test Run berbeda, membuat seed Test Result untuk ID run baru, dan tidak mengubah run sebelumnya.
- Menambahkan test yang membuktikan summary dengan progress 100% tidak mengubah status run; status `completed` hanya diteruskan ke repository melalui aksi eksplisit `testRunService.complete()`.
- Tidak menambah dependency atau migration, tidak menjalankan migration ke Supabase target, tidak menghapus data, tidak commit, dan tidak push.
- Verifikasi lulus: `cd frontend && npm test -- --run src/services/testRunService.test.ts` (4/4 test), `cd frontend && npm test -- --run` (11/11 test), dan `cd frontend && npm run build` (warning ukuran chunk Vite yang sudah ada).
- `graphify update .` berhasil menyinkronkan knowledge graph menjadi 2.708 node dan 5.537 edge; warning tujuh source tanpa node tidak menggagalkan proses.

## 2026-08-01 — TEST-05 invariant Issue FAIL, relasi 1:many, dan tester terdaftar

- Menjalankan `graphify query` sebelum menelusuri service Issue, Test Run, Test Result, dan Profile, lalu mengikuti invariant `CLAUDE.md` serta Section 16.3 `FEATURE_BACKLOG.md`.
- Menambahkan test service-level dengan repository mock yang membuktikan Issue ditolak untuk status Test Result selain `fail`, sedangkan dua Issue berbeda dapat merujuk Test Result FAIL yang sama tanpa membatasi relasi menjadi 1:1.
- Menambahkan test yang membuktikan pencatatan Test Result memvalidasi `testerId` melalui `profiles`, meneruskan ID profile terdaftar, dan menolak identitas berupa teks bebas sebelum repository Test Result dipanggil.
- Menambahkan guard minimal pada `testRunService.recordResult()` untuk memastikan tester ditemukan melalui `profileRepository`, tetap mengikuti alur Service → Repository → Supabase.
- Tidak menambah dependency atau migration, tidak menjalankan migration ke Supabase target, tidak menghapus data, tidak commit, dan tidak push.
- Verifikasi lulus: `cd frontend && npm test -- --run src/services/issueService.test.ts src/services/testRunService.test.ts` (12/12 test), `cd frontend && npm test -- --run` (18/18 test), dan `cd frontend && npm run build` (hanya warning ukuran chunk Vite yang sudah ada).
- `graphify update .` berhasil menyinkronkan knowledge graph menjadi 2.709 node dan 5.541 edge; warning tujuh source tanpa node tidak menggagalkan proses.

## 2026-08-01 — TEST-06 invariant RBAC dan approval AI/agent

- Menjalankan `graphify query` sebelum menelusuri route guard, service AI Test Case, dan permukaan tool MCP, lalu mengikuti Section 16.3 `FEATURE_BACKLOG.md`.
- Menambahkan test route guard terparameterisasi untuk seluruh kelompok route modul yang membuktikan user `pending` selalu dialihkan ke halaman pending dan tidak merender konten terlindungi.
- Menambahkan test service-level dengan dependency mock yang membuktikan hasil AI selalu diteruskan sebagai Test Case `draft` bersumber `ai` dan tidak memanggil aksi review/approval.
- Mempertegas test registrasi tool agent MCP yang membuktikan tidak tersedia tool approval Test Case maupun Test Plan.
- Tidak mengubah implementasi produksi, dependency, atau migration; tidak menjalankan migration ke Supabase target, tidak menghapus data, tidak commit, dan tidak push.
- Verifikasi lulus: `cd frontend && npm test` (5 berkas, 35/35 test), `cd frontend && npm run build` (warning ukuran chunk Vite yang sudah ada), serta `cd mcp && npm test` (20/20 test).

## 2026-08-01 — TEST-07 unit test mapper frontend

- Menjalankan `graphify query` sebelum menelusuri mapper dan mengikuti Section 16.4 `FEATURE_BACKLOG.md`.
- Menambahkan unit test berdampingan untuk seluruh 45 mapper yang diekspor oleh `frontend/src/helpers/mappers.ts`, dengan guard daftar ekspor agar mapper baru tidak luput dari suite.
- Test membuktikan konversi row Supabase `snake_case` ke domain `camelCase` mempertahankan nilai, termasuk field nullable, fallback field opsional/array, konversi number/boolean, relasi nested, snapshot Test Result, attachment URL, dan bentuk summary dashboard.
- Tidak mengubah implementasi produksi, dependency, atau migration; tidak menjalankan migration ke Supabase target, tidak menghapus data, tidak commit, dan tidak push.
- Verifikasi lulus: `cd frontend && npm test -- --run src/helpers/mappers.test.ts` (42/42 test), `cd frontend && npm run test:coverage -- --run src/helpers/mappers.test.ts` (100% statement/function/line dan 84,16% branch coverage untuk `mappers.ts`), `cd frontend && npm test -- --run` (6 berkas, 77/77 test), serta `cd frontend && npm run build` (warning ukuran chunk Vite yang sudah ada).
## 2026-08-01 — TEST-08 unit test formatter, status label, dan kode entity

- Menjalankan `graphify query` sebelum menelusuri helper dan schema pembentukan kode, lalu mengikuti Section 16.4 `FEATURE_BACKLOG.md`.
- Menambahkan unit test `dateFormatter` untuk locale Indonesia, presisi menit, offset zona waktu, serta input tanggal tidak valid.
- Menambahkan test menyeluruh untuk seluruh ekspor `statusLabels`, seluruh pasangan label/severity, dan kesetaraan key agar nilai domain tidak kehilangan representasi UI.
- Menambahkan contract-level unit test untuk pembentukan kode entity pada `schema_entity_codes.sql`: prefix MOD/TC/TP/TR, sequence awal dan increment atomik, padding empat digit dan nilai di atas 9999, scope project/prefix, guard null/string kosong, preservasi kode eksplisit, lookup project Test Run, serta unique scope tiap entity.
- Tidak mengubah implementasi produksi, dependency, atau migration; tidak menjalankan migration ke Supabase target, tidak menghapus data, tidak commit, dan tidak push.
- Verifikasi lulus: `cd frontend && npm test -- --run src/helpers/dateFormatter.test.ts src/helpers/statusLabels.test.ts src/helpers/entityCodes.test.ts` (30/30 test), `cd frontend && npm test -- --run` (107/107 test), dan `cd frontend && npm run build` (warning ukuran chunk Vite yang sudah ada).
- `graphify update .` telah dijalankan, tetapi incremental watch berakhir dengan warning sandbox `Operation not permitted` setelah melaporkan tidak ada pembaruan AST yang dapat diproses; graph lama tidak ditimpa.

## 2026-08-01 — TEST-09 unit test validasi service layer

- Menjalankan `graphify query` sebelum menelusuri service dan mengikuti Section 16.4 `FEATURE_BACKLOG.md`.
- Menambahkan unit test berdampingan untuk `testCaseService`, `testPlanService`, `testRunService`, dan `issueService` yang membuktikan input kosong, nama/judul di atas 255 karakter, enum runtime tidak dikenal, serta aturan bisnis domain ditolak dengan pesan yang jelas sebelum repository melakukan mutasi.
- Menambahkan guard service-level untuk batas 255 karakter dan allowlist enum pada jalur tulis terkait; validasi tetap berada di service dan tidak dipindahkan ke repository.
- Aturan bisnis yang dicakup meliputi Test Case detail wajib memiliki step, aktivasi Test Plan wajib melalui approval eksplisit, hasil pada Test Run completed tidak dapat diubah, Issue wajib merujuk Test Result yang ada dan berstatus FAIL, serta invariant tester terdaftar yang sudah ada tetap terverifikasi.
- Tidak menambah dependency atau migration, tidak menjalankan migration ke Supabase target, tidak menghapus data, tidak commit, dan tidak push.
- Verifikasi lulus: test terarah empat service (28/28), seluruh frontend test (123/123), `cd frontend && npm run build` (warning ukuran chunk Vite yang sudah ada), dan `cd frontend && npm run lint` (tujuh warning existing di luar scope).
- `graphify update .` berhasil menyinkronkan knowledge graph menjadi 2.746 node dan 5.591 edge; warning tujuh source tanpa node tidak menggagalkan proses.

## 2026-08-01 — TEST-10 smoke test build dan runtime boot

- Menambahkan `scripts/codex-loop/smoke.sh` yang executable: build frontend, memilih port dynamic/private secara acak, menjalankan `vite preview` dengan `--strictPort`, menunggu readiness melalui `fetch`, lalu memuat aplikasi memakai Chromium headless.
- Smoke gate memastikan elemen `#root` berisi hasil render, menggagalkan boot saat browser melaporkan error console/runtime fatal, serta selalu mematikan preview server dan membersihkan direktori sementara melalui trap.
- Verifikasi `bash -n scripts/codex-loop/smoke.sh` dan build frontend lulus. Eksekusi smoke penuh tertahan sandbox sesi ini karena operasi listen localhost ditolak dengan `EPERM`; skrip berhenti non-zero dan membersihkan proses sesuai desain.

## 2026-08-01 — TEST-11 component test review AI dan approval Test Plan

- Menjalankan `graphify query` sebelum menelusuri halaman, hook, dan service terkait, lalu mengikuti batas Section 16.5 `FEATURE_BACKLOG.md`.
- Menambahkan component test `AiTestCaseReviewPage` yang membuktikan approve dan reject meneruskan seluruh ID batch beserta keputusan yang benar, serta edit draf meneruskan field hasil review manusia dan tag melalui hook.
- Menambahkan component test `TestPlanDetailPage` yang membuktikan perubahan status draft menjadi active wajib memanggil `testPlanService.approve(id, true)` dan menampilkan metadata explicit approval dari hasil service.
- Test menggunakan mock pada boundary hook/service dan komponen UI yang relevan; tidak mengakses Supabase target, tidak mengubah implementasi produksi, dependency, atau migration.
- Verifikasi lulus: `cd frontend && npm run build` (hanya warning ukuran chunk Vite yang sudah ada) dan `cd frontend && npm test` (13 berkas, 127/127 test).
- `graphify update .` berhasil menyinkronkan knowledge graph menjadi 2.756 node dan 5.613 edge; warning tujuh source tanpa node tidak menggagalkan proses.

## 2026-08-01 — TEST-12 component test pencatatan hasil dan pembuatan Issue

- Menjalankan `graphify query` sebelum menelusuri halaman Test Run dan mengikuti batas alur kritis Section 16.5 `FEATURE_BACKLOG.md`.
- Menambahkan component test `TestRunDetailPage` yang membuktikan pencatatan hasil meneruskan Test Result ID, tester terdaftar, status, serta catatan yang sudah dinormalisasi ke `testRunService.recordResult`, kemudian memuat ulang summary run.
- Menambahkan component test yang membuktikan aksi pembuatan Issue hanya tersedia pada Test Result FAIL, mengisi nilai awal dari Test Case, mempertahankan relasi `testResultId`, meneruskan isian ke `issueService.create`, dan membuka daftar Issue run setelah berhasil.
- Test memakai mock pada boundary hook/service dan komponen UI; tidak mengakses Supabase target, tidak mengubah implementasi produksi, dependency, atau migration.
- Verifikasi lulus: test terarah `TestRunDetailPage.test.tsx` (2/2), `cd frontend && npm run build` (warning ukuran chunk Vite yang sudah ada), dan `cd frontend && npm run lint` (tujuh warning existing di luar scope).
- `graphify update .` berhasil menyinkronkan knowledge graph menjadi 2.762 node dan 5.628 edge; warning tujuh source tanpa node tidak menggagalkan proses.

## 2026-08-01 — TEST-13 audit hook yatim

- Menjalankan `graphify query` sebelum menelusuri empat hook yatim dan mengikuti keputusan Section 16.7 `FEATURE_BACKLOG.md` untuk memakai atau menghapus artefak yang tidak terpakai.
- Mempertahankan dan memakai `useModules` pada `TestPlanDetailPage` karena pemuatan daftar module merupakan data lifecycle halaman dan seharusnya melalui Hook → Service → Repository, bukan state/effect duplikat di page.
- Mempertahankan dan memakai `useProjectBreadcrumbItems` pada `ProjectDetailPage` agar breadcrumb project dapat menampilkan konteks owner untuk project milik user lain tanpa menduplikasi query profile.
- Mempertahankan dan memakai `useStoredState` pada `useProjectPins` karena pin project adalah preferensi browser yang memang disimpan di `localStorage`; implementasi parsing dan persistensi duplikat dihapus.
- Mempertahankan dan memakai `useTabQueryParam` pada `ProjectDetailPage` agar tab aktif mempunyai deep-link melalui parameter `tab` dan state tab manual yang redundan dihapus.
- Tidak menghapus keempat hook karena masing-masing mempunyai consumer yang jelas dan sesuai tanggung jawabnya; tidak mengubah database, dependency, atau migration, serta tidak menjalankan migration ke Supabase target.
- Verifikasi lulus: `cd frontend && npm run build` (hanya warning ukuran chunk Vite yang sudah ada), `cd frontend && npm test -- --run src/pages/test-plans/TestPlanDetailPage.test.tsx` (1/1 test), serta seluruh empat hook terkonfirmasi memiliki import consumer melalui `rg`.
- `graphify update .` berhasil menyinkronkan knowledge graph menjadi 2.763 node dan 5.637 edge; warning tujuh source tanpa node tidak menggagalkan proses.

## 2026-08-01 — TEST-14 inventaris utang test berbasis risiko

- Menjalankan `graphify query` sebelum menelusuri klaim fitur, layer aplikasi, dan test yang tersedia, lalu memakai Section 16.7 `FEATURE_BACKLOG.md` sebagai scope audit.
- Menambahkan `docs/TEST_DEBT.md` berisi inventaris fitur berstatus selesai yang belum memiliki test langsung, diurutkan ke P0 akses/RBAC dan mutasi data kritis, P1 integritas workflow, serta P2 reporting/UI.
- Membedakan cakupan yang benar-benar belum diuji dari invariant, helper, component flow, MCP, runner, dan Edge Function yang sudah mempunyai bukti test agar prioritas berikutnya tidak menduplikasi test yang ada.
- Mencatat konflik klaim authentication email/password di backlog dengan keputusan Google OAuth-only di `CLAUDE.md`, serta keterbatasan restore binary Storage yang sudah dinyatakan backlog; task ini hanya analisis dan tidak mengubah kode, test, dependency, database, atau migration.
- Verifikasi dokumentasi dilakukan dengan mencocokkan seluruh item `[x]` pada `FEATURE_BACKLOG.md`, inventaris berkas test repo, dan pemeriksaan diff; `cd frontend && npm run build` lulus dengan warning ukuran chunk Vite yang sudah ada.
- `graphify update .` dijalankan setelah perubahan dokumentasi untuk menyinkronkan knowledge graph.

## 2026-08-01 — E2E-13 konteks kode pada detail Issue

- Menjalankan `graphify query` sebelum menelusuri alur Issue dan mengikuti scope Section 11.6 serta keputusan traceability repository Section 10.5 di `FEATURE_BACKLOG.md`.
- Menambahkan konteks kode melalui alur `IssueDetailPage` → `useIssueCodeContext` → `issueService` → `issueRepository` → Supabase, tanpa melewati layer arsitektur.
- Konteks diturunkan dari Issue → Test Result → Test Run yang menyimpan repository, branch, dan commit SHA; file terkait diambil dari automation job terbaru untuk pasangan Test Run dan Test Case yang sama.
- Halaman detail Issue kini menampilkan kartu repository, branch, commit, dan file terkait hanya bila Test Run mempunyai repository tertaut. Repository GitHub mendapat tautan langsung ke repo, commit, dan file pada revisi yang diuji; local path tetap ditampilkan tanpa membuat URL browser palsu.
- Tidak menambah migration atau dependency, tidak mengakses maupun menjalankan migration ke Supabase target, dan tidak menyimpan token/kredensial repository di konteks UI.
- Verifikasi lulus: `cd frontend && npm run build`, unit test terarah `issueService.test.ts` (12/12), dan `cd frontend && npm run lint` (delapan warning existing di luar scope).
- `graphify update .` berhasil menyinkronkan knowledge graph menjadi 2.790 node dan 5.673 edge; warning tujuh source tanpa node tidak menggagalkan proses.

## 2026-08-01 — E2E-14 event resolved dan referensi perbaikan Issue

- Menjalankan `graphify query` sebelum menelusuri alur Issue, integrasi webhook, dan schema, lalu mengikuti scope Section 11.6 `FEATURE_BACKLOG.md`.
- Menambahkan migration idempotent `schema_075_e2e14_issue_resolution_event.sql`: field HTTPS opsional `issues.fix_reference_url`, event webhook khusus `issue.resolved` hanya pada transisi masuk ke resolved, dan dukungan Test Run custom project saat menentukan project event.
- Menambahkan event `issue.resolved` pada tipe domain, allowlist service integrasi, serta pilihan konfigurasi webhook. Dispatcher, signing secret, dan retry yang sudah ada tetap dipakai tanpa secret baru di source/log.
- Menyalurkan perubahan status melalui `IssueDetailPage` → `useIssueStatus` → `issueService` → `issueRepository` → Supabase. Dialog resolved menerima link commit/PR opsional, service memvalidasi URL HTTPS, dan detail Issue menampilkan referensi perbaikannya.
- Menambahkan unit test service untuk normalisasi link HTTPS, penolakan non-HTTPS, dan preservasi referensi saat berpindah ke status selain resolved.
- Tidak menjalankan migration ke Supabase target, tidak menghapus data, tidak commit, dan tidak push.
- Verifikasi lulus: `cd frontend && npm run test -- --run src/services/issueService.test.ts` (15/15), `cd frontend && npm run build` (warning ukuran chunk Vite yang sudah ada), serta `cd frontend && npm run lint` (delapan warning existing di luar scope).
- `graphify update .` berhasil menyinkronkan knowledge graph menjadi 2.797 node dan 5.686 edge; warning tujuh source tanpa node tidak menggagalkan proses.

## 2026-08-01 — E2E-15 seleksi regression empat sinyal

- Menjalankan `graphify query` sebelum menelusuri alur regression dan mengikuti keputusan Section 11.7 serta traceability commit Section 10.5 `FEATURE_BACKLOG.md`.
- Memperluas `testmanager.automation.rerun_failed` melalui layering Tool → `AutomationService` → `AutomationRepository`/`RepoService` → Supabase/repository Git agar seleksi menjadi union Test Case tertaut langsung ke Issue, satu module/tag, satu requirement, dan automation script yang path-nya terdampak commit perbaikan.
- Menambahkan migration `schema_076_e2e15_regression_selection.sql` tanpa menjalankannya ke target. Konteks diff memakai commit terakhir yang PASS untuk Test Case dan repository yang sama, fallback ke commit run gagal, lalu commit perbaikan dari URL `/commit/<sha>` pada Issue.
- Hasil regression selalu Test Run baru, membawa repository serta commit perbaikan, mempertahankan ambang konfirmasi manusia, dan mencatat jumlah kandidat dari diff beserta base/head pada audit tanpa patch, kredensial, atau token.
- Menambahkan test service/repository untuk pemetaan rename path, fallback ketika referensi hanya PR, payload RPC, dan redaksi boundary existing. Dokumentasi MCP dan checklist scope diperbarui.
- Verifikasi lulus: `cd mcp && npm test` (20/20 test file, termasuk build TypeScript) dan `cd frontend && npm run build` (warning ukuran chunk Vite existing). Tidak menjalankan migration ke Supabase target, tidak menghapus data, tidak commit, dan tidak push.

## 2026-08-01 — E2E-16 enqueue Test Run regression dan safety gate

- Menjalankan `graphify query` sebelum menelusuri alur Issue resolved menuju regression dan mengikuti keputusan Section 11.7 `FEATURE_BACKLOG.md`.
- Memastikan `testmanager.automation.rerun_failed` hanya menerima Issue resolved dengan sumber Test Result FAIL, menjalankan safety gate sebelum mutasi, dan selalu melakukan `insert` Test Run baru tanpa memperbarui run lama.
- Memperbaiki cakupan enqueue agar seluruh Test Case aktif yang relevan dari empat sinyal E2E-15 disnapshot menjadi Test Result pada run baru, termasuk case tanpa automation script yang harus tetap tersedia untuk eksekusi manual; automation job hanya dibuat bagi case yang mempunyai mapping script.
- Ambang aman tetap dapat dikonfigurasi melalui `TM_MCP_RERUN_FAILED_MAX_TESTS` (default 25). Jika jumlah test melampaui ambang, tidak ada run/job yang dibuat sampai anggota project approved memberikan `confirmed_by` bersama `explicit_confirmation: true`; identitas dan keputusan dicatat pada audit log.
- Memperbarui dokumentasi MCP dan menandai dua butir E2E-16 Section 11.7 selesai. Migration tidak dijalankan ke Supabase target; tidak menghapus data, commit, push, atau mencatat secret/token.
- Verifikasi lulus: `cd mcp && npm test` (20/20 test file, termasuk build TypeScript), `cd frontend && npm run build` (warning ukuran chunk Vite existing), dan `git diff --check`.
- `graphify update .` berhasil menyinkronkan knowledge graph menjadi 2.805 node dan 5.703 edge; warning tujuh source tanpa node tidak menggagalkan proses.

## 2026-08-01 — E2E-17 verifikasi hasil regression

- Menjalankan `graphify query`/`graphify path` sebelum menelusuri alur regression dan mengikuti keputusan Section 11.8 `FEATURE_BACKLOG.md`.
- Menambahkan tool `testmanager.automation.verify_regression` melalui layering Tool → `AutomationService` → `AutomationRepository` → RPC Supabase, dengan validasi UUID pada service dan token tetap hanya berada di request body repository.
- Menambahkan migration `schema_077_e2e17_regression_verification.sql` tanpa menjalankannya ke target. RPC hanya menerima Test Run completed yang tercatat dibuat oleh `automation.rerun_failed` untuk Issue yang sama dan hasil direct Test Case PASS/FAIL.
- PASS mengubah Issue resolved menjadi `verified`, menyimpan FK `verified_test_run_id` ke Test Run pembuktian, dan mencatat aksi agent beserta run/result pada audit log. Detail Issue menampilkan tautan internal ke run tersebut melalui mapper dan repository yang ada.
- FAIL membuka kembali Issue menjadi `open` dan menambah komentar atomik berisi Test Result, actual/notes, bundle artifact lama dan baru, serta hasil perbandingan. Aksi dan comment ID juga masuk audit log.
- Menambahkan test repository, service, katalog tool, dan kontrak migration. Tidak menjalankan migration ke Supabase target, tidak menghapus data, tidak commit/push, dan tidak mencatat secret/token.
- Verifikasi lulus: `cd mcp && npm test` (20/20 test file), `cd frontend && npm run build` (warning ukuran chunk Vite existing), dan `git diff --check` untuk file scope.
- `graphify update .` berhasil menyinkronkan knowledge graph menjadi 2.811 node dan 5.712 edge; warning tujuh source tanpa node tidak menggagalkan proses.

## 2026-08-01 — E2E-18 audit agent dan override manusia untuk verified

- Menjalankan `graphify query` sebelum menelusuri alur verifikasi regression, audit log, dan detail Issue, lalu mengikuti keputusan Section 11.8 `FEATURE_BACKLOG.md`.
- Menambahkan migration idempotent `schema_078_e2e18_agent_verification_audit.sql` tanpa menjalankannya ke target: `audit_logs.actor_type` membedakan aksi `human`, `agent`, dan `system`; audit MCP dengan penanda `agent_action` diklasifikasikan sebagai agent, termasuk backfill event yang sudah ada.
- Menampilkan actor `AI Agent` beserta badge `AGENT` pada Activity Panel, melalui mapping Repository → Service → Hook → Component yang sudah ada.
- Mempertahankan override status pada detail Issue untuk anggota yang berwenang, menambahkan keterangan eksplisit ketika Issue berstatus verified, dan membersihkan `verified_test_run_id` melalui Page → Hook → Service → Repository ketika manusia memilih status selain verified agar tautan pembuktian lama tidak tersisa.
- Menambahkan unit test service yang membuktikan override manusia ke `open` meneruskan pembersihan tautan run pembuktian. Tidak menjalankan migration ke Supabase target, tidak menghapus data, tidak commit/push, dan tidak mencatat secret/token.
- Verifikasi lulus: `cd frontend && npm run test -- --run src/services/issueService.test.ts` (16/16) dan `cd frontend && npm run build` (warning ukuran chunk Vite existing).
- `graphify update .` berhasil menyinkronkan knowledge graph menjadi 2.817 node dan 5.718 edge; warning tujuh source tanpa node tidak menggagalkan proses.
- Percobaan ulang gate driver: memperbarui test mapper audit agar memverifikasi `actorType` eksplisit untuk agent serta fallback human/system, lalu mengulang seluruh verifikasi E2E-18.

## 2026-08-01 — E2E-19 panel siklus QA loop dashboard

- Menjalankan `graphify query` dan `graphify explain/path` sebelum menelusuri dashboard, audit regression, dan keputusan Section 11.8 `FEATURE_BACKLOG.md`.
- Menambahkan panel "Siklus QA loop" pada dashboard reporting yang menampilkan jumlah Issue unik masuk selective regression, jumlah terverifikasi, jumlah reopen, dan reopen rate (Issue unik reopened dibagi Issue unik masuk loop).
- Data mengalir lengkap melalui Page → Hook existing → `dashboardReportService` → `dashboardReportRepository` → Supabase. Repository membaca audit `mcp.automation.rerun_failed` dan `mcp.automation.verify_regression`, lalu mapper mengubah row ke domain camelCase.
- Memperluas query dashboard agar custom selective regression Test Run (tanpa Test Plan) ikut tercakup, serta menerapkan filter dashboard yang sama pada metrik QA loop.
- Menambahkan unit test untuk mapping audit/custom run, deduplikasi Issue, pembatasan berdasarkan run terfilter, denominator reopen rate, dan kondisi kosong. Tidak menjalankan migration ke Supabase target, tidak menghapus data, tidak commit/push, dan tidak mencatat secret/token.
- Verifikasi lulus: `cd frontend && npm run test -- --run src/services/dashboardReportService.test.ts src/helpers/mappers.test.ts` (45/45), `cd frontend && npm run build` (warning ukuran chunk Vite existing), dan `git diff --check`.
- `graphify update .` dicoba tetapi watcher ditolak sandbox (`Operation not permitted`); fallback resmi `graphify extract . --code-only` berhasil menyinkronkan AST graph menjadi 2.822 node dan 5.241 edge tanpa API atau secret.
- Pada percobaan ulang verifikasi driver, `graphify update .` berhasil penuh dan menyinkronkan knowledge graph menjadi 2.825 node dan 5.733 edge; warning tujuh source tanpa node tidak menggagalkan proses.
## 2026-08-01 — ADM-01 Scheduled Test Run

- Menambahkan migration `schema_079_adm01_scheduled_test_runs.sql`: tabel jadwal per Test Plan, RLS project-scoped, rekonsiliasi due schedule berbasis `pg_cron` tiap menit, pembuatan snapshot Test Run/results, dan enqueue automation job tanpa menjalankan browser di server.
- Jadwal yang terlewat saat sistem/runner offline hanya menghasilkan satu catch-up run; job tetap queued dan diambil Local Runner saat online.
- Menambahkan domain mapper, repository, service, hook, serta tab Schedule pada detail Test Plan untuk waktu mulai, interval hari, environment, browser/device, retry, pause-on-failure, status aktif, dan penghapusan jadwal.
- Menandai Scheduled Test Run selesai pada Section 5 `FEATURE_BACKLOG.md`.
- Verifikasi: `cd frontend && npm run build` lulus. Migration tidak dijalankan ke Supabase target sesuai instruksi.
- `graphify update .` sudah dicoba tetapi gagal pada watcher dengan `Operation not permitted`; tidak ada source code yang gagal dibangun akibat warning ini.
- Percobaan ulang gate driver: daftar laporan dibatasi ke berkas ADM-01 yang benar-benar berubah menurut Git. Audit tambahan memperbaiki perhitungan catch-up agar tidak melewati interval berikutnya, menjaga `created_by` jadwal selalu valid untuk FK job, memvalidasi kesamaan project pada Test Plan/environment, dan membuat policy migration aman dijalankan ulang.
- Verifikasi ulang lulus: `cd frontend && npm test -- --run src/helpers/mappers.test.ts` (44/44), `cd frontend && npm run build`, dan `cd frontend && npm run lint` (delapan warning existing di luar scope).
- `graphify update .` kemudian berhasil menyinkronkan knowledge graph menjadi 2.838 node dan 5.765 edge; warning tujuh source tanpa node tidak menggagalkan proses.

## 2026-08-01 — ADM-02 pembatasan eksekusi dan secret management runner

- Menjalankan `graphify query` sebelum menelusuri runner dan mengikuti keputusan keamanan Section 5, 14.4, 16, dan 17 `FEATURE_BACKLOG.md`.
- Menambahkan trust repository fail-closed melalui `TM_TRUSTED_REPOSITORIES`; root Git harus dipercaya eksplisit, sedangkan `script_ref` absolut, traversal, file hilang, dan symlink keluar workspace ditolak sebelum Playwright dijalankan.
- Membatasi executable runner pada invocation Playwright resmi yang diizinkan dan menolak command/wrapper arbitrer, termasuk mode polling dan interaktif.
- Memisahkan credential runner/repository dari environment child Playwright, mewajibkan permission `0600` untuk `.env` pada POSIX, serta meredaksi nilai environment sensitif dan bentuk Base64-nya pada logger, live output lintas chunk, artifact log, error, dan crash fatal.
- Memperbarui `.env.example`, README runner, fixture test repository, dan checklist ADM-02. Tidak menjalankan migration, menghapus data, commit, push, atau mencatat nilai secret/token.
- Verifikasi: `cd runner && npm test` lulus (9/9 berkas test, termasuk build TypeScript).

## 2026-08-01 — ADM-02 percobaan ulang gate verifikasi

- Menutup jalur environment secret pada mode Playwright `ui`, `debug`, `watch`, dan `codegen`; seluruh child process kini memakai environment tersaring dan parser allowlist yang sama dengan job polling.
- Menerapkan trust root repository yang sama sebelum mode interaktif maupun codegen memuat konfigurasi Playwright.
- Menambahkan test keamanan khusus untuk exact repository trust, penolakan symlink `script_ref` keluar repo, penolakan shell injection pada command, redaksi secret lintas chunk, serta pemisahan secret dari child environment.
- Verifikasi ulang lulus: `cd runner && npm test` (10/10 berkas test, termasuk build TypeScript).
- Sanity check `cd frontend && npm run build` lulus dengan warning ukuran chunk existing; `graphify update .` berhasil menyinkronkan graph menjadi 2.857 node dan 5.840 edge.
## 2026-08-01 — ADM-03 permission granular per project

- Menambahkan migration manual `schema_080_adm03_granular_permissions.sql` (tidak dijalankan ke Supabase target): kolom JSONB permission per anggota, preset berdasarkan role, helper RLS `has_project_permission`, serta kompatibilitas helper policy project yang sudah ada.
- Menambahkan domain, mapper, repository, service, dan hook untuk membaca serta mengubah permission `view`, `create`, `update`, `delete`, `import`, `export`, dan `run_automation` tanpa melompati layering.
- Menambahkan editor permission pada tab Anggota Project. Perubahan role mereset permission ke preset role; kombinasi permission tanpa `view` ditolak service.
- Mengaktifkan gate UI terpisah untuk import/export Test Case, export laporan dashboard, dan halaman/aksi automation. Admin tetap memiliki seluruh permission.
- Verifikasi lulus: `cd frontend && npm run build`; `cd frontend && npm run test -- --run` (15 file, 139 test). Build hanya memberi warning ukuran chunk yang sudah ada.
- Migration belum dan tidak dijalankan ke Supabase target sesuai instruksi task.

## 2026-08-01 — ADM-03 percobaan ulang gate verifikasi

- Memisahkan gate UI `create` dan `update` pada daftar Test Plan dan Test Case; permission membuat tidak lagi membuka aksi edit, dan permission mengubah tidak lagi membuka tombol membuat.
- Memperketat kontrak JSONB permission pada migration agar tepat tujuh key boolean yang didukung, memisahkan policy RLS create/update untuk entity utama, dan menambahkan enforcement `run_automation` pada insert/update job untuk caller frontend terautentikasi tanpa mengganggu runner non-user.
- Migration tetap hanya berupa file SQL dan tidak dijalankan ke Supabase target.
- Verifikasi ulang lulus: `cd frontend && npm run build` dan `cd frontend && npm run test -- --run` (15 file, 139 test). Build hanya memberi warning ukuran chunk existing.

## 2026-08-01 — ADM-04 Team management

- Menambahkan migration manual `schema_081_adm04_team_management.sql` (tidak dijalankan ke Supabase target): tabel `teams`, `team_members`, dan `project_teams`, RLS admin/project-manager, serta perluasan `has_project_permission` agar permission direct dan team digabung secara OR.
- Menambahkan layer lengkap Team dan akses Team per Project: domain, mapper, repository, service, hook, halaman admin Team Management, halaman pengaturan akses team Project, route, dan menu.
- Role akses team memakai preset permission project ADM-03; penghapusan team melepaskan seluruh akses Project melalui foreign key cascade.
- Verifikasi lulus: `cd frontend && npm test -- --run` (15 file, 141 test), `cd frontend && npm run build` (warning ukuran chunk Vite existing), dan `git diff --check` untuk seluruh file ADM-04. Migration tidak dijalankan, data tidak dihapus, serta tidak ada commit/push atau secret/token yang dicatat.
- `graphify update .` berhasil menyinkronkan knowledge graph menjadi 2.900 node dan 5.958 edge; warning tujuh source tanpa node tidak menggagalkan update.

## 2026-08-01 — ADM-04 Team management (perbaikan gate verifikasi)

- Mengaudit ulang scope ADM-04 melalui Graphify dan Section 6 `FEATURE_BACKLOG.md`, tanpa menjalankan migration ke Supabase target.
- Menutup celah akses user yang hanya menjadi anggota Project melalui Team: migration kini menyediakan `get_my_project_access` yang menggabungkan role dan permission direct + seluruh Team, dan repository frontend mengonsumsi effective access tersebut.
- Menyamakan otorisasi pengelolaan Project untuk Team ber-role manager, membuat penggantian anggota Team atomik melalui RPC `set_team_members`, serta menambahkan perubahan role/preset permission akses Team yang sudah terpasang pada Project.
- Menambahkan penanganan error UI dan unit test service untuk normalisasi input, deduplikasi anggota, preset role saat menambah Team, dan perubahan role akses Team.
- Verifikasi lulus: `cd frontend && npm run test -- --run src/services/teamService.test.ts src/helpers/mappers.test.ts` (2 file, 51 test), `cd frontend && npm run build`, dan pemeriksaan diff scope ADM-04. Build hanya memberi warning ukuran chunk Vite yang sudah ada; tidak ada migration target, penghapusan data, commit, push, atau secret/token.

## 2026-08-01 — ADM-05 Activity feed per Project

- Menelusuri alur audit log dan Project melalui Graphify serta mengikuti scope Section 6 `FEATURE_BACKLOG.md`.
- Menuntaskan timeline Activity pada detail Project memakai `audit_logs` yang sudah ada melalui layer repository → service → hook → component; tidak menambah atau menjalankan migration.
- Menambahkan kontrak URL tab `activity`, state loading/error/retry, identitas actor human/agent/system, dan ringkasan perubahan status dari snapshot `old_data`/`new_data` audit.
- Service memvalidasi Project dan membatasi ukuran feed 1–100 entri; mapper dan unit test diperbarui untuk payload audit.
- Verifikasi lulus: `cd frontend && npm run build`; `cd frontend && npm test -- --run src/helpers/mappers.test.ts` (46/46); `cd frontend && npm run lint` (delapan warning existing di luar scope).
- `graphify update .` berhasil menyinkronkan knowledge graph menjadi 2.906 node dan 5.968 edge; warning tujuh source tanpa node tidak menggagalkan update.

## 2026-08-01 — ADM-06 Notification center

- Menelusuri notification center melalui Graphify dan mengikuti scope Section 6 `FEATURE_BACKLOG.md`.
- Menambahkan migration manual `schema_082_adm06_notification_center.sql` (tidak dijalankan ke Supabase target) untuk notifikasi assignment Test Case/Test Run, perubahan status terkait, dan hasil terminal automation; notifikasi tetap recipient-scoped oleh RLS yang sudah ada.
- Memperluas domain, mapper, repository, service, hook, dan panel notifikasi dengan target navigasi baru, ikon per jenis, serta invalidasi cache melalui Supabase Realtime di samping polling fallback.
- Verifikasi: `cd frontend && npm run build` lulus dengan warning ukuran chunk existing; unit test mapper sempat mendeteksi expected shape lama lalu diperbarui sesuai kontrak domain baru.
- `graphify update .` sudah dijalankan tetapi rebuild ditolak environment dengan `Operation not permitted`; source code dan migration tetap dapat diverifikasi secara lokal.
- Gate akhir percobaan ulang lulus: `npm run build`, mapper test 46/46, dan `npm run lint` (delapan warning existing di luar scope); checklist Notification center di `FEATURE_BACKLOG.md` ditandai selesai.
- Percobaan ulang `graphify update .` berhasil menyinkronkan graph menjadi 2.911 node dan 5.974 edge; warning tujuh source tanpa node tidak menggagalkan update.
## 2026-08-01 — ADM-07 Observability dan monitoring

- Menambahkan migration `schema_083_adm07_observability.sql`: tabel error operasional dengan RLS admin, redaksi credential, trigger kegagalan automation/webhook, serta RPC health check worker, queue, Storage, dan integrasi.
- Menambahkan alur frontend lengkap domain/mapper → repository → service → hook → halaman admin `/admin/observability`, termasuk ringkasan health, filter, pencarian log, dan menu khusus admin.
- Migration tidak dijalankan ke Supabase target sesuai batasan task.
- Verifikasi: `npm run build` lulus; `npm run lint` lulus dengan warning lama di luar scope (warning hook observability sudah diperbaiki); `git diff --check` lulus; `graphify update .` dijalankan.
- Gate percobaan ulang menambahkan coverage untuk kedua mapper observability; `npm test -- --run src/helpers/mappers.test.ts` lulus 48/48 setelah invariant daftar ekspor diperbarui.

## 2026-08-01 — ADM-08 Backup/restore binary Storage

- Melengkapi backup Project format versi 2 dengan payload base64 object binary dari bucket privat `test-attachments` dan `issue-attachments`; secret, token, dan credential tetap tidak masuk backup.
- Restore memvalidasi bucket, path, MIME type, ukuran, base64, duplikasi, dan kecocokan dengan metadata attachment sebelum memulihkan metadata lalu mengunggah object yang belum ada. Backup metadata-only versi 1 tetap kompatibel.
- Mempertahankan layering: page memakai service, service mengorkestrasi metadata dan binary, repository menjadi satu-satunya akses RPC serta Supabase Storage. Tidak ada migration yang ditambahkan atau dijalankan ke target.
- Verifikasi lulus: `cd frontend && npm test -- --run src/services/backupRetentionService.test.ts src/helpers/mappers.test.ts` (2 file, 52 test), `cd frontend && npm run build`, dan `git diff --check`. Build hanya memberi warning ukuran chunk existing.
- Gate percobaan ulang memperketat kontrak backup: hanya format resmi versi 1/2 yang diterima, versi 1 wajib metadata-only, versi 2 wajib membawa tepat satu binary (maksimal 10 MB) untuk setiap metadata attachment. Unit test regresi ditambahkan untuk versi asing dan binary v2 yang tidak lengkap.
- Verifikasi ulang lulus: unit test service + mapper 54/54, `npm run build`, dan `git diff --check`; build hanya memberi warning ukuran chunk existing. `graphify update .` berhasil menyinkronkan graph menjadi 2.947 node dan 6.054 edge dengan warning tujuh source tanpa node.

## 2026-08-01 — AGENT-01 kontrak adapter agent-core

- Menambahkan paket TypeScript bersama `packages/agent-core` dengan nol runtime dependency dan output ESM beserta declaration.
- Mendefinisikan serta mendokumentasikan kontrak `TransportAdapter`, `ExecutorAdapter`, `ArtifactStorageAdapter`, `AuthAdapter`, dan `RepoAdapter` sesuai Section 14.1 `FEATURE_BACKLOG.md`; belum menambahkan implementasi provider.
- Kontrak menjaga secret tetap di boundary auth, hasil eksekusi dan transport tetap provider-agnostic, artifact memakai binary Web API netral, serta akses repository memiliki lifecycle prepare/read/release dan kewajiban workspace containment.
- Verifikasi lulus: `npm run build`, `npm run typecheck`, dan `git diff --check -- packages/agent-core`. Lockfile dibuat secara offline; tidak ada migration, perubahan data, commit, push, atau secret/token.

## 2026-08-01 — AGENT-02 Supabase RPC transport

- Mengimplementasikan `SupabaseRpcTransport` dan `SupabaseRpcError` di `packages/agent-core` sebagai satu-satunya boundary HTTP untuk Supabase PostgREST RPC runner.
- Merefactor `runner/src/api.ts` agar seluruh operasi automation RPC didelegasikan melalui `TransportAdapter`, dengan format URL, header anon, payload, parsing respons, dan error/status yang tetap kompatibel.
- Menambahkan dependency lokal runner ke `@testmanager/agent-core` dan test regresi untuk delegasi RPC, format request Supabase, serta normalisasi error dengan body maksimum 300 karakter.
- Verifikasi lulus: build dan typecheck `packages/agent-core`; build, typecheck, dan 11 test runner. Pemeriksaan source memastikan endpoint `/rest/v1/rpc` dan pemanggilan `fetch` RPC hanya berada di implementasi adapter. Tidak ada migration, perubahan data, commit, push, atau secret/token.
- Gate percobaan ulang lulus dengan hasil yang sama; `git diff --check` bersih dan `graphify update .` mengonfirmasi tidak ada perubahan topologi graph. Daftar serah-terima dibatasi hanya ke berkas AGENT-02 yang benar-benar disentuh.

## 2026-08-01 — AGENT-03 MCP memakai TransportAdapter bersama

- Merefactor seluruh repository di `mcp/` agar RPC, autentikasi, penandatanganan artifact, dan AI gateway didelegasikan melalui satu instance `TransportAdapter` dari `packages/agent-core`; tidak ada pemanggilan Supabase/`fetch` langsung tersisa di source runtime MCP.
- Memperluas request transport dengan jenis operasi `rpc`/`function`, sehingga `SupabaseRpcTransport` tetap menjadi satu-satunya boundary HTTP untuk PostgREST RPC maupun Supabase Edge Functions.
- Menambahkan dependency workspace lokal `@testmanager/agent-core` pada MCP dan memperbarui test agar seluruh mock HTTP juga melewati implementasi adapter yang sama.
- Verifikasi lulus: build dan typecheck `packages/agent-core`; build serta seluruh 20 test MCP; audit source runtime MCP tidak menemukan `fetch`, endpoint Supabase, header `apikey`, atau pemanggilan client Supabase di luar adapter.
- Tidak ada migration yang dijalankan, data yang diubah, secret/token yang dicatat, commit, atau push.

## 2026-08-01 — AGENT-04 ExecutorAdapter dan PlaywrightLocalExecutor

- Membuat kontrak `ExecutorAdapter` bersama mendukung tipe request/result implementasi tanpa mengikat pemanggil pada detail Playwright maupun cloud executor tertentu.
- Memindahkan seluruh logika eksekusi Playwright lokal dari `runner/src/executor.ts` ke `PlaywrightLocalExecutor`, termasuk validasi path/target/mode, base URL sanity check, spawn CLI, live log dan step command, timeout, redaksi log, pengumpulan artifact, serta cancel proses aktif.
- Menginjeksi `RunnerExecutorAdapter` ke `Runner` dengan `PlaywrightLocalExecutor` sebagai default, sehingga implementasi executor dapat diganti tanpa mengubah siklus polling/reporting runner.
- Menambahkan test untuk penolakan script di luar repository dan idempotensi cancel job yang tidak aktif.
- Verifikasi lulus: build `packages/agent-core`; build dan seluruh 12 test runner. Tidak ada migration, perubahan data target, commit, push, atau secret/token.

## 2026-08-01 — AGENT-05 ArtifactStorageAdapter dan SupabaseStorageAdapter

- Mengimplementasikan `SupabaseStorageAdapter` untuk signing melalui Edge Function dan upload signed URL Supabase Storage di balik kontrak bersama `ArtifactStorageAdapter`.
- Merefactor `runner/src/upload.ts` menjadi orkestrator provider-agnostic yang hanya membaca file, menentukan MIME type, memanggil adapter, dan memetakan descriptor ke payload report.
- Menginjeksi artifact storage ke `Runner`, dengan `SupabaseStorageAdapter` sebagai default, sehingga provider storage dapat diganti tanpa mengubah siklus eksekusi/reporting.
- Menambahkan test delegasi upload dan test implementasi Supabase untuk signing, PUT binary, metadata descriptor, serta respons signing invalid.
- Verifikasi lulus: `cd runner && npm run build && npm test` (13/13 test). Tidak ada migration, perubahan data target, commit, push, atau secret/token.
- Gate percobaan ulang lulus untuk build dan typecheck `packages/agent-core`, typecheck runner, seluruh 13 test runner, serta `git diff --check`. `graphify update .` sudah dijalankan, tetapi rebuild watcher ditolak environment dengan `Operation not permitted`; source graph tidak diubah oleh percobaan tersebut.

## 2026-08-01 — AGENT-06 AuthAdapter dan RunnerTokenAuth

- Mengimplementasikan `RunnerTokenAuth` tanpa runtime dependency di `packages/agent-core`, dengan proof RPC yang terenkapsulasi, identity aman untuk log/telemetri, validasi input, serta invalidasi credential dalam memori.
- Memperluas auth context dan `SupabaseRpcTransport` agar credential body digabungkan di boundary transport, sehingga caller runner/MCP tidak lagi menyisipkan token secara manual ke payload operasi.
- Merefactor runner `AutomationApi` dan autentikasi MCP agar memakai implementasi `AuthAdapter` yang sama tanpa mengubah format `p_token` maupun mekanisme validasi/pencabutan server yang sudah ada.
- Menambahkan unit test untuk kerahasiaan identity dan invalidasi token, serta memperbarui test integrasi runner/MCP. Tidak ada secret yang dicatat, migration yang dijalankan, perubahan data target, commit, atau push.
- Verifikasi lulus: seluruh test `packages/agent-core` (1 suite), runner (13 suite), dan MCP (20 suite); `cd frontend && npm run build`; serta `git diff --check` untuk berkas scope. Build frontend hanya memberi warning ukuran chunk existing.
- `graphify update .` berhasil menyinkronkan knowledge graph menjadi 3.077 node dan 6.241 edge; warning tujuh source tanpa node tidak menggagalkan update.

## 2026-08-01 — AGENT-07 RepoAdapter bersama untuk runner dan MCP

- Mengimplementasikan `LocalPathRepo` dan `GitCloneRepo` di `packages/agent-core` berdasarkan kontrak `RepoAdapter`, termasuk validasi root Git/path absolut, containment workspace, operasi list/read, cache clone, checkout/update deterministik, dan URL HTTP(S) tanpa credential.
- Memusatkan pembuatan header autentikasi Git di `GitCloneRepo`; credential di-resolve saat runtime dan tidak dimasukkan ke URL maupun argumen command.
- Merefactor persiapan repository runner dan repository MCP untuk memakai implementasi adapter bersama tersebut, sehingga duplikasi validasi URL, clone/update, cache, dan auth Git di kedua proses dihapus tanpa mengubah kontrak tool `repo.*`.
- Menambahkan test adapter untuk containment dan kerahasiaan credential, serta menyesuaikan test runner dengan strategi fetch/reset bersama.
- Verifikasi lulus: seluruh test `packages/agent-core` (2 suite), runner (13 suite), dan MCP (20 suite). Tidak ada migration, perubahan data target, commit, push, atau secret/token yang dicatat.

## 2026-08-01 — AGENT-08 konfigurasi runner dan MCP bersama

- Menambahkan satu allow-list dan skema env `TM_*`, loader `.env`, serta validator bersama di `packages/agent-core`; validator menolak nama `TM_*` yang tidak dikenal dan nilai invalid dengan pesan yang menyebut variabel terkait.
- Merefactor konfigurasi runner dan MCP agar keduanya memakai `loadAgentEnv()` yang sama. Perintah runner interaktif tetap tidak membutuhkan credential server, tetapi seluruh nilai yang diberikan tetap divalidasi.
- Mempertahankan prioritas environment proses terhadap file `.env` dan pemeriksaan permission private untuk file konfigurasi tanpa menambah runtime dependency.
- Menambahkan test skema bersama dan regresi typo env pada MCP. Tidak ada migration, perubahan data target, secret/token, commit, atau push.
- Verifikasi lulus: seluruh test `packages/agent-core` (3 suite), runner (13 suite), dan MCP (20 suite).

## 2026-08-01 — AGENT-09 logging terpadu dan redaksi rahasia terpusat

- Menambahkan logger bersama di `packages/agent-core` dengan format konsisten, registry rahasia terpusat, sanitasi object/Error/circular value, URL berkredensial, header autentikasi, nilai base64, dan stream lintas chunk.
- Merefactor runner agar logger serta redaksi output Playwright memakai implementasi bersama; memasang boundary crash global untuk `uncaughtException` dan `unhandledRejection` agar error fatal ikut di-mask.
- Menambahkan logger MCP ke stderr agar tidak merusak protokol stdio, registrasi kredensial repo saat di-resolve, sanitasi envelope respons/error tool, serta penanganan startup dan crash global melalui boundary yang sama.
- Menambahkan test yang membuktikan runner token, bootstrap code, dan kredensial repository tidak muncul pada log normal, metadata, error/crash, base64, field sensitif, maupun stream terpotong.
- Verifikasi lulus: seluruh test `packages/agent-core` (4 suite), runner (13 suite), dan MCP (20 suite). Tidak ada migration, perubahan data target, commit, push, atau secret/token yang dicatat.
- Gate percobaan ulang menambahkan regresi pada envelope MCP untuk membuktikan runner token, bootstrap code, dan kredensial repository selalu teredaksi sebelum serialisasi respons. Verifikasi akhir lulus: agent-core 4/4, runner 13/13, MCP 20/20, build frontend, dan `git diff --check` pada berkas AGENT-09.
## 2026-08-01 — AGENT-10 heartbeat dan versioning Local Agent

- Menambahkan kontrak `AgentHeartbeatPayload` terpusat di `@testmanager/agent-core` dengan identitas tunggal `testmanager-agent`, versi `0.1.0`, proses asal, dan capabilities.
- Runner dan MCP kini memakai RPC `heartbeat_local_agent` dengan bentuk payload yang sama; MCP mengirim heartbeat periodik dan runner tetap memperbarui status automation runner melalui RPC baru.
- Menambahkan `schema_084_agent10_unified_heartbeat.sql` untuk validasi payload/token runner atau API token serta penyimpanan telemetri kedua proses di `local_agent_heartbeats`. Migration tidak dijalankan ke target Supabase.
- Metadata versi MCP memakai konstanta rilis bersama; versi paket runner dan MCP diverifikasi sama-sama `0.1.0`.
- Verifikasi lulus: test `agent-core`, test runner, test MCP, pemeriksaan kesamaan versi paket, dan build frontend.
- `graphify update .` sudah dijalankan sesuai aturan, tetapi rebuild watcher ditolak environment dengan `Operation not permitted`; kegagalan sinkronisasi graph ini tidak memengaruhi source atau hasil build/test.
- Percobaan ulang gate driver lulus: agent-core 4/4, runner 13/13, MCP 21/21, build frontend, kesamaan versi paket `0.1.0`, dan `git diff --check`; daftar serah-terima dibatasi pada berkas AGENT-10 yang benar-benar berubah menurut git.

## 2026-08-01 — BOOT-01 bootstrap code runner sekali pakai

- Menambahkan migration `schema_085_boot01_agent_bootstrap_codes.sql` untuk bootstrap code project-scoped yang hanya menyimpan hash SHA-256, kedaluwarsa default 10 menit, dan hanya dapat dipakai sekali.
- Menambahkan RPC `issue_agent_bootstrap_code` khusus anggota project serta `redeem_agent_bootstrap_code` untuk menukar code dengan runner token yang dibuat lokal; token mentah tidak disimpan atau dikembalikan oleh RPC redeem.
- Menambahkan RLS/grant minimum: anggota project dapat menerbitkan melalui RPC authenticated, sedangkan redeem tersedia untuk Local Agent melalui role `anon` dan mengunci code secara atomik sebelum membuat runner.
- Migration tidak dijalankan ke Supabase target dan tidak ada secret/token yang dicatat.
- Verifikasi statis lulus (`git diff --check` dan audit kontrak hash/expiry/RLS/redeem atomik). `graphify update .` sudah dijalankan, tetapi watcher environment menolak rebuild dengan `Operation not permitted`; tidak ada Supabase/Postgres lokal yang digunakan.
- Verifikasi ulang gate driver lulus: kontrak hash-only, expiry default 10 menit, project membership, penguncian redeem sekali pakai, dan penyimpanan hash runner token terdeteksi; `git diff --check` bersih. `graphify update .` berhasil menyinkronkan graph menjadi 3.139 node dan 6.344 edge.

## 2026-08-01 — BOOT-02 CLI bootstrap Local Runner

- Mengubah subcommand runner menjadi `init --code <CODE>` dan memvalidasi bentuk bootstrap code sekali pakai sebelum akses jaringan.
- Runner membuat token secara lokal, mendaftarkannya ke redactor, menukar bootstrap code melalui RPC `redeem_agent_bootstrap_code`, lalu menulis konfigurasi `.env` secara atomik dengan permission `0600`.
- Setelah konfigurasi tersimpan, runner mengirim heartbeat pertama melalui `heartbeat_local_agent`; output sukses hanya memuat nama runner dan project, tanpa bootstrap code atau runner token.
- Menambahkan test parser dan alur bootstrap yang memverifikasi urutan redeem → config → heartbeat, format token, permission file, dan tidak adanya secret pada stdout.
- Verifikasi lulus: `cd runner && npm test` (13/13 suite), `npm run typecheck`, dan `git diff --check` untuk berkas runner terkait. Tidak ada migration yang dijalankan, data target diubah, secret dicatat, commit, atau push.

## 2026-08-01 — BOOT-03 permission konfigurasi runner

- Memastikan bootstrap runner menulis `.env` dengan permission POSIX `0600` dan loader runner menolak konfigurasi yang memiliki bit akses group/world.
- Menambahkan regresi permission yang membuktikan konfigurasi `0600` diterima dan konfigurasi world-readable `0644` ditolak sebelum runner berjalan.
- Memperluas `.gitignore` bawaan runner agar `.env` dan seluruh varian `.env.*` diabaikan, dengan pengecualian eksplisit untuk template aman `.env.example`.
- Memperbarui checklist Section 14.4 untuk butir penyimpanan token lokal dan perlindungan `.env` yang kini lengkap.
- Verifikasi lulus: `cd runner && npm test` (13/13 suite), pemeriksaan aturan gitignore, dan `git diff --check`. Tidak ada migration, perubahan data target, secret/token, commit, atau push.
## 2026-08-01 — BOOT-04 trust repository lokal eksplisit

- Menjalankan `graphify query` sebelum menelusuri runner dan mengikuti keputusan Section 14.4 `FEATURE_BACKLOG.md`.
- Mengganti konfigurasi trust berbasis `TM_TRUSTED_REPOSITORIES` dengan subcommand eksplisit `tm-runner trust [repository-path]`; canonical root repository disimpan sekali di trust store lokal JSON berpermission `0600`.
- Runner tetap fail-closed: repository yang belum ada di trust store ditolak sebelum Playwright memuat konfigurasi, sedangkan `script_ref` absolut, traversal, file hilang, dan symlink keluar workspace tetap ditolak.
- Menambahkan override `TM_TRUST_STORE_PATH` untuk container/CI, dokumentasi alur clone remote, serta test persistensi, deduplikasi, permission, dan kondisi trust store kosong. Tidak menjalankan migration, menghapus data, commit, push, atau mencatat secret/token.
- Verifikasi lulus: `cd runner && npm test` (14/14 berkas test, termasuk build TypeScript) dan `git diff --check`; `graphify update .` berhasil menyinkronkan graph menjadi 3.157 node dan 6.373 edge dengan warning tujuh source tanpa node.

## 2026-08-01 — BOOT-05 peringatan eksplisit setup runner

- Menambahkan peringatan eksplisit pada output CLI bootstrap bahwa runner menjalankan kode dari repo yang ditautkan di mesin lokal dan Playwright mengeksekusi `playwright.config.ts` sebagai kode Node sebelum test berjalan.
- Menampilkan batas kepercayaan yang sama pada dialog pembuatan runner dan dialog penyimpanan token di UI Automation agar pengguna melihatnya selama setup.
- Menambahkan regresi CLI untuk memastikan kedua pesan keamanan selalu ditampilkan tanpa mengekspos bootstrap code atau runner token.
- Verifikasi lulus: `cd runner && npm test` (14/14 berkas test) dan `cd frontend && npm run build`. Build frontend tetap memunculkan warning ukuran chunk yang sudah ada; tidak ada migration, perubahan data target, secret/token, commit, atau push.

## 2026-08-01 — BOOT-06 pencabutan/rotasi token berlaku pada poll berikutnya

- Runner kini mengenali penolakan kredensial dari status HTTP autentikasi maupun marker `INVALID_RUNNER_TOKEN` yang dikembalikan RPC polling Supabase.
- Saat token dicabut, dirotasi, atau tidak valid pada poll, runner langsung menghentikan heartbeat dan loop polling, lalu keluar dengan pesan yang meminta operator menghubungkan ulang runner; error autentikasi tidak lagi di-retry tanpa batas.
- Menambahkan test regresi yang membuktikan penolakan token pada poll pertama hanya memanggil poll satu kali dan menghasilkan pesan berhenti yang jelas.
- Verifikasi lulus: `cd runner && npm test` (15/15 berkas test) dan `cd frontend && npm run build`; build frontend hanya menampilkan warning ukuran chunk yang sudah ada. `graphify update .` juga dijalankan dan tidak menemukan perubahan topologi graph. Tidak ada migration yang dijalankan, perubahan data target, secret/token, commit, atau push.

## 2026-08-01 — DIST-01 paket distribusi runner

- Mengubah identitas paket runner menjadi `@testmanager/runner` dan menambahkan allow-list tarball `files: ["dist"]`, executable `tm-runner`, batas Node.js `>=20`, publikasi scoped package berakses publik, serta build otomatis melalui `prepublishOnly`.
- Menyelaraskan metadata root pada `runner/package-lock.json` dengan metadata paket distribusi.
- Verifikasi lulus: build TypeScript, seluruh 15 test runner, dan `npm pack --dry-run --json`; tarball hanya berisi `package.json`, `README.md`, serta output `dist`, tanpa `.env`, log, test, example project, atau artifact runtime.

## 2026-08-01 — DIST-02 tarball dan endpoint rilis self-hosted

- Menambahkan `scripts/release-runner.mjs` untuk membangun runner dan `agent-core`, men-stage paket mandiri tanpa dependency runtime eksternal, lalu menghasilkan tarball, checksum SHA256, dan metadata `release.json` di aset publik frontend.
- Menambahkan halaman publik `/runner/install` melalui layering repository → service → hook → page; halaman menampilkan perintah instalasi berbasis origin instance, SHA256, serta tautan unduh tarball dan checksum.
- Artefak rilis diabaikan Git, dokumentasi runner dan checklist Section 14.3 diperbarui.
- Verifikasi lulus: `sha256sum -c`, audit isi bundled `@testmanager/agent-core`, instalasi global ke prefix sementara, `cd frontend && npm run build`, dan `npm run lint`. Lint hanya melaporkan warning lama; build hanya melaporkan warning ukuran chunk yang sudah ada. Tidak ada migration, akses Supabase target, secret/token, commit, atau push.
- `graphify update .` berhasil menyinkronkan graph setelah penambahan source; percobaan incremental terakhir setelah perubahan path route tidak menemukan topologi baru dan watcher ditolak environment dengan `Operation not permitted`.

## 2026-08-01 — DIST-03 kompatibilitas versi runner dan server

- Runner mengirim versi melalui payload heartbeat bersama dan kini membaca `server_version` serta `minimum_supported_runner_version` dari respons server.
- Menambahkan evaluasi versi tanpa dependency runtime: runner memperingatkan sekali per versi server bila tertinggal tetapi masih didukung, serta berhenti sebelum polling job bila versinya di bawah minimum.
- Menambahkan migration `schema_086_dist03_runner_version_compatibility.sql` yang mencatat matriks server 0.1.x → runner minimum 0.1.0 dan mengembalikan kebijakan tersebut dari heartbeat. Migration tidak dijalankan ke Supabase target.
- Menambahkan regresi kontrak API, klasifikasi kompatibilitas, validasi versi server, dan fail-closed sebelum polling.
- Verifikasi lulus: seluruh 16 berkas test runner, build TypeScript runner, dan build frontend; frontend hanya memunculkan warning ukuran chunk yang sudah ada. `graphify update .` berhasil menyinkronkan graph menjadi 3.202 node dan 6.445 edge.

## 2026-08-01 — DIST-04 networking Docker runner

- Memperbarui dokumentasi runner untuk menegaskan bahwa Docker ditujukan bagi mesin bersama/on-prem, sedangkan `npx` atau npm global tetap menjadi jalur default laptop tester sesuai Section 14.3.
- Mendokumentasikan bahwa `localhost` di dalam container menunjuk ke container sendiri, dengan `--network host` untuk Linux dan `host.docker.internal` untuk Docker Desktop saat aplikasi under test berjalan di host.
- Menyelaraskan contoh dan komentar `runner/Dockerfile` dengan panduan networking tersebut.
- Verifikasi lulus melalui `git diff --check`; `graphify update .` berhasil menyinkronkan graph menjadi 3.203 node dan 6.446 edge, dengan warning tujuh file non-source yang tidak menghasilkan node.

## 2026-08-01 — DIST-05 guard CI nol runtime dependency Local Agent

- Menambahkan workflow `.github/workflows/agent-runtime-dependencies.yml` yang menguji guard lalu menggagalkan CI jika `runner/package.json` atau `packages/agent-core/package.json` memiliki `dependencies`, `optionalDependencies`, `peerDependencies`, atau bundled dependencies.
- Memindahkan workspace package `@testmanager/agent-core` pada manifest runner ke `devDependencies`; proses release tetap membundel agent-core melalui `scripts/release-runner.mjs`, sehingga paket distribusi tidak mengunduh dependency eksternal saat runtime.
- Menambahkan `scripts/check-agent-runtime-dependencies.mjs` beserta unit test positif dan negatif, serta menandai keputusan Section 14.3 selesai di `FEATURE_BACKLOG.md`.
- Verifikasi lulus: unit test guard, eksekusi guard pada manifest nyata, 4 test agent-core, 16 test runner, build frontend, dan `git diff --check`. Build frontend hanya menghasilkan warning ukuran chunk yang sudah ada.

## 2026-08-01 — CONN-01 kerangka halaman Connect Agent

- Menambahkan route terlindungi `/projects/:id/connect`, tombol **Connect Agent** pada Project Detail dan Project Settings, serta halaman read-only dengan tab MCP aktif.
- Menampilkan API Token, Webhook, CI/CD, dan Runner sebagai tab disabled dengan alasan masing-masing; identitas project (ID, nama, dan URL) diambil secara project-scoped melalui layering Page → Hook → Service → Repository → Supabase.
- Tidak membuat token, mengubah data project, menjalankan migration, atau mencatat secret. Scope dibatasi ke Section 12.1; konfigurasi MCP lanjutan Section 12.2 tidak disertakan.
- Verifikasi lulus: `cd frontend && npm run build` dan `git diff --check`; build hanya menghasilkan warning ukuran chunk yang sudah ada. `graphify update .` berhasil menyinkronkan graph menjadi 3.219 node dan 6.478 edge, dengan warning tujuh source tanpa node.

## 2026-08-01 — CONN-01 verifikasi ulang

- Menyesuaikan label tab aktif menjadi **MCP (aktif)** sesuai Section 12.1 dan menandai seluruh checklist kerangka halaman yang sudah terpenuhi.
- Memastikan perubahan tetap terbatas pada route, halaman kerangka read-only, layering pengambilan konfigurasi project, dan tombol navigasi terkait.
- Verifikasi ulang lulus melalui `cd frontend && npm run build`; Vite hanya melaporkan warning ukuran chunk yang sudah ada.

## 2026-08-01 — CONN-02 panel konfigurasi MCP

- Menambahkan client selector MCP dengan **Claude Code** sebagai satu-satunya opsi aktif; Cursor, Claude Desktop, VS Code, dan Windsurf tetap terlihat dalam dropdown sebagai opsi disabled dengan badge **segera**.
- Menambahkan toggle mode read-only melalui Hook dan Service yang memetakan pilihan ke `TM_MCP_READONLY=0/1` tanpa menyimpan atau mengekspos secret, serta penghitung 24 tool baca pada mode read-only dan 42 tool saat tool tulis aktif sesuai registry MCP saat ini.
- Menambahkan unit test untuk pemetaan environment, hitungan tool, dan invariant bahwa hanya Claude Code yang aktif.
- Verifikasi lulus: unit test service (2 test), `npm run lint` tanpa error (warning existing tetap ada), `npm run build`, dan `git diff --check`. Build hanya melaporkan warning ukuran chunk yang sudah ada; `graphify update .` menyinkronkan graph menjadi 3.228 node dan 6.489 edge dengan warning tujuh source tanpa node. Tidak ada migration, akses Supabase target, commit, atau push.

## 2026-08-01 — CONN-02 verifikasi ulang gate driver

- Menandai checklist client selector dan read-only toggle pada Section 12.2 selesai setelah mengaudit implementasi terhadap registry MCP: 24 tool baca dan 18 tool tulis.
- Memastikan laporan perubahan hanya mencantumkan berkas CONN-02 yang benar-benar berbeda menurut Git; berkas kerangka CONN-01 tidak dilaporkan sebagai perubahan task ini.
- Verifikasi ulang lulus: 2 unit test service, lint tanpa error (delapan warning existing), build frontend, dan `graphify update .` yang menyinkronkan graph menjadi 3.229 node dan 6.490 edge dengan warning tujuh source tanpa node.

## 2026-08-01 — CONN-03 feature groups MCP

- Menambahkan multiselect chip untuk sembilan feature group MCP: DISCOVERY, TEST-CASE, TEST-PLAN, TEST-RUN, ISSUE, AUTOMATION, REPO, ANALYSIS, dan DOCS; AUTOMATION serta REPO tidak dipilih secara default.
- Memusatkan katalog 42 nama tool dan atribut read/write di service agar penghitung live dan preview selalu mengikuti kombinasi group serta mode read-only yang dipilih.
- Menambahkan peringatan saat jumlah tool aktif melewati ambang 30 dan panel preview nama tool yang dapat dilipat, termasuk empty state ketika tidak ada group dipilih.
- Menambah regresi unit untuk hitungan pilihan standar, seluruh registry, serta penyaringan tool tulis dalam mode read-only. Verifikasi lulus: 4 unit test service dan `cd frontend && npm run build`; build hanya melaporkan warning ukuran chunk yang sudah ada. Tidak ada migration, akses Supabase target, secret/token, commit, atau push.

## 2026-08-01 — CONN-04 langkah setup dan perintah siap salin

- Menambahkan tiga langkah bernomor untuk Add MCP server, Authenticate, dan Install Agent Skills opsional, lengkap dengan tombol **Copy** per langkah dan **Copy semua**.
- Memusatkan pembentukan perintah setup di `projectConnectionService`; command Add MCP otomatis memuat project scope, mode read-only, feature groups terpilih, dan endpoint MCP tanpa memasukkan token/secret.
- Menampilkan catatan autentikasi terminal serta blok command berformat `pre` yang mempertahankan isi utuh dan dapat di-scroll horizontal.
- Menambahkan regresi unit untuk regenerasi header read-only dan feature groups. Verifikasi lulus: 5 unit test service, `cd frontend && npm run build`, dan `git diff --check`; build hanya melaporkan warning ukuran chunk yang sudah ada. Tidak ada migration, akses Supabase target, secret/token, commit, atau push.

## 2026-08-01 — CONN-05 TestManager Agent Skills pack

- Menambahkan skill pack versi `1.0.0` di `skills/` dengan empat skill: `testmanager-workflow`, `testmanager-authoring`, `testmanager-triage`, dan `testmanager-regression`, masing-masing dilengkapi metadata agent.
- Mendokumentasikan invariant domain dan bootstrap Local Runner yang aman, pedoman authoring Test Case, triage bundle bukti menjadi Issue actionable, serta regression selektif dengan gate konfirmasi manusia.
- Menambahkan manifest versi dan dua jalur pemasangan: `npx skills add` atau menyalin skill terpilih ke `.claude/skills/`; tidak ada secret/token yang dicatat.
- Verifikasi lulus: keempat folder lolos `quick_validate.py`, manifest valid JSON, tidak ada placeholder TODO, `git diff --check` bersih, dan `cd frontend && npm run build` berhasil dengan warning ukuran chunk yang sudah ada. `graphify update .` menyinkronkan graph menjadi 3.273 node dan 6.532 edge dengan warning tujuh source non-skill tanpa node.

## 2026-08-01 — CONN-06 panel Prompt starter

- Menambahkan panel berisi lima prompt siap salin: generate Test Case dari requirement, analisis Test Run terakhir, triage Issue terbuka, pemilihan regression untuk Issue resolved, dan audit coverage requirement.
- Menyimpan katalog prompt sebagai data terpisah dari komponen; service mengisi nama/ID project serta daftar module dan environment yang diambil melalui repository project-scoped.
- Menambahkan tombol **Copy prompt** per item dan regresi unit untuk kelengkapan kategori, interpolasi seluruh konteks, serta ketiadaan placeholder tersisa. Fitur prompt custom per project tetap opsional dan tidak dimasukkan ke scope tahap ini, sehingga tidak ada migration atau penyimpanan baru.
- Verifikasi lulus: `cd frontend && npm run build` dan unit test service; build hanya melaporkan warning ukuran chunk yang sudah ada. Tidak ada akses Supabase target, secret/token, commit, atau push.

## 2026-08-01 — CONN-06 verifikasi ulang gate driver

- Mengaudit ulang panel Prompt starter terhadap Section 12.5 dan memastikan lima kategori wajib berasal dari katalog data terpisah, diinterpolasi dengan konteks project, module, dan environment, serta memiliki aksi **Copy prompt** per item.
- Memastikan laporan retry dibatasi pada berkas implementasi CONN-06 yang benar-benar berbeda menurut Git dan tidak memasukkan berkas navigasi atau kerangka koneksi dari task sebelumnya.
- Verifikasi ulang lulus: 6 unit test `projectConnectionService` dan `cd frontend && npm run build`; build hanya melaporkan warning ukuran chunk yang sudah ada.

## 2026-08-01 — CONN-07 bootstrap runner satu perintah

- Menambahkan prompt starter **Pasang & sambungkan runner** yang menerbitkan bootstrap code project-scoped BOOT-01 hanya saat diminta dan menghasilkan satu perintah `npx @testmanager/runner init --code <BOOTSTRAP_CODE>`.
- Menjaga alur Page → Hook → Service → Repository → Supabase: service mengorkestrasi snapshot runner, penerbitan kode sekali pakai, dan deteksi runner baru; hook melakukan polling dua detik sampai heartbeat pertama tanpa refresh manual.
- Halaman otomatis mengganti status menjadi **Runner terhubung** serta hanya menampilkan nama runner, label, dan project; prompt melarang agent melaporkan bootstrap code, runner token, atau secret lain.
- Tidak menambah atau menjalankan migration karena RPC BOOT-01 dan heartbeat runner sudah tersedia. Unit test service (7 test) dan build frontend lulus; build hanya menghasilkan warning ukuran chunk yang sudah ada.

## 2026-08-01 — CONN-07 verifikasi ulang gate driver

- Menambahkan regresi service yang membuktikan kode BOOT-01 diterbitkan setelah snapshot runner lama dan perintah yang dihasilkan persis satu baris `npx @testmanager/runner init --code <BOOTSTRAP_CODE>`.
- Menambahkan regresi deteksi koneksi yang menolak runner baru sebelum heartbeat pertama, mengabaikan runner lama, lalu menerima runner baru setelah `last_seen_at` tersedia.
- Verifikasi ulang lulus melalui 9 unit test `projectConnectionService`, build frontend, dan `git diff --check`; build hanya menghasilkan warning ukuran chunk yang sudah ada.

## 2026-08-01 — CONN-08 keamanan halaman Connect

- Menambahkan pengelolaan token project-scoped pada halaman Connect melalui alur Page → Hook → Service → Repository → Supabase: pembuatan token, daftar token aktif, waktu kedaluwarsa/pemakaian terakhir, dan aksi cabut dengan konfirmasi.
- Raw token hanya ditampilkan sekali dengan peringatan eksplisit dan tidak pernah dirangkai ke command; contoh command menggunakan environment variable `TM_API_TOKEN` serta menjelaskan risiko shell history dan screenshot.
- Menambahkan peringatan eksplisit saat read-only dimatikan dan menurunkan scope token dari mode serta feature group aktif.
- Menambahkan migration `schema_087_conn08_connect_token_security.sql` (tidak dijalankan ke Supabase target) untuk expiry 30 hari, `last_used_at`, enforcement pada autentikasi MCP/heartbeat, serta mempertahankan audit pembuatan/pencabutan tanpa menyimpan raw token. Validasi Edge Function artifact juga menolak token kedaluwarsa.
- Verifikasi lulus: 12 unit test `projectConnectionService`, `cd frontend && npm run build`, `npm run lint` tanpa error (delapan warning existing), dan `git diff --check`. Build hanya menghasilkan warning ukuran chunk yang sudah ada.
## 2026-08-01 — CONN-09 kualitas UI halaman Connect

- Menambahkan status penggunaan MCP terakhir dari `ai_audit_events` melalui alur lengkap repository → service → hook/page, dengan query project-scoped untuk event yang memiliki `tool_name`.
- Mengganti judul manual halaman Connect dengan `PageHeader` dan memakai token warna tema PrimeReact/PrimeFlex (`surface-*`, `text-color-*`) agar konsisten di mode light/dark.
- Menambahkan status/empty state edukatif untuk project yang belum pernah memakai MCP dan daftar token yang masih kosong.
- Menangani clipboard API yang tidak tersedia atau ditolak dengan fallback `InputTextarea` read-only yang otomatis terseleksi dan dapat disalin manual; nilai perintah/prompt tetap tampil sebagai teks yang bisa dipilih.
- Verifikasi: `npm run test -- --run src/services/projectConnectionService.test.ts` lulus (12 test), `npm run build` lulus, dan `npm run lint` lulus tanpa error (8 warning existing di file lain). Build memberi warning chunk utama > 1500 kB yang sudah ada dan tidak terkait CONN-09. Knowledge graph disinkronkan dengan `graphify update .`.

## 2026-08-01 — CONN-09 verifikasi ulang gate driver

- Menambahkan regresi service yang membuktikan timestamp penggunaan MCP terbaru dari repository diteruskan ke konfigurasi Connect dan kondisi tanpa audit event tetap menghasilkan status kosong yang edukatif di UI.
- Mengaudit ulang fallback clipboard: kegagalan atau ketiadaan Clipboard API membuka `InputTextarea` read-only, dapat dipilih manual, dan otomatis menyeleksi isi saat fokus.
- Membatasi laporan retry pada berkas CONN-09 yang benar-benar berbeda menurut Git; tidak ada migration, akses Supabase target, secret/token, commit, atau push.
- Verifikasi lulus: 14 unit test `projectConnectionService`, build frontend, dan lint tanpa error (delapan warning existing di file lain). Build hanya memberi warning ukuran chunk utama yang sudah ada; `graphify update .` berhasil menyinkronkan graph menjadi 3.296 node dan 6.591 edge.

## 2026-08-01 — RUI-01 wizard Hubungkan Runner

- Menambahkan satu wizard reusable untuk alur CONN-07 dan tab Runner: nama runner, label kapabilitas, bootstrap code sekali pakai, perintah instalasi npm/Docker, serta status menunggu heartbeat pertama sampai **Runner terhubung**.
- Mengganti pembuatan runner/token lama di halaman Automation dengan bootstrap aman; token permanen dibuat pada mesin lokal dan nama/label diteruskan melalui environment bootstrap yang divalidasi `agent-core`.
- Menambahkan empty state edukatif pada tab Runner dan menjelaskan bahwa runner perlu berjalan lokal tetapi hanya membuat koneksi keluar sehingga tidak memerlukan port inbound.
- Verifikasi lulus: build frontend, 14 unit test `projectConnectionService`, lint frontend tanpa error (delapan warning existing), 4 test `agent-core`, dan 16 test runner. Tidak menjalankan migration ke Supabase target, commit, atau push.

## 2026-08-01 — RUI-02 status runner yang terbaca

- Mengganti tabel runner dengan kartu responsif yang menampilkan status **Online/Idle/Sibuk/Offline**, heartbeat relatif berbahasa manusia, label, versi, OS, browser yang pernah terdeteksi dari job, job terakhir, dan uptime proses runner.
- Memperluas heartbeat bersama secara kompatibel dengan metadata runtime OS serta waktu proses mulai; menambahkan migration `schema_088_rui02_runner_readable_status.sql` untuk menyimpannya tanpa pernah menyimpan atau mencatat raw token. Migration tidak dijalankan ke Supabase target.
- Menjaga alur Page/Component → Hook → Service → Repository → Supabase: service menggabungkan runner, heartbeat, dan job; status runner dihitung sebagai business rule di service.
- Menambahkan refresh heartbeat otomatis setiap 15 detik, peringatan ketika job masih antre dan runner telah offline melewati ambang 60 detik, serta aksi rotate/revoke token dengan konfirmasi eksplisit dan penjelasan dampaknya.
- Verifikasi lulus: build frontend, 3 unit test frontend baru, lint frontend tanpa error (delapan warning existing), 4 test `agent-core`, 16 test runner, dan `git diff --check`.

## 2026-08-01 — RUI-03 diagnosis job yang belum diambil runner

- Menambahkan diagnosis antrean di service untuk membedakan semua runner offline, label wajib tidak cocok, environment tidak terjangkau berdasarkan hasil sanity-check Base URL dari attempt yang di-requeue, serta kondisi normal menunggu polling runner yang cocok.
- Menampilkan diagnosis dan langkah penanganan pada dialog detail/log job, termasuk label wajib job, tanpa query langsung dari page dan tanpa migration baru.
- Menandai scope RUI-03 Section 13.2 selesai serta menambahkan regresi unit untuk seluruh cabang diagnosis dan invariant bahwa job non-queued tidak didiagnosis sebagai masalah antrean.
- Verifikasi lulus: `npm run test -- --run src/services/automationService.test.ts` (6 test), `npm run build`, dan `git diff --check`. Build hanya memberi warning ukuran chunk utama yang sudah ada. Tidak menjalankan migration ke Supabase target, commit, atau push.

## 2026-08-01 — RUI-04 papan job automation

- Menambahkan tampilan papan job alternatif dengan kolom Queued, Running, Passed, dan Failed/Canceled, beserta toggle kembali ke tabel.
- Menambahkan filter cepat runner, environment, test plan, dan status; metadata papan diambil melalui alur Page/Component → Hook → Service → Repository → Supabase.
- Menampilkan langkah/log terbaru, durasi berjalan, progress, dan estimasi durasi dari riwayat job Test Case yang sama; dialog live log yang sudah memakai subscription realtime tetap dapat dibuka dari kartu.
- Menambahkan aksi batalkan job queued, retry job failed melalui RPC retry Test Result yang sudah ada, serta navigasi ke Test Result terkait pada papan dan tabel.
- Menambahkan badge jumlah job queued per project pada tombol Automation di sidebar, diperbarui setiap 15 detik.
- Memperbarui checklist Section 13.3 pada `FEATURE_BACKLOG.md`.
- Verifikasi: `cd frontend && npm run build` lulus. Vite tetap melaporkan warning chunk utama > 1500 kB yang sudah ada dan tidak memblokir build.
- `graphify update .` berhasil menyinkronkan graph menjadi 3.331 node dan 6.678 edge; warning tujuh source tanpa node tidak memblokir pembaruan.
- `cd frontend && npm run lint` lulus tanpa error; delapan warning hook/Fast Refresh yang sudah ada tetap tercatat.
- Verifikasi regresi relevan lulus: 1 test mapper Automation Job dan 6 test automation service. Suite mapper penuh masih memiliki tiga kegagalan existing pada daftar ekspor, API token, dan runner yang tidak terkait RUI-04.

## 2026-08-01 — RUI-05 mapping script yang terarah

- Menonjolkan daftar Test Case yang belum memiliki script sebagai pekerjaan utama di tab Mapping Script, lengkap dengan multi-selection dan bulk mapping memakai placeholder `{code}` / `{slug}`.
- Menambahkan inventaris file test Playwright pada heartbeat runner (maksimal 5.000 path relatif) dan migration aditif `schema_089_rui05_script_mapping.sql`; migration tidak dijalankan ke Supabase target.
- Memvalidasi `script_ref` tepat sebelum single maupun bulk insert melalui service: penyimpanan ditolak jika tidak ada runner online yang memenuhi label atau file tidak ditemukan pada runner yang eligible.
- Menampilkan label wajib dan nama runner online yang memenuhi label sekaligus memiliki file, baik saat input maupun pada mapping yang sudah tersimpan.
- Menjaga layering Component/Page → Service → Repository → Supabase dan melakukan bulk insert hanya setelah seluruh kandidat lolos validasi agar kegagalan validasi tidak menghasilkan mapping parsial.
- Verifikasi lulus: build frontend, 8 unit test automation service, build + 16 test runner, build `agent-core`, `git diff --check`, dan `graphify update .` (3.344 node / 6.718 edge). Build frontend hanya memberi warning ukuran chunk utama yang sudah ada. Suite mapper penuh masih memiliki tiga kegagalan existing yang telah tercatat pada RUI-04 dan tidak terkait RUI-05.

## 2026-08-01 — RUI-05 koreksi layering dan gate laporan

- Memindahkan aksi create, bulk create, dan delete Mapping Script dari pemanggilan service langsung di page ke `useAutomation`, serta memasok evaluasi runner dan preview pola ke komponen melalui kontrak props agar alur Mapping Script tetap Component/Page → Hook → Service → Repository → Supabase.
- Mengaudit ulang scope Section 13.4 dan membatasi daftar berkas laporan akhir hanya pada path RUI-05 yang benar-benar berbeda menurut Git; perubahan task lain di worktree tidak diklaim sebagai bagian RUI-05.
## 2026-08-01 — RUI-06 Diagnostik runner

- Menambahkan migration `schema_090_rui06_runner_diagnostics.sql` untuk job diagnostik no-op per runner, RLS project, serta RPC enqueue/poll/report tanpa menjalankannya ke Supabase target.
- Menambahkan model dan mapper hasil sanity check (Base URL, browser Playwright, versi Playwright, ruang disk), repository, service, dan hook sesuai layering frontend.
- Menambahkan panel Diagnostik kontekstual pada setiap Runner Card, tombol **Uji koneksi**, petunjuk perbaikan berdasarkan kondisi, dan peringatan runner tertinggal dari versi server.
- Local Runner kini memprioritaskan diagnostic job, menjalankan pemeriksaan lokal tanpa script test, lalu melaporkan hasil end-to-end ke server.
- Verifikasi: `cd frontend && npm run build` lulus (warning ukuran chunk existing); `cd runner && npm test` lulus (10/10 berkas test).

## 2026-08-01 — RUI-07 halaman automation responsif dan state UI

- Mengganti tabel Mapping Script dengan kartu yang dapat dipilih pada layar mobile dan memaksa papan job berbasis kartu pada mobile; tabel tetap tersedia sebagai opsi desktop.
- Menambahkan state loading kontekstual untuk pemeriksaan akses, workspace automation, mapping, dan papan job; empty state untuk runner, mapping, job, serta hasil filter kosong; dan error state dengan aksi retry.
- Menambahkan hook status jaringan browser dan banner offline yang menjelaskan bahwa data dapat stale serta menonaktifkan retry sampai koneksi kembali tersedia.
- Mempertahankan `PageHeader` dan memakai token warna/surface PrimeReact agar seluruh state dan kartu konsisten pada tema light/dark.
- Memperbarui checklist Section 13.6 pada `FEATURE_BACKLOG.md`. Tidak ada migration, akses Supabase target, secret/token, commit, atau push.
- Verifikasi: `cd frontend && npm run build` lulus; Vite hanya melaporkan warning ukuran chunk utama > 1500 kB yang sudah ada. `cd frontend && npm run lint` lulus tanpa error dengan delapan warning existing di file lain; `git diff --check` lulus.
- `graphify update .` berhasil menyinkronkan graph menjadi 3.367 node dan 6.769 edge; warning tujuh source tanpa node tidak memblokir pembaruan.

## 2026-08-02 — Penulisan ulang `README.md`

- `README.md` ditulis ulang total (61 → ~470 baris). README lama hanya mencakup
  frontend dan menyebut folder `backend/` yang sudah tidak ada, serta melewatkan
  seluruh komponen runner, MCP server, `packages/agent-core`, dan Edge Functions.
- Struktur baru: daftar isi, rasional produk, diagram arsitektur 4 komponen,
  enam bagian setup bertahap (database → OAuth → frontend → runner → MCP →
  edge functions), alur pemakaian (QA manual, automation, AI end-to-end), model
  domain + invariant, aturan layering frontend, tabel perintah per package,
  strategi testing, deploy, dan troubleshooting.
- Urutan eksekusi schema didokumentasikan eksplisit: lima file fondasi berurutan,
  lalu file fondasi tanpa nomor, lalu seluruh file bernomor urut naik
  (`schema_011` … `schema_090`). Dicatat pula dua pasang nomor kembar (`029`,
  `060`) sisa pengembangan paralel agar tidak dikira salah satu harus dilewati.
- Ditambahkan dua peringatan keamanan yang sebelumnya tidak ada di README:
  variable `VITE_*` ter-bundle ke browser sehingga `service_role` key tidak boleh
  ditaruh di sana; dan alasan runner bersifat fail-closed (Playwright memuat
  `playwright.config.*` sebagai kode Node sebelum file test), sehingga
  `tm-runner trust <path>` wajib dijalankan sekali per repository.
- Verifikasi: seluruh 22 tautan file/folder di README dicek keberadaannya di
  disk — semuanya ada. Jumlah tool MCP (42) diambil dari hitungan registrasi di
  `mcp/src/tools/*.ts`; daftar env var diambil dari `.env.example` masing-masing
  package dan tabel di `mcp/README.md`.
- Tidak ada perubahan kode, migration, akses Supabase, secret, commit, atau push.

## 2026-08-02 — `README.md` diperluas: MCP, Skills, Connect Agent, AI, workflow, styling

- README diperluas dari ~470 menjadi 1.276 baris atas permintaan penambahan
  cakupan dan desain visual.
- Bagian baru: **MCP Server** (cara pasang di Claude Code via `.mcp.json`, mode
  HTTP, dan daftar lengkap 42 tool dikelompokkan read 15 / write 14 /
  automation 6 / analysis 3 / repo 4); **Agent Skills** (4 skill, tiga metode
  instalasi, contoh guardrail yang ditegakkan); **Connect Agent** (alur token
  koneksi, konfigurasi MCP, bootstrap runner, prompt starter); **Fitur AI**
  (5 action `ai-gateway` beserta pagar `draft`/`review_only`); **Koneksi lain**
  (API token, webhook + delivery log, CI/CD 5 provider, 4 mode repository);
  **Workflow lengkap** (QA manual, automation, AI end-to-end) plus tabel gerbang
  keamanan dan tempat penegakannya.
- Desain visual: header terpusat, 10 badge shields.io, daftar isi tiga kolom,
  tujuh diagram Mermaid berwarna, blok `> [!NOTE|TIP|IMPORTANT|WARNING|CAUTION]`
  GitHub, serta `<details>` collapsible untuk bagian panjang.
- Bagian **Author & Kontributor** ditambahkan dari riwayat Git: `rx7`
  (novalfr802@gmail.com, 104 commit) sebagai author/maintainer dan Fahmi Fauzi
  Rahman (28 commit) sebagai kontributor. Nama tampilan "Noval Fauzi Rahman"
  diturunkan dari alamat email dan handle GitHub `NvlFR` — perlu dikonfirmasi
  pemilik repo bila ejaannya berbeda.
- Verifikasi: seluruh tautan file relatif dicek ke disk, tidak ada yang hilang.
  Dua diagram Mermaid paling kompleks (arsitektur dan workflow AI end-to-end)
  divalidasi lewat Mermaid Chart dan mengembalikan `valid: true`; lima diagram
  lain memakai konstruksi sintaks yang sama.
- Daftar 42 tool MCP diambil dari `registerTool(...)` di `mcp/src/tools/*.ts`,
  action AI dari `docs/AI_INTEGRATION.md`, provider CI/CD dan mode repository dari
  `frontend/src/types/domain.ts`, alur bootstrap dari
  `skills/testmanager-workflow/SKILL.md`.
- Tidak ada perubahan kode, migration, akses Supabase, secret, commit, atau push.

## 2026-08-02 — Perbaikan render diagram Arsitektur di README

- GitHub menolak merender diagram Mermaid pada bagian "Arsitektur" dengan pesan
  "Unable to render rich display", padahal validator Mermaid Chart mengembalikan
  `valid: true` — indikasi versi Mermaid GitHub lebih tua dari validator.
- Diagnosis: dua konstruksi hanya dipakai di diagram tersebut dan tidak ada di
  enam diagram lain yang berhasil dirender, yaitu blok `subgraph` dan node
  silinder `S[("...")]`. Diverifikasi dengan `grep` bahwa keduanya nol kemunculan
  di seluruh README setelah perbaikan.
- Perbaikan: diagram ditulis ulang memakai node persegi `["..."]` biasa dengan
  emoji sebagai penanda peran, sehingga hanya menggunakan konstruksi yang sudah
  terbukti dirender GitHub pada enam diagram lain.
- Informasi pengelompokan zona (Pengguna / Server Pusat / Lokal-On-Prem) yang
  sebelumnya dibawa oleh `subgraph` dipulihkan sebagai tabel legend di bawah
  diagram agar tidak hilang.
- Verifikasi: diagram revisi divalidasi ulang lewat Mermaid Chart, hasil
  `valid: true`. Tidak ada perubahan kode, migration, secret, commit, atau push.
