---
name: testmanager-authoring
description: Menulis dan mereview Test Case TestManager yang terstruktur, terukur, dan siap dieksekusi, termasuk happy path, skenario negatif, edge case, steps, expected result, module, tag, priority, dan traceability requirement. Gunakan saat membuat, memperbaiki, mengimpor, atau mengaudit kualitas Test Case.
---

# TestManager Authoring

## Susun Test Case

1. Pahami requirement dan batas scope sebelum menulis. Tandai asumsi atau ambiguity dan minta klarifikasi bila itu mengubah expected behavior.
2. Tulis judul ringkas dengan pola kondisi/aksi dan hasil utama; buat satu tujuan perilaku per Test Case.
3. Isi objective dengan risiko atau perilaku yang dibuktikan, bukan mengulang judul.
4. Tulis precondition yang dapat disiapkan: role, data awal, state, environment, dan dependency.
5. Tulis steps sebagai urutan aksi bernomor dan deterministik. Satu step memuat satu aksi observabel; gunakan data uji konkret tanpa secret.
6. Tulis expected result yang dapat diverifikasi untuk step penting dan hasil akhir. Hindari kata samar seperti "berhasil", "normal", atau "sesuai" tanpa indikator.
7. Pilih tepat satu Module yang paling bertanggung jawab, lalu gunakan Tag untuk concern lintas modul seperti smoke, security, mobile, atau regression.
8. Tetapkan priority berdasarkan dampak dan kemungkinan gagal, bukan berdasarkan urutan penulisan.
9. Pertahankan `requirement_ref` atau relasi requirement agar coverage dapat ditelusuri.

## Cakup variasi bernilai

Untuk setiap perilaku, pertimbangkan:

- happy path dengan input valid;
- input kosong, invalid, malformed, duplicate, dan batas panjang/nilai;
- boundary sebelum, tepat pada, dan setelah ambang;
- permission/role yang tidak berhak;
- state transition, retry, idempotency, dan concurrent action;
- dependency lambat/gagal, jaringan terputus, serta recovery;
- variasi environment, browser, viewport, locale, dan timezone bila relevan;
- keamanan dan privasi tanpa memasukkan credential nyata.

Jangan membuat kombinasi yang hanya berbeda kosmetik. Pisahkan Test Case ketika setup, risiko, atau hasil yang diharapkan berbeda secara bermakna.

## Periksa sebelum menyerahkan

- Pastikan Test Case tidak menyimpan hasil eksekusi.
- Pastikan tiap step dapat dilakukan tester lain tanpa pengetahuan tersembunyi.
- Pastikan expected result spesifik, observable, dan tidak bergantung pada implementasi internal kecuali requirement memang teknis.
- Deteksi duplikat sebelum membuat Test Case baru; usulkan update bila intent sama.
- Perlakukan output AI sebagai draft. Minta review manusia sebelum aktivasi atau approval.
- Untuk import, gunakan kolom `title`, `objective`, `precondition`, `steps`, `expected_result`, `priority`, `module`, `tags`, serta `requirement_ref` bila tersedia.
