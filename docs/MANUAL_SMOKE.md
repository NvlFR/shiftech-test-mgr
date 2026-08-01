# Manual Smoke Test Sebelum Rilis

Dokumen ini adalah checklist verifikasi manual yang wajib dijalankan pada build
release candidate. Checklist ini melengkapi test otomatis sesuai
`FEATURE_BACKLOG.md` Section 16.7 dan tidak boleh digantikan hanya oleh hasil
build, unit test, atau smoke test runtime.

## Persiapan

- Gunakan environment staging yang konfigurasi dan migration-nya setara dengan
  target rilis. Jangan menjalankan checklist pada data produksi.
- Siapkan dua akun Google yang berbeda: satu admin aktif dan satu akun baru yang
  belum pernah masuk ke environment tersebut.
- Siapkan file Excel dari template aplikasi yang berisi sedikitnya dua Test Case
  valid dengan nilai yang mudah dikenali.
- Siapkan file attachment aman berukuran kurang dari 10 MB, misalnya
  `smoke-evidence.png`.
- Catat tanggal, build/commit yang diuji, environment, penguji, serta bukti untuk
  setiap item. Tandai rilis gagal bila satu hasil aktual tidak sesuai.

## Checklist

### SMOKE-01 — Login dengan Google

Prasyarat: provider Google dan redirect URL staging sudah dikonfigurasi; akun
Google penguji sudah berstatus `user` atau `admin`.

Langkah:

1. Buka aplikasi pada jendela privat dan pastikan belum ada sesi aktif.
2. Pilih aksi masuk dengan Google.
3. Selesaikan pemilihan akun dan persetujuan pada halaman Google.
4. Setelah kembali ke aplikasi, muat ulang halaman.
5. Keluar dari aplikasi, lalu coba buka kembali sebuah URL modul yang dilindungi.

Hasil yang diharapkan:

- Browser kembali ke origin aplikasi tanpa error OAuth atau redirect berulang.
- Identitas akun yang tampil sesuai dengan akun Google yang dipilih dan halaman
  aplikasi dapat diakses setelah reload.
- Setelah logout, sesi berakhir dan URL modul yang dilindungi mengarahkan kembali
  ke halaman login.

### SMOKE-02 — Approval user `pending`

Prasyarat: admin sedang login dan akun Google baru belum pernah digunakan pada
environment ini.

Langkah:

1. Masuk dengan akun Google baru.
2. Coba buka URL modul yang dilindungi, misalnya daftar Project.
3. Tanpa menutup sesi user baru, masuk sebagai admin pada browser/profil lain.
4. Buka **User Management**, temukan akun baru, pastikan statusnya `pending`,
   lalu pilih **Approve**.
5. Kembali ke sesi akun baru dan muat ulang aplikasi.

Hasil yang diharapkan:

- Login pertama membuat profil berstatus `pending` dan hanya menampilkan halaman
  menunggu persetujuan; URL modul tidak dapat ditembus.
- Admin melihat akun yang benar dan approval mengubah perannya menjadi `user`
  dengan notifikasi berhasil.
- Setelah approval, akun baru dapat membuka modul yang dilindungi tanpa login
  ulang dan tidak memperoleh menu/aksi khusus admin.

### SMOKE-03 — Workflow Project sampai Issue

Prasyarat: login sebagai admin atau user yang memiliki izin mengelola project
dan menjalankan test.

Langkah:

1. Buat Project dengan nama unik, lalu buka detailnya.
2. Buat Module pada Project tersebut.
3. Buat Test Case aktif yang memakai Module tadi; isi judul, objective,
   precondition, langkah uji, expected result, priority, dan data wajib lainnya.
4. Buat Test Plan untuk Project, tambahkan Test Case tadi ke cakupannya, lalu
   lakukan approval manusia hingga plan berstatus aktif.
5. Dari detail Test Plan pilih **Mulai Test Run**, beri nama unik, dan pilih
   **Mulai**.
6. Pada Test Run, catat hasil Test Case sebagai `FAIL`, pilih tester terdaftar,
   isi catatan eksekusi, lalu simpan.
7. Pastikan ringkasan/progress berubah, tetapi status run masih `in_progress`.
8. Pada baris hasil `FAIL`, pilih **Buat Issue**, isi title, description, actual
   result, expected result, dan priority, lalu simpan.
9. Buka daftar/detail Issue dari Test Run dan periksa relasinya.
10. Kembali ke Test Run, pilih **Selesaikan Run** lalu **Selesaikan**.

Hasil yang diharapkan:

- Setiap entity tersimpan dan dapat ditemukan kembali setelah reload; Test Case
  tetap menjadi template dan tidak menampilkan hasil eksekusi sebagai atributnya.
- Memulai run membuat satu Test Result untuk Test Case dalam cakupan plan.
- Hasil `FAIL`, tester, waktu eksekusi, dan catatan tersimpan pada Test Result;
  summary/progress dihitung ulang sesuai hasil.
