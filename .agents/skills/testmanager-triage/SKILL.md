---
name: testmanager-triage
description: Menganalisis Test Run dan Test Result gagal di TestManager, membaca bundle bukti automation, membedakan kegagalan produk dari test atau environment, mendeteksi duplikat, dan menyusun Issue yang actionable. Gunakan saat triage FAIL/BLOCKED, menyelidiki artifact, atau membuat dan memperbarui Issue dari kegagalan.
---

# TestManager Triage

## Bangun fakta kegagalan

1. Buka Test Result FAIL/BLOCKED dan identifikasi Test Run, Test Case, environment, browser, build, branch, commit SHA, tester, serta waktu eksekusi.
2. Bandingkan steps dan expected result Test Case dengan actual result. Jangan menyimpulkan akar masalah hanya dari status.
3. Baca bukti dalam urutan: error/stack dan console, screenshot/DOM, trace/video, network HAR, lalu metadata repository. Korelasikan timestamp antar-artifact.
4. Pisahkan observasi dari inferensi. Kutip pesan error singkat dan lokasi artifact; jangan mengarang isi bukti yang hilang.
5. Klasifikasikan sementara sebagai product defect, test/script defect, environment/infrastructure, flaky/timing, data/setup, atau belum cukup bukti.
6. Jika bukti tidak lengkap atau kontradiktif, minta rerun terarah atau inspeksi manusia. Jangan mengubah FAIL menjadi PASS.

## Deteksi duplikat

Cari Issue dengan kombinasi gejala, Test Case/module, error signature, endpoint/component, environment, dan commit yang sama. Jika kandidat duplikat kuat ditemukan, tambahkan komentar dan bukti baru pada Issue lama alih-alih membuat Issue baru. Nyatakan ketidakpastian bila kecocokan hanya sebagian.

## Susun Issue actionable

Buat Issue hanya dari Test Result FAIL, lalu sertakan:

- judul berupa gejala spesifik + kondisi pemicu;
- relasi Test Result, Test Run, dan Test Case;
- environment, browser/device, build, branch, dan commit;
- precondition dan data uji yang sudah disanitasi;
- langkah reproduksi minimal dan deterministik;
- expected result versus actual result;
- error signature dan tautan ke screenshot, trace, video, console, HAR, atau DOM yang relevan;
- dampak, frekuensi/reproducibility, priority yang diusulkan, dan area/module;
- dugaan akar masalah yang diberi label sebagai hipotesis, bukan fakta.

Biarkan Issue hasil AI sebagai draft sampai diverifikasi manusia. Jangan memasukkan token, credential, PII yang tidak perlu, atau isi source private ke deskripsi/log.

## Tindak lanjut

- Untuk BLOCKED karena environment atau setup, dokumentasikan blocker dan owner; jangan membuat defect produk tanpa bukti FAIL.
- Untuk rerun gagal, tambahkan bukti dan perbandingan dengan kegagalan sebelumnya pada Issue terkait.
- Untuk fix yang diklaim resolved, teruskan ke regression selektif dan pertahankan audit trail.
