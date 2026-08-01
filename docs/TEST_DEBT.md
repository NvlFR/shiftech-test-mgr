# Prioritas Utang Test

Audit ini memenuhi TEST-14 / Section 16.7 `FEATURE_BACKLOG.md`. Sumber scope
adalah item berstatus `[x]` pada `FEATURE_BACKLOG.md`; oracle perilaku adalah
aturan domain dan keamanan di `CLAUDE.md`. Inventaris dibandingkan dengan berkas
test yang ada per 2026-08-01. "Belum punya test" berarti belum ditemukan test
yang secara langsung menyebut dan membuktikan perilaku fitur tersebut; build,
catatan verifikasi manual, test mapper generik, dan test fitur tetangga tidak
dihitung sebagai test fitur.

Urutan memakai dampak kegagalan sebagai pembeda utama: kebocoran akses/RBAC,
korupsi atau kehilangan data, mutasi eksternal, lalu kesalahan keluaran dan UI.
Di dalam tingkat yang sama, fitur dengan permukaan lintas layer atau lintas
proses ditempatkan lebih dahulu.

## P0 — akses, isolasi tenant, dan mutasi data kritis

1. **Role, approval user, dan administrasi profile.** Klaim selesai mencakup
   `pending`/`user`/`admin`, tetapi test frontend hanya membuktikan redirect user
   `pending` pada `ProtectedRoute`. Belum ada test untuk aksi approve/reject,
   pembatasan `AdminRoute`, perubahan role, soft-delete profile, atau RLS yang
   mencegah non-admin melakukan mutasi. Risiko: eskalasi hak akses dan user yang
   belum disetujui dapat mengubah data.
2. **Project membership dan test role/assignment.** Project management,
   assignment tester, pembagian eksekusi, dan integrasi folder source-new
   diklaim selesai. Belum ada test untuk undang/hapus anggota, role per project,
   scope project pada read/write, atau pembatasan assignment terhadap anggota
   yang sah. Risiko: akses silang project dan hasil tercatat atas identitas yang
   salah.
3. **Authentication.** Backlog mengklaim email/password, sedangkan `CLAUDE.md`
   menetapkan Google OAuth sebagai satu-satunya provider. Tidak ada test login,
   callback, sign-out, pemulihan session, atau penolakan provider lain. Ini juga
   merupakan konflik spesifikasi yang harus diputuskan manusia sebelum test
   kontraknya ditulis.
4. **API token eksternal dan webhook.** Pembuatan/revoke/rotasi token serta
   delivery webhook bertanda tangan diklaim selesai tanpa test kontrak langsung
   untuk hash-only storage, scope token, RLS, HMAC, retry, deduplikasi delivery,
   dan redaksi secret. Risiko: kredensial bocor, replay, atau event project lain
   terkirim ke endpoint yang salah.
5. **Backup, restore, import instance, dan retention cleanup.** Seluruhnya
   mengubah banyak tabel atau menghapus artefak, tetapi belum ada test dry-run,
   atomicity, project scope, kegagalan parsial, referential integrity, retention
   boundary, atau larangan menghapus data yang belum kedaluwarsa. Catatan backlog
   juga menyebut restore binary Storage belum lengkap. Risiko: kehilangan atau
   pencampuran data yang sulit dipulihkan.
6. **Ingest CI/CD dan callback pipeline.** Penerimaan hasil otomatis serta
   pengiriman status kembali diklaim selesai tanpa test service/RPC untuk
   autentikasi token, idempotensi, scope project, mapping status, retry, dan
   payload invalid. Risiko: hasil run ganda/salah dan mutasi dari pipeline tanpa
   otorisasi yang benar.
7. **Orkestrasi Local Runner di server.** Register, poll, heartbeat, rotasi token,
   enqueue, routing label, report result, retry, multi-runner, dan penyimpanan
   artifact diklaim selesai. Test MCP dan CLI menutup sebagian adapter, tetapi
   belum ada test langsung atas RPC/RLS server, claim job atomik, token runner,
   isolasi project, atau idempotensi report. Risiko: job diambil dua runner,
   runner palsu menulis hasil, atau hasil masuk ke project/run yang salah.
8. **Attachment Issue, Test Case, dan Test Run.** Belum ada test upload/delete,
   batas tipe/ukuran, ownership path, signed URL, metadata rollback, atau RLS
   bucket. Risiko: akses file lintas project, orphan object, dan metadata tidak
   konsisten dengan Storage.
9. **Archive Project tanpa menghapus histori.** Belum ada test yang membuktikan
   archive mempertahankan Test Case, Plan, Run, Result, Issue, attachment, dan
   audit log serta menolak mutasi baru yang tidak diizinkan. Risiko: histori
   audit hilang atau project archived tetap dapat dimutasi.

## P1 — integritas workflow dan data bisnis

10. **CRUD Project, Module, dan Tag.** Tidak ada test service/repository langsung
    untuk validasi, uniqueness/scope project, delete yang masih direferensikan,
    atau konsistensi junction tag. Risiko: master data yatim atau relasi Test Case
    lintas project.
11. **CRUD Test Case di luar invariant yang sudah diuji.** Test yang ada menutup
    validasi create dan invariant execution, tetapi belum menutup update/delete,
    archive, urutan langkah, penggantian module/tag atomik, dan optimistic
    concurrency. Risiko: template serta step hilang atau berubah sebagian.
12. **Test Case versioning, duplicate, dan bulk update.** Belum ada test snapshot
    versi, nomor versi, restore, duplikasi module/tag/step/expected result, scope
    selection bulk, partial failure, atau audit perubahan. Risiko: histori tidak
    dapat dipercaya dan mutasi massal merusak banyak case sekaligus.