- Mengisi seluruh hasil tidak menyelesaikan run secara otomatis. Status hanya
  berubah menjadi `completed` setelah aksi manual **Selesaikan Run**.
- Issue berhasil dibuat hanya dari hasil `FAIL`, muncul pada daftar Issue run,
  dan detailnya menunjuk ke Test Result/Test Case/Test Run yang benar.

### SMOKE-04 — Import Test Case dari Excel

Prasyarat: Project target sudah memiliki Module yang sesuai dan penguji memiliki
izin mengubah Test Case.

Langkah:

1. Buka detail Project dan tab **Test Cases**.
2. Pilih **Import Excel**, lalu unduh **Template Excel** bila fixture belum
   disiapkan.
3. Isi sedikitnya dua baris valid dengan nilai unik, simpan sebagai `.xlsx`,
   lalu unggah file tersebut.
4. Periksa preview dan status validasi setiap baris, kemudian pilih
   **Import 2 Baris** (jumlah mengikuti baris valid).
5. Muat ulang tab Test Cases dan buka salah satu Test Case hasil import.

Hasil yang diharapkan:

- File dapat dibaca tanpa error dan preview menampilkan nilai pada kolom yang
  benar; baris valid ditandai **Valid**.
- Hanya baris valid yang diimport, notifikasi sukses muncul, dan tidak ada baris
  duplikat akibat satu kali submit.
- Data detail hasil import sama dengan isi Excel, termasuk langkah, expected
  result, Module, priority, dan field opsional yang diisi.

### SMOKE-05 — Export Test Case ke Excel

Prasyarat: Project memiliki Test Case, termasuk minimal satu hasil import dari
SMOKE-04.

Langkah:

1. Pada tab **Test Cases**, atur filter agar kumpulan data ekspor mudah dikenali.
2. Pilih **Export Excel** dan tunggu unduhan selesai.
3. Buka workbook dengan aplikasi spreadsheet dan bandingkan isinya dengan tabel
   serta detail Test Case di aplikasi.

Hasil yang diharapkan:

- Satu file Excel yang tidak korup terunduh dengan nama/format yang sesuai.
- Header kolom terbaca dan hanya Test Case yang cocok dengan filter aktif yang
  diekspor.
- Nilai penting—kode, judul, Module, priority, langkah, expected result, status,
  dan field lain yang ditampilkan—sesuai dengan data aplikasi dan karakter
  multiline/non-ASCII tetap terbaca.

### SMOKE-06 — Export laporan Test Run ke Excel

Prasyarat: Test Run dari SMOKE-03 memiliki hasil dan Issue.

Langkah:

1. Buka halaman yang menyediakan ekspor laporan Test Run.
2. Pilih run yang dibuat pada SMOKE-03, lalu pilih format **Excel**.
3. Buka file hasil unduhan dan bandingkan ringkasan serta baris detailnya dengan
   detail Test Run.

Hasil yang diharapkan:

- Workbook dapat dibuka tanpa peringatan file rusak.
- Identitas Project/Plan/Run, status run, tester, hasil `FAIL`, catatan, dan
  summary/progress sesuai dengan aplikasi; data dari run lain tidak tercampur.

### SMOKE-07 — Upload dan akses attachment

Prasyarat: penguji memiliki izin upload pada Test Run dari SMOKE-03 dan file
aman kurang dari 10 MB sudah tersedia.

Langkah:

1. Buka detail Test Run dan cari panel **Attachment**.
2. Pilih **Upload File**, pilih fixture, dan tunggu notifikasi selesai.
3. Muat ulang halaman dan klik nama attachment.
4. Buka sesi browser lain yang tidak login, lalu coba akses URL attachment yang
   disalin dari sesi sah (jika URL masih berlaku).

Hasil yang diharapkan:

- Upload menampilkan notifikasi berhasil; nama file, ukuran, dan jumlah
  attachment diperbarui tanpa duplikasi.
- Setelah reload attachment tetap tercantum dan dapat dibuka/diunduh oleh user
  yang berwenang dengan isi file utuh.
- Storage tetap private: sesi tanpa otorisasi tidak memperoleh akses permanen ke
  object. URL bertanda tangan, bila digunakan, tidak berubah menjadi URL publik.

## Rekap Eksekusi

| ID | Status (Pass/Fail/Blocked) | Bukti/catatan |
|---|---|---|
| SMOKE-01 |  |  |
| SMOKE-02 |  |  |
| SMOKE-03 |  |  |
| SMOKE-04 |  |  |
| SMOKE-05 |  |  |
| SMOKE-06 |  |  |
| SMOKE-07 |  |  |

Rilis hanya boleh dilanjutkan bila seluruh item berstatus **Pass**. Status
**Blocked** bukan Pass; perbaiki prasyarat/environment dan ulangi item tersebut.
