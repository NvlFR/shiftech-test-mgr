# TestManager MCP Server

TestManager menyediakan MCP server untuk mengakses data dan workflow QA dari
client seperti Claude Desktop atau editor yang mendukung MCP. Satu proses server
selalu terikat pada satu project melalui `TM_PROJECT_ID`; seluruh akses tetap
divalidasi oleh server dan RLS Supabase.

## Persyaratan dan setup

- Node.js 20 atau lebih baru dan npm.
- URL serta anon key Supabase untuk deployment TestManager.
- API token TestManager yang aktif dan memiliki scope yang diperlukan.
- UUID project yang dapat diakses oleh pemilik token.
- Migration MCP terkait sudah diterapkan ke deployment oleh pengelola database.

Dari root repository:

```bash
cd mcp
npm install
npm run build
cp .env.example .env
```

Isi `mcp/.env` hanya untuk pengujian lokal. Gunakan nilai milik environment
sendiri dan jangan commit file tersebut. Server stdio dapat diuji dengan:

```bash
cd mcp
node --env-file=.env dist/index.js
```

Transport default adalah stdio. Untuk self-hosted remote, set
`TM_MCP_TRANSPORT=http`; endpoint modern tersedia di `/mcp`, kompatibilitas SSE
di `/sse` dan `/messages`, serta health check di `/health`. Bind default HTTP
adalah `127.0.0.1:3000`.

### Environment variable

| Variable | Wajib | Fungsi |
| --- | --- | --- |
| `TM_SUPABASE_URL` | Ya | URL deployment Supabase TestManager. |
| `TM_SUPABASE_ANON_KEY` | Ya | Anon key Supabase; bukan pengganti RLS. |
| `TM_API_TOKEN` | Ya | API token TestManager. Dibaca saat startup, bukan argumen tool. |
| `TM_PROJECT_ID` | Ya | UUID project yang mengikat sesi server. |
| `TM_MCP_READONLY` | Tidak | `1` hanya meregistrasikan tool read; default `0`. |
| `TM_MCP_TRANSPORT` | Tidak | `stdio` (default) atau `http`. |
| `TM_MCP_HTTP_HOST` | Tidak | Host mode HTTP; default `127.0.0.1`. |
| `TM_MCP_HTTP_PORT` | Tidak | Port mode HTTP; default `3000`. |
| `TM_MCP_RATE_LIMIT` | Tidak | Batas panggilan per tool/token/window; default `120`. |
| `TM_MCP_RATE_LIMIT_WINDOW_SECONDS` | Tidak | Durasi window rate limit; default `60`. |
| `TM_MCP_RERUN_FAILED_MAX_TESTS` | Tidak | Ambang konfirmasi manusia untuk selective rerun; default `25`. |
| `TM_MCP_REPOSITORY_CACHE_DIR` | Tidak | Lokasi cache repository; default `/tmp/testmanager-mcp-repositories`. |
| `TM_SUPABASE_ACCESS_TOKEN` | Kondisional | JWT user approved untuk `issue.detect_duplicate`; simpan seperti secret. |

## Daftar tool

Nama tool memakai pola `testmanager.<domain>.<action>`.

### Discovery dan read

| Tool | Ringkasan |
| --- | --- |
| `testmanager.project.list` | Daftar project yang dapat diakses token. |
| `testmanager.project.get` | Detail project sesi. |
| `testmanager.requirement.list` | Daftar requirement dan filter coverage. |
| `testmanager.requirement.get` | Detail requirement serta traceability link. |
| `testmanager.requirement.coverage` | Ringkasan direct coverage, termasuk requirement uncovered. |
| `testmanager.testcase.search` | Cari Test Case berdasarkan module, tag, priority, status, atau teks. |
| `testmanager.testcase.get` | Detail Test Case, steps, expected result, dan versi. |
| `testmanager.testplan.list` | Daftar Test Plan project. |
| `testmanager.testplan.get` | Detail Test Plan beserta Test Case terurut. |
| `testmanager.testrun.list` | Daftar Test Run dengan summary on-the-fly. |
| `testmanager.testrun.get` | Detail Test Run dengan summary on-the-fly. |
| `testmanager.testresult.list` | Daftar hasil berdasarkan status, tester, atau run. |
| `testmanager.issue.search` | Cari Issue berdasarkan workflow dan relasi test. |
| `testmanager.issue.get` | Detail Issue beserta run dan Test Case terkait. |
| `testmanager.artifact.get_url` | Signed URL berumur pendek untuk artifact automation. |

