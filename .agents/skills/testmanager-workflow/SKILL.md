---
name: testmanager-workflow
description: Menjalankan workflow TestManager secara aman melalui MCP, termasuk membuat Test Run, mencatat hasil, membuat Issue, menjaga approval manusia, dan memasang Local Runner dengan bootstrap code. Gunakan saat agent diminta mengubah data TestManager, menjalankan atau mengulang pengujian, mengelola hasil dan Issue, atau menyiapkan runner.
---

# TestManager Workflow

## Terapkan invariant domain

- Perlakukan Test Case sebagai template; jangan pernah menyimpan PASS, FAIL, SKIP, atau BLOCKED pada Test Case maupun relasi Test Plan.
- Buat Test Run baru untuk setiap eksekusi dan re-run. Jangan menimpa riwayat Test Run lama.
- Simpan status eksekusi hanya pada Test Result milik Test Run tersebut.
- Ubah Test Run menjadi `completed` hanya melalui aksi eksplisit user; jangan menyimpulkannya dari seluruh hasil yang sudah terisi.
- Hitung summary dan progress dari Test Result saat dibaca; jangan membuat cache status pada Test Run.
- Buat Issue hanya dari Test Result berstatus FAIL. Pertahankan relasi Issue ke Test Result, Test Run, dan Test Case; satu hasil gagal boleh memiliki lebih dari satu Issue.
- Tetapkan tester hanya ke profile TestManager yang terdaftar, bukan nama bebas.
- Minta manusia mereview Test Case hasil AI dan meng-approve Test Plan. Jangan mengaku approval sudah terjadi tanpa aksi manusia.
- Catat aksi agent melalui jalur audit yang tersedia dan jangan menampilkan token atau secret.

## Jalankan pengujian

1. Pastikan project, environment, Test Plan yang disetujui, dan scope Test Case benar.
2. Buat Test Run baru. Sertakan environment, browser, build version, branch, dan commit bila tersedia.
3. Antrekan hanya Test Case yang memiliki automation script. Biarkan Test Case tanpa script sebagai eksekusi manual; jangan menebak hasil.
4. Tunggu runner melaporkan hasil dan bukti. Jangan menandai Test Run selesai secara otomatis.
5. Sajikan summary kepada manusia dan minta aksi eksplisit untuk menyelesaikan Test Run.

## Pasang dan sambungkan Local Runner

Gunakan jalur bootstrap dari halaman **Connect Agent** ketika user meminta setup runner:

1. Minta user membuat bootstrap code project-scoped dari halaman Connect Agent. Perlakukan kode sebagai rahasia sementara walaupun sekali pakai dan default kedaluwarsa dalam 10 menit.
2. Pastikan Node.js 20+, mesin dapat mengakses aplikasi under test, dan direktori kerja adalah root project Playwright yang benar.
3. Jalankan tepat perintah yang dihasilkan halaman, berbentuk `npx @testmanager/runner init --code <BOOTSTRAP_CODE>`. Jangan menulis bootstrap code ke source, dokumentasi, log, atau riwayat kerja agent.
4. Biarkan runner menukar kode sekali pakai dengan runner token dan menyimpan `.env` berpermission `0600`. Jangan membaca, menyalin, atau melaporkan runner token.
5. Periksa repository dan `playwright.config.*`, lalu trust root repository secara eksplisit dengan `tm-runner trust <absolute-path>`. Trust hanya setelah user menyetujui kode yang akan dijalankan.
6. Start runner dengan `tm-runner` atau perintah instalasi yang ditampilkan oleh distribusi self-hosted. Runner harus melakukan koneksi outbound dan mengirim heartbeat; jangan membuka port inbound.
7. Verifikasi status **Runner terhubung** atau heartbeat pertama di TestManager.
8. Laporkan hanya nama runner, label, dan project yang tersambung. Jangan tampilkan bootstrap code, runner token, anon key, atau secret repository.

Hentikan setup dan minta bantuan manusia bila bootstrap code kedaluwarsa/terpakai, konfigurasi server publik tidak tersedia, repository belum dipercaya, atau sumber/config Playwright belum aman untuk dieksekusi.

## Guardrail keputusan

- Minta konfirmasi sebelum aksi massal, scope regression di atas ambang, menonaktifkan mode read-only, atau mengeksekusi repository yang belum dipercaya.
- Jangan menjalankan migration, menghapus data, atau memperluas scope project tanpa instruksi eksplisit.
- Jika tool yang diperlukan tidak aktif, jelaskan feature group yang perlu diaktifkan; jangan mengarang hasil operasi.
