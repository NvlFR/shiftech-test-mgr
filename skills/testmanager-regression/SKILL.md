---
name: testmanager-regression
description: Memilih dan menjalankan scope regression TestManager yang relevan untuk Issue resolved atau perubahan kode dengan sinyal relasi Test Case, module/tag, requirement, dan repository diff. Gunakan saat merencanakan retest, membuat Test Run regression, menilai dampak perubahan, atau menentukan kapan konfirmasi manusia wajib diminta.
---

# TestManager Regression

## Kumpulkan kandidat

Mulai dari Issue resolved yang belum verified dan gabungkan sinyal berikut secara berurutan:

1. Test Case yang tertaut langsung ke Issue/Test Result gagal; selalu masukkan.
2. Test Case dengan Module atau Tag yang sama dengan Test Case gagal.
3. Test Case yang tertaut ke requirement yang sama.
4. Test Case yang terdampak file/symbol pada diff commit perbaikan melalui konteks repository.

Catat alasan pemilihan per Test Case. Deduplicate kandidat berdasarkan identitas Test Case dan kecualikan Test Case archived atau di luar project. Jangan menganggap kedekatan module/tag saja sebagai bukti pasti dampak.

## Prioritaskan scope

Urutkan kandidat berdasarkan kekuatan relasi langsung, risiko bisnis/priority, luas perubahan, riwayat kegagalan/flakiness, dan biaya eksekusi. Pertahankan test kontrol untuk jalur kritis yang berbagi dependency walaupun tidak disentuh langsung.

Jelaskan item yang dikeluarkan dan alasannya. Jika diff tidak tersedia, requirement tidak tertaut, atau metadata terlalu lemah, tampilkan coverage gap dan minta manusia menilai area terdampak.

## Terapkan gate manusia

Minta konfirmasi eksplisit sebelum enqueue bila:

- jumlah kandidat melewati ambang aman yang diberikan TestManager;
- perubahan menyentuh banyak Module/Tag atau shared infrastructure;
- sinyal konflik atau confidence rendah;
- suite mahal/destruktif, environment production-like, atau membutuhkan data sensitif;
- ada Test Case manual yang perlu dijadwalkan.

Jangan memecah scope diam-diam untuk menghindari ambang. Sajikan jumlah, estimasi, risiko, dan alasan pemilihan agar manusia dapat menyetujui atau mempersempit scope.

## Jalankan dan verifikasi

1. Buat Test Run regression baru; jangan menimpa Test Run sebelumnya.
2. Tautkan Issue yang diverifikasi dan simpan environment, build, branch, serta commit perbaikan.
3. Antrekan automation yang tersedia dan pertahankan Test Case manual di scope untuk eksekusi manusia.
4. Setelah hasil masuk, jangan menyelesaikan Test Run secara otomatis.
5. Jika seluruh bukti relevan PASS, verifikasi Issue melalui aksi yang teraudit dan tautkan Test Run pembuktinya.
6. Jika ada FAIL, pertahankan/buka kembali Issue sesuai workflow dan tambahkan komentar berisi bukti baru serta perbandingan dengan kegagalan lama.