### Write dan workflow

Tool berikut tidak diregistrasikan ketika `TM_MCP_READONLY=1`.

| Tool | Ringkasan |
| --- | --- |
| `testmanager.testcase.create_bulk` | Membuat maksimal 100 draft Test Case untuk review. |
| `testmanager.testcase.update` | Memperbarui Test Case sebagai perubahan review-only. |
| `testmanager.testcase.duplicate` | Menduplikasi Test Case untuk review manusia. |
| `testmanager.testcase.archive` | Mengarsipkan Test Case tanpa menghapusnya. |
| `testmanager.testplan.create` | Membuat Test Plan draft. |
| `testmanager.testplan.add_cases` | Menambah Test Case ke scope plan draft. |
| `testmanager.testplan.remove_cases` | Melepas Test Case dari scope plan tanpa menghapus case. |
| `testmanager.testrun.create` | Membuat run baru dan hasil awal; tidak menimpa run lama. |
| `testmanager.testrun.record_result` | Mencatat satu hasil menggunakan profile tester terdaftar. |
| `testmanager.testrun.complete` | Menyelesaikan run secara eksplisit, bukan otomatis. |
| `testmanager.issue.create` | Membuat Issue review-only yang wajib terkait Test Result. |
| `testmanager.issue.comment` | Menambahkan komentar Issue. |
| `testmanager.issue.update_status` | Mengubah status workflow Issue. |
| `testmanager.issue.detect_duplicate` | Analisis duplikasi via AI; hasil tetap review-only. |

### Automation

| Tool | Mode | Ringkasan |
| --- | --- | --- |
| `testmanager.automation.map_script` | Write | Memetakan Test Case ke script dan label runner. |
| `testmanager.automation.enqueue` | Write | Membuat run baru dan enqueue Test Case atau Test Plan. |
| `testmanager.automation.rerun_failed` | Write | Selective regression dari Issue resolved; dapat meminta konfirmasi manusia. |
| `testmanager.automation.job_status` | Read | Status job queued/running/passed/failed. |
| `testmanager.automation.runner_list` | Read | Daftar runner, kapabilitas, dan status online. |

### Repository dan analisis

| Tool | Ringkasan |
| --- | --- |
| `testmanager.repo.list_files` | Daftar source file pada repository project. |
| `testmanager.repo.read_file` | Membaca satu file teks dengan batas ukuran. |
| `testmanager.repo.search` | Pencarian literal pada source yang terlacak. |
| `testmanager.repo.diff` | Daftar perubahan dan bounded patch antar revision. |
| `testmanager.analysis.run_summary` | Ringkasan regression satu run. |
| `testmanager.analysis.flaky_candidates` | Kandidat test tidak stabil dari riwayat pass/fail. |
| `testmanager.analysis.suggest_retest` | Rekomendasi Test Case untuk retest. |

## Konfigurasi client

Contoh berikut menggunakan transport stdio dan placeholder, bukan kredensial
nyata. Ganti `/absolute/path/to/shiftech-test-mgr` dengan path absolut checkout.
Menjalankan `dist/index.js` mensyaratkan `npm run build` sudah berhasil.

### Claude Desktop: `claude_desktop_config.json`

Tambahkan entry berikut di dalam `mcpServers` konfigurasi Claude Desktop:

