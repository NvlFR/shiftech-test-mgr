# Repository Credentials Edge Function

Endpoint `POST /functions/v1/repo-credentials` menerima bearer session pengguna
dan aksi `store`, `rotate`, atau `revoke`. Payload store/rotate berisi
`project_id`, `repository_id`, `token`, serta `expires_at` opsional. Revoke tidak
menerima token.

Fungsi memvalidasi session, lalu memanggil RPC service-role-only yang memeriksa
hak admin/manager project dan mengubah secret di Supabase Vault secara atomik.
Respons hanya berisi `credential_id` dan mask. Metadata waktu aman tersimpan pada
record repository untuk dibaca melalui alur repository biasa yang dilindungi RLS.
Nilai credential tidak mempunyai endpoint baca ulang dan tidak dicetak ke log.

Secret runtime yang dibutuhkan: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, dan
`SUPABASE_SERVICE_ROLE_KEY`. Jangan memakai prefix `VITE_` untuk ketiganya.

Contract test lokal (Node.js 22+):

```bash
node --experimental-strip-types --test supabase/functions/repo-credentials/contract.test.ts
```