13. **CRUD Test Plan dan pengelolaan scope case.** Test tersedia untuk validasi
    dasar dan approval eksplisit, tetapi belum ada test create/update/delete,
    add/remove/reorder case, konsistensi junction, atau larangan perubahan plan
    aktif yang sudah mempunyai run. Risiko: cakupan eksekusi berbeda dari plan
    yang disetujui.
14. **Environment dan metadata Test Run.** Belum ada test CRUD environment,
    environment per project, base URL, browser/device/build/release, atau
    preservasi metadata pada run. Risiko: hasil dieksekusi atau dilaporkan untuk
    target yang salah.
15. **Assignment dan filter Test Run.** Belum ada test pembagian case per tester,
    reassignment, user non-anggota, filter gabungan, pagination, atau scope
    project. Risiko: tester mengerjakan case yang salah dan daftar operasional
    menyembunyikan run/result.
16. **Requirement traceability dan coverage.** Belum ada test untuk seluruh relasi
    Requirement → Test Case/Plan/Result/Issue, perhitungan coverage, requirement
    uncovered, update/delete relasi, atau scope project. Test MCP hanya menguji
    forwarding/mapping sebagian query. Risiko: metrik coverage memberi rasa aman
    palsu.
17. **Comment, mention, notifikasi Issue, dan audit log.** Belum ada test
    authorization comment, parsing mention, recipient/dedup/read state,
    pencatatan actor/before-after, atau immutability audit. Risiko: notifikasi
    salah penerima dan jejak perubahan tidak dapat diaudit.
18. **Import Test Case Excel dan template import.** Belum ada test parser,
    validasi kolom/baris, preview, deduplikasi, transaction/partial failure,
    mapping module/tag/step, atau formula injection. Test AI CSV hanya menguji
    format keluaran AI, bukan alur import. Risiko: import massal menghasilkan
    data salah atau berbahaya.
19. **AI Test Run analysis, draft Issue, duplicate Issue, retest, dan assistant.**
    Test yang ada menutup schema/helper dan draft Issue dasar, tetapi belum ada
    test langsung untuk service/repository analisis run, pencarian ter-scope,
    duplicate orchestration, rekomendasi retest, error provider, dan larangan
    persist otomatis pada seluruh aksi. Risiko: AI mengubah data resmi atau
    mengakses konteks project lain tanpa review manusia.
20. **Automation mapping/enqueue dan status di frontend.** MCP mempunyai test
    service terkait, tetapi alur frontend `automationService`/hook/page belum
    diuji untuk mapping script, enqueue case/plan, label routing, cancel, retry,
    dan reload status. Risiko: UI mengirim target atau parameter job yang salah.

## P2 — keluaran, reporting, dan bukti eksekusi

21. **Dashboard QA dan reporting lintas run.** Belum ada test perhitungan trend,
    pass/fail/progress, issue aging, grouping release/environment, filter, dan
    kondisi data kosong. Risiko: keputusan rilis dibuat dari agregasi yang salah.
22. **Export Test Case dan laporan Test Run ke Excel/PDF.** Belum ada test isi,
    urutan, filter aktif, escaping formula, timezone, filename, atau konsistensi
    summary dengan tampilan. Risiko: laporan resmi salah atau spreadsheet
    menjalankan formula dari data user.
23. **Viewer artifact dan observability interaktif.** Screenshot, video, trace,
    console/network log, DOM snapshot, diff, live log, pause/step-through, retry
    manual, dan sanity check diklaim selesai. Test runner menutup beberapa helper,
    tetapi belum ada test UI/service untuk authorization signed URL, pemilihan
    artifact yang benar, streaming ordering/reconnect, command ownership, dan
    relasi retry manual. Risiko: bukti salah run terbuka atau perintah dikirim ke
    job lain.
24. **Project selector global dan filter lanjutan Test Case.** Belum ada test
    persistensi pilihan, pergantian project yang membersihkan state/query lama,
    deep-link, kombinasi filter/sort/pagination, atau data kosong. Risiko:
    pengguna tanpa sadar melihat atau memutasi konteks project sebelumnya.
25. **Integrasi komponen source-new yang diklaim selesai.** Checklist SRC-01
    sampai SRC-08, SRC-10, SRC-11, dan SRC-14 berstatus selesai, tetapi sebagian
    besar dialog, issue UI, layout, notification/profile UI, hook, service, dan
    repository hasil integrasi tidak mempunyai test langsung. Prioritas test
    mengikuti fitur data/RBAC di atas; komponen presentasional murni ditempatkan
    terakhir karena dampaknya lebih rendah.

## Klaim selesai yang sudah mempunyai bukti test langsung

Daftar ini dikeluarkan dari prioritas utang di atas agar pekerjaan berikutnya
tidak menduplikasi cakupan yang sudah ada:

- invariant Test Run/Test Result, tester terdaftar, dan Issue dari hasil FAIL;
- user `pending` pada protected route, draft Test Case AI, dan larangan tool MCP
  meng-approve;
- mapper, formatter tanggal, label status, dan kode entity otomatis;
- validasi dasar Test Case, Test Plan, Test Run, dan Issue;
- component flow review batch AI, approval Test Plan, pencatatan result, dan
  pembuatan Issue;
- kontrak utama MCP read/write/governance/repository/automation serta helper CLI
  runner yang sudah mempunyai berkas test;
- kontrak `ai-gateway` dan `repo-credentials` yang sudah mempunyai test khusus.

Keberadaan test tersebut bukan bukti seluruh fitur induknya selesai; hanya
perilaku yang disebut eksplisit di atas yang dianggap sudah tertutup.