```json
{
  "mcpServers": {
    "testmanager": {
      "command": "node",
      "args": [
        "/absolute/path/to/shiftech-test-mgr/mcp/dist/index.js"
      ],
      "env": {
        "TM_SUPABASE_URL": "https://YOUR_SUPABASE_PROJECT.supabase.co",
        "TM_SUPABASE_ANON_KEY": "YOUR_SUPABASE_ANON_KEY",
        "TM_API_TOKEN": "YOUR_TESTMANAGER_API_TOKEN",
        "TM_PROJECT_ID": "00000000-0000-0000-0000-000000000000",
        "TM_MCP_READONLY": "1",
        "TM_MCP_TRANSPORT": "stdio"
      }
    }
  }
}
```

Restart Claude Desktop setelah menyimpan konfigurasi. Mulai dengan read-only,
pastikan tool discovery dan `testmanager.project.get` bekerja, lalu aktifkan
write hanya jika memang diperlukan dan token memiliki scope yang tepat.

### Project client: `.mcp.json`

Untuk client yang membaca konfigurasi MCP dari root project, buat `.mcp.json`
lokal dengan bentuk berikut:

```json
{
  "mcpServers": {
    "testmanager": {
      "type": "stdio",
      "command": "node",
      "args": [
        "/absolute/path/to/shiftech-test-mgr/mcp/dist/index.js"
      ],
      "env": {
        "TM_SUPABASE_URL": "https://YOUR_SUPABASE_PROJECT.supabase.co",
        "TM_SUPABASE_ANON_KEY": "YOUR_SUPABASE_ANON_KEY",
        "TM_API_TOKEN": "YOUR_TESTMANAGER_API_TOKEN",
        "TM_PROJECT_ID": "00000000-0000-0000-0000-000000000000",
        "TM_MCP_READONLY": "1",
        "TM_MCP_TRANSPORT": "stdio"
      }
    }
  }
}
```

Jangan commit file konfigurasi yang sudah diisi. Jika format client mendukung
referensi environment atau secret manager, gunakan mekanisme tersebut agar
nilai token tidak ditulis langsung ke file.

## Catatan keamanan

- Perlakukan `TM_API_TOKEN`, anon key, dan `TM_SUPABASE_ACCESS_TOKEN` sebagai
  secret sesuai kebijakan environment. Jangan menaruh token di source,
  dokumentasi, prompt, argumen tool, URL, atau log.
- Gunakan token dengan scope minimum dan satu `TM_PROJECT_ID` yang eksplisit.
  Project scope divalidasi ulang server dan RLS tetap menjadi batas keamanan.
- Gunakan `TM_MCP_READONLY=1` untuk discovery dan analisis. Mode ini membuat
  tool write tidak terlihat dan tidak dapat dipanggil.
- Tidak ada tool hapus project, Test Case, atau Test Run. Archive dan pelepasan
  case dari plan bukan penghapusan data.
- Approval Test Plan serta selective rerun di atas ambang membutuhkan konfirmasi
  manusia eksplisit. Output AI tetap draft/review-only.
- Setiap pemanggilan tool terkena rate limit dan dicatat ke `ai_audit_events`
  sebagai nama tool, status, dan latency tanpa payload mentah atau token.
- Signed URL artifact berumur pendek; jangan menyalin atau menyimpannya di log.
- Untuk HTTP/SSE, pertahankan bind loopback jika memungkinkan. Jika harus remote,
  gunakan TLS, firewall/reverse proxy, pembatasan jaringan, dan jangan jadikan
  satu proses project-scoped sebagai endpoint multi-tenant publik.
- Rotasi atau cabut token segera jika konfigurasi client, terminal history, atau
  mesin pengguna diduga terekspos.

Detail implementasi, migration prasyarat, dan troubleshooting pengembang ada di
[`mcp/README.md`](../mcp/README.md).
