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
- [x] Webhook untuk event Test Run, Test Result, dan Issue.

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
Webhook HTTP dispatcher/HMAC signing membutuhkan Edge Function/worker dan
secret store server-side sebelum dinyatakan siap deployment produksi.

Catatan implementasi 2026-07-22: migration `schema_021_p2_backup_retention.sql` dan UI project/admin sudah dibuat; status tetap belum `[x]` sampai migration dijalankan serta RPC, RLS, dan Storage diverifikasi pada Supabase target. Backup/restore saat ini memulihkan metadata attachment, bukan object binary Storage.

## 4. AI Integration

- [ ] AI Generate Test Case dari requirement atau deskripsi fitur.
- [ ] Generate Test Case dari Excel atau requirement document.
- [ ] Generate test scenario dan edge case.
- [ ] Analisis hasil Test Run dan membuat ringkasan regression.
- [ ] Membuat draft Issue dari Test Result `FAIL`.
- [ ] Duplicate Issue detection.
- [ ] Rekomendasi Test Case yang perlu diretest.
- [ ] AI assistant untuk mencari Test Case, Issue, dan histori testing.

Catatan implementasi:

- Pemanggilan AI dilakukan melalui Supabase Edge Function agar API key tidak terekspos di frontend.
- Provider AI belum dipilih. Kandidat awal: OpenAI atau Google Gemini.
- Semua hasil AI harus direview user sebelum disimpan sebagai data resmi.

## 5. Automation dan Playwright

### Playwright Automation

- [ ] Menjalankan automation script dari Test Case.
- [ ] Mapping Test Case dengan automation script.
- [ ] Menyimpan hasil, screenshot, video, trace, dan log ke Test Run.
- [ ] Status job: `queued`, `running`, `passed`, `failed`.
- [ ] Retry untuk test yang gagal.
- [ ] Scheduled Test Run.

### Self-hosted Automation Infrastructure

- [ ] Docker service untuk frontend, Playwright Worker, queue, dan storage.
- [ ] Queue/Redis untuk menjalankan job secara asynchronous.
- [ ] Worker dapat berjalan di jaringan private/VPN yang sama dengan aplikasi yang diuji.
- [ ] Multi-worker scaling berdasarkan jumlah antrean automation.
- [ ] Storage adapter untuk Supabase Storage, S3, atau MinIO.
- [ ] Validasi script, pembatasan command, secret management, dan isolasi job.

Catatan: MCP digunakan untuk development/debugging, bukan sebagai runtime production.

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
6. Playwright Automation
7. Self-hosted Automation Infrastructure
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
