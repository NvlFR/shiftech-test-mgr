# TestManager MCP Server

Fondasi MCP server TestManager berbasis Node.js 20+, TypeScript, dan transport
stdio. Server mengautentikasi API token saat startup dan hanya membuka sesi jika
token aktif terikat ke `TM_PROJECT_ID`.

## Persyaratan

- Node.js 20 atau lebih baru
- npm
- URL dan anon key Supabase TestManager
- API token TestManager
- ID project yang mengikat sesi MCP

## Setup

```bash
cp .env.example .env
npm install
npm run build
```

Isi `.env` dengan kredensial milik environment Anda. File tersebut diabaikan
Git. Jangan menaruh token pada argumen tool atau menyimpannya di source code.

## Konfigurasi environment

| Variable | Wajib | Keterangan |
| --- | --- | --- |
| `TM_SUPABASE_URL` | Ya | URL project Supabase TestManager. |
| `TM_SUPABASE_ANON_KEY` | Ya | Supabase anon key; RLS tetap berlaku. |
| `TM_API_TOKEN` | Ya | API token TestManager untuk autentikasi. |
| `TM_PROJECT_ID` | Ya | Project yang mengikat satu sesi MCP. |
| `TM_MCP_READONLY` | Tidak | `1` mengaktifkan read-only dan membuat tool tulis tidak diregistrasikan; `0` atau kosong menonaktifkannya. |

Tool baru harus dimasukkan ke grup `read` atau `write` di
`src/tools/registry.ts`. Saat `TM_MCP_READONLY=1`, server hanya menjalankan
registrar grup `read`, sehingga tool tulis tidak muncul dalam discovery MCP dan
tidak dapat dipanggil.

## Menjalankan

Node.js 20 dapat memuat file env tanpa dependency tambahan:

```bash
node --env-file=.env dist/index.js
```

Server berkomunikasi melalui stdin/stdout. Jangan menulis log biasa ke stdout
karena dapat merusak frame protokol MCP.

Token hanya dibaca dari `TM_API_TOKEN`, tidak menjadi argumen tool. Setiap tool
yang ditambahkan wajib memakai `ProjectSession.assertToolArguments()` dan query
repository yang dibatasi `ProjectSession.projectId`; RLS tetap menjadi batas
keamanan terakhir. Jalankan `supabase/schema_047_mcp_auth.sql` setelah
`supabase/schema_025_fix_pgcrypto_and_audit.sql` melalui proses
migration proyek sebelum mengoperasikan server (jangan memasukkan token ke SQL).
Migration read tools `supabase/schema_048_mcp_read_batch_1.sql` juga harus
dijalankan sesudahnya, lalu `supabase/schema_049_mcp_read_batch_2.sql` untuk
tool Test Plan, Test Run, dan Test Result, serta
`supabase/schema_050_mcp_read_batch_3.sql` untuk Issue dan Requirement. Deploy
ulang Edge Function `automation-artifacts` agar `artifact.get_url` dapat membuat
signed download URL. Ikuti proses migration/deploy proyek; server tidak
menjalankannya otomatis.

Untuk tool tulis, jalankan `schema_051_mcp_write_test_cases_plans.sql`, lalu
`schema_052_mcp_testplan_approval.sql`. `testmanager.testplan.approve` hanya
menerima `approver_id` user aktif yang memiliki akses project dan
`explicit_approval: true`. RPC memvalidasi gate tersebut kembali dan mencatat
approver di audit log; API token tidak dianggap sebagai approver manusia.

## Tool read batch 1

- `testmanager.project.list` dan `testmanager.project.get`
- `testmanager.testcase.search`: filter module UUID/nama/kode, tag, priority,
  status, free-text, serta pagination cursor
- `testmanager.testcase.get`: detail, simple/structured steps, expected result,
  dan seluruh riwayat versi

Semua query mengirim token hanya dalam body RPC internal. RPC memvalidasi ulang
token aktif dan project scope; hasil dari project lain tidak dapat dikembalikan.

## Tool read batch 2

- `testmanager.testplan.list` dan `testmanager.testplan.get`; detail menyertakan
  test case sesuai urutan plan
- `testmanager.testrun.list` dan `testmanager.testrun.get`; summary selalu
  dihitung saat query dari `test_results`
- `testmanager.testresult.list`: filter status, tester, dan test run

Tool list memakai pagination cursor yang sama dengan batch 1. Nilai status hasil
di argumen tool menggunakan bentuk lowercase: `pass`, `fail`, `skip`, `blocked`,
atau `not_run`.

## Tool read batch 3

- `testmanager.issue.search` dan `testmanager.issue.get`: filter status,
  priority, assignee, test run, test case, dan free-text; hasil menyertakan
  relasi run/case.
- `testmanager.requirement.list` dan `testmanager.requirement.get`: daftar dan
  detail traceability, termasuk requirement tanpa test case.
- `testmanager.requirement.coverage`: total coverage direct link ke test case,
  termasuk jumlah requirement uncovered.
- `testmanager.artifact.get_url`: signed URL maksimal satu jam untuk path pada
  bucket private `automation-artifacts` yang berada di project sesi.
