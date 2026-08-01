# TestManager — Playwright Local Runner

CLI/agent yang menjalankan automation Playwright **di mesin lokal / on-prem**,
lalu melapor ke server pusat TestManager. Ini bagian "Local Runner" dari
Section 5 di [`../FEATURE_BACKLOG.md`](../FEATURE_BACKLOG.md).

## Kenapa runner terpisah?

Server pusat (Supabase + frontend) yang di-deploy self-hosted **tidak menjalankan
browser** dan sering tidak punya akses ke aplikasi yang diuji (localhost /
jaringan internal / VPN). Runner ini di-install di mesin yang **bisa mengakses
aplikasi under test**, lalu **konek keluar (outbound-only)** ke server pusat:

```
Mesin lokal (tester / on-prem)            Server pusat (self-hosted)
  Playwright Local Runner  ── poll ──▶   Supabase RPC (runner token)
        │                  ◀── job ──        │
   [npx playwright test]                     │
        │                  ── report ──▶   test_results + artifact metadata
```

Runner **tidak membuka port** apa pun — aman di balik NAT/firewall.

## Prasyarat

- Node.js 20+.
- Sebuah project Playwright (punya `playwright.config.*` dan file test) yang bisa
  menjalankan aplikasi under test. Runner memanggil Playwright via CLI, jadi
  versi Playwright mengikuti project itu.
- Migration `supabase/schema_024_p3_automation.sql` sudah dijalankan di Supabase.
- Sebuah runner sudah dibuat di UI (Automation → **Runner Baru**) — salin token
  sekali-tampilnya.

## Setup

```bash
cd runner
cp .env.example .env      # isi TM_SUPABASE_URL, TM_SUPABASE_ANON_KEY, TM_RUNNER_TOKEN, TM_PROJECT_DIR
npm install               # hanya devDependency (TypeScript); runner tanpa runtime deps
npm run build
npm start
# Browser terlihat untuk semua job pada sesi runner ini:
npm start -- --headed
# Browser terlihat dengan delay 250 ms per operasi:
npm start -- --slow-mo=250
# Playwright UI Mode (argumen setelah subcommand diteruskan ke Playwright):
npm start -- ui tests/smoke.spec.ts
# Playwright Inspector + PWDEBUG=1:
npm start -- debug tests/smoke.spec.ts
# Jalankan ulang otomatis ketika file *.spec.* / *.test.* berubah:
npm start -- watch tests
# Rekam script dan petakan ke Test Case yang dipilih di terminal:
npm start -- codegen https://app-under-test.example
# Deteksi script baru di repo dan tawarkan mapping ke Test Case manual:
npm start -- sync
```

Subcommand `ui`, `debug`, dan `watch` berjalan langsung di `TM_PROJECT_DIR` dan
tidak melakukan polling maupun membutuhkan kredensial TestManager. `watch`
mengabaikan perubahan pada `node_modules`, `.git`, artifact, dan output report;
tekan Ctrl+C untuk berhenti.

`codegen` membutuhkan konfigurasi TestManager yang sama dengan mode `start`.
CLI menampilkan Test Case aktif dari proyek runner, membuka Playwright Codegen,
menyimpan hasil default ke `tests/<kode-test-case>.spec.ts`, dan baru memetakan
`script_ref` setelah Codegen ditutup dengan sukses serta file hasil tersedia.
Langkah manual terstruktur milik Test Case ditampilkan sebagai checklist terminal
sebelum Codegen dibuka, termasuk hasil yang diharapkan bila tersedia.

`sync` memindai `TM_PROJECT_DIR` untuk file `*.spec.*` dan `*.test.*`, lalu
membandingkannya dengan `script_ref` yang sudah tersimpan. Setiap script baru
ditawarkan satu per satu untuk dipetakan ke Test Case aktif yang belum memiliki
automation. Direktori dependency, Git, report, hasil test, dan artifact diabaikan;
isi source script tidak pernah dikirim ke server.

`script_ref` yang dikirim server (mis. `tests/login.spec.ts`) di-resolve relatif
terhadap repository pada Test Run. Untuk `local_path`, runner menggunakan path
lokal tersebut. Untuk repository remote, runner melakukan clone atau pull ke
`TM_REPOSITORY_CACHE_DIR` sebelum menjalankan script. Jika Test Run belum ditautkan
ke repository, `TM_PROJECT_DIR` menjadi fallback dan wajib berupa path absolut,
terbaca, serta menunjuk root git repository. Runner yang hanya menangani repository
remote tidak perlu menyiapkan source code lebih dulu.

Credential private repository diambil bersama job saat runtime. Runner memasangnya
hanya pada environment proses Git, tidak pada URL/argumen command, konfigurasi Git,
file cache, artifact, atau log. `script_ref` dan `subdirectory` yang keluar dari
root repository ditolak.

