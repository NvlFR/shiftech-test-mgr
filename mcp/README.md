# TestManager MCP Server

Fondasi MCP server TestManager berbasis Node.js 20+, TypeScript, dan transport
stdio. Versi ini hanya menyediakan handshake MCP dan belum mendaftarkan tool.

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
| `TM_MCP_READONLY` | Tidak | `1` mengaktifkan read-only; `0` atau kosong menonaktifkannya. |

## Menjalankan

Node.js 20 dapat memuat file env tanpa dependency tambahan:

```bash
node --env-file=.env dist/index.js
```

Server berkomunikasi melalui stdin/stdout. Jangan menulis log biasa ke stdout
karena dapat merusak frame protokol MCP.
