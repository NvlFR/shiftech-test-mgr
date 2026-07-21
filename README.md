# TestManager (shiftech-test-mgr)

Aplikasi internal sederhana untuk manajemen **Test Plan** dan **Test Case**
suatu project — dibangun sebagai eksperimen arsitektur **React + PrimeReact +
Supabase**.

Ini bagian dari seri eksperimen framework di `software-projects/` (lihat juga
[`exp-prime-vue`](../exp-prime-vue) untuk versi Vue).

## Stack

- **React 19 + TypeScript** (Vite, SPA murni tanpa SSR)
- **PrimeReact v10** — UI library rich/lengkap setara PrimeVue, fully open
  source
- **Supabase** — Postgres BaaS untuk storage + Auth (Google OAuth)
- **react-router-dom** — routing client-side
- Clean architecture: **Repository → Service → Hook → Component/Page**
- **Auth & RBAC**: login Google, role `pending`/`user`/`admin`, approval manual
  oleh admin

## Struktur Repo

```
frontend/   → Aplikasi React + Vite (SPA)
backend/    → (eksperimental) backend custom, terpisah dari frontend
supabase/   → Schema SQL shared
docs/       → PRD, arsitektur, task breakdown
```

## Getting Started

```bash
cd frontend
npm install
cp .env.example .env   # isi VITE_SUPABASE_URL & VITE_SUPABASE_ANON_KEY dari dashboard Supabase
npm run dev
```

Jalankan `supabase/schema.sql` lalu `supabase/schema_auth.sql` (urutan penting)
di Supabase SQL Editor untuk membuat tabel + RBAC (dan `supabase/seed.sql` untuk
data contoh).

Untuk mengaktifkan login Google dan menetapkan admin pertama, lihat bagian
"Setup Google OAuth" di [`AGENTS.md`](./AGENTS.md).

## Scripts

Dijalankan dari dalam folder `frontend/`:

| Command           | Deskripsi                     |
| ----------------- | ----------------------------- |
| `npm run dev`     | Dev server                    |
| `npm run build`   | Type-check + build production |
| `npm run preview` | Preview hasil build           |
| `npm run lint`    | ESLint                        |

## Dokumentasi

- [`CLAUDE.md`](./CLAUDE.md) / [`AGENTS.md`](./AGENTS.md) — panduan untuk AI
  coding agent
- [`docs/PRD.md`](docs/PRD.md) — kebutuhan produk
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — arsitektur teknis
- [`docs/TASKS.md`](docs/TASKS.md) — breakdown pekerjaan
- [`FEATURES.md`](./FEATURES.md) — status fitur
- [`TODO.md`](./TODO.md) — sprint board aktif