Runner membaca branch aktif, commit SHA, serta status dirty/clean lewat Git.
Payload laporan hanya menyertakan path dan metadata tersebut; isi file source
tidak pernah dibaca untuk dikirim maupun dimasukkan ke payload server pusat.

## Cara kerja

1. **Heartbeat** saat start (fail-fast kalau token ditolak) lalu tiap
   `TM_HEARTBEAT_INTERVAL_SECONDS` → UI menampilkan Online/Offline.
2. **Poll** `poll_automation_job`; server mengklaim satu job antre yang
   `required_labels`-nya subset dari label runner (`FOR UPDATE SKIP LOCKED`,
   aman untuk banyak runner).
3. **Prepare + execute**: clone/pull repository yang ditautkan, lalu jalankan
   `npx playwright test <script_ref> --output=artifacts/<jobId> --trace=on`
   dari root/subdirectory repository, dengan timeout `TM_JOB_TIMEOUT_SECONDS`.
4. **Report** `report_automation_job`: exit code 0 → `pass`, selain itu → `fail`
   (timeout/spawn error → `blocked`). Kalau gagal dan masih ada sisa attempt,
   runner meminta `retry` dan server mengembalikan job ke antrean.

## Konfigurasi (`.env`)

Lihat [`.env.example`](.env.example) untuk daftar lengkap dan penjelasan tiap
variabel (URL server, token, direktori project, interval poll/heartbeat, timeout,
dan opsi artifact).

Mode interaktif dapat dijadikan default melalui `TM_PLAYWRIGHT_HEADED=true` dan
`TM_PLAYWRIGHT_SLOW_MO_MS=<milidetik>`. Nilai `headed`/`slow_mo_ms` pada payload
job memiliki prioritas lebih tinggi. Karena Playwright Test tidak menyediakan
flag CLI `--slow-mo`, project Playwright perlu meneruskan env runner ini:

```ts
export default defineConfig({
  use: {
    launchOptions: {
      slowMo: Number(process.env.TM_PLAYWRIGHT_SLOW_MO_MS || 0),
    },
  },
});
```

Job membawa `browser` (`chromium`, `firefox`, atau `webkit`) dan
`device_profile`. Browser diterapkan langsung melalui CLI Playwright, sedangkan
profil perangkat diteruskan sebagai `TM_PLAYWRIGHT_DEVICE_PROFILE`. Konfigurasi
Playwright dapat mengaktifkan emulasi mobile dengan profil tersebut:

```ts
import { defineConfig, devices } from '@playwright/test';
const profile = process.env.TM_PLAYWRIGHT_DEVICE_PROFILE;
export default defineConfig({
  use: profile && profile in devices ? devices[profile as keyof typeof devices] : {},
});
```

Set `TM_PLAYWRIGHT_VIEWPORT=WIDTHxHEIGHT` jika konfigurasi project mengubah
viewport default Playwright. Setiap laporan hasil menyertakan browser dan versi
binary browser yang dipakai Playwright, OS, viewport, base URL/build version dari Test
Run, serta commit SHA repository yang sudah disiapkan runner.

## Label / routing

Label runner = kapabilitas yang diiklankan (mis. `chromium`, `staging`,
`vpn-internal`). Saat memetakan script ke Test Case di UI, isi **Label runner**
agar job hanya diambil runner yang cocok. Job tanpa label bisa diambil runner mana
pun di project yang sama.

## Artifact

Runner mengumpulkan screenshot/video/trace/console log/network HAR/DOM snapshot
dari output Playwright dan
melaporkan **metadata**-nya. Seluruh bundle wajib berhasil di-upload ke bucket
private `automation-artifacts`; job akan berstatus `blocked` dan di-retry jika
signing atau salah satu upload gagal agar metadata parsial tidak tersimpan.
Jika kosong, dilaporkan sebagai path `file://`. Upload binary ke Storage
(Supabase/S3/MinIO) adalah deliverable terpisah.

Project Playwright wajib menerapkan kebijakan `screenshot: 'only-on-failure'`,
`video: 'retain-on-failure'`, dan `trace: 'retain-on-failure'`. Contoh siap pakai
ada di `example-project/playwright.config.ts`; fixture otomatis
`example-project/tests/observability.ts` wajib diimpor oleh spec agar console
browser bertimestamp, HAR, serta HTML DOM dan computed style penting dibuat pada
titik gagal. Semua bukti ditempatkan di output test per job sehingga ikut dalam
upload artifact runner.

## Docker

```bash
docker build -t testmanager-local-runner .
docker run --rm --env-file .env \
  -v /path/to/playwright-project:/project \
  -e TM_PROJECT_DIR=/project \
  testmanager-local-runner
```

Base image `mcr.microsoft.com/playwright` sudah menyertakan browser + dependency
OS-nya. Jalankan di jaringan yang sama dengan aplikasi under test.
