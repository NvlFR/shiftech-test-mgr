# AI Gateway Edge Function

Gateway ini menerima `POST /functions/v1/ai-gateway` dengan header `Authorization: Bearer <access-token>` dan body:

```json
{
  "action": "generate_test_cases|test_run_analysis|issue_draft|duplicate_issue_detection|assistant_search",
  "projectId": "uuid"
}
```

Action `generate_test_cases` menerima `source` dan `options`; `test_run_analysis`
menerima `contractVersion: "v1"` dan `testRunId`; action lainnya menerima
payload terstruktur sesuai tipe di `contract.ts`. Alias action lama tetap
diterima selama rolling deployment.

Semua output divalidasi dengan kontrak Zod, dikembalikan sebagai `draft`, dan tidak pernah disimpan otomatis. Query context memakai Supabase client dengan bearer user sehingga RLS tetap berlaku; service-role key tidak digunakan.

## Secret/config

- `SUPABASE_URL`, `SUPABASE_ANON_KEY` — konfigurasi internal Edge Function.
- `AI_PROVIDER=mock` (default aman), atau `openai`/`gemini`.
- `OPENAI_API_KEY` atau `GEMINI_API_KEY` — hanya secret Edge Function, tidak boleh `VITE_*`.
- Opsional: `AI_MODEL`, `AI_TIMEOUT_MS`, `AI_MAX_RETRIES`, `AI_RATE_LIMIT_MAX`, `AI_RATE_LIMIT_WINDOW_MS`, `AI_ALLOWED_ORIGINS`.

Provider mock dipakai bila provider tidak dikonfigurasi lengkap. Adapter OpenAI dan Gemini hanya mengirim prompt yang sudah direda​​ksi, menggunakan timeout, retry terbatas, dan tidak mencetak response mentah.

## Local

Dengan Supabase CLI/Deno tersedia:

```bash
supabase functions serve ai-gateway --env-file supabase/functions/.env
deno test supabase/functions/ai-gateway/contract.test.ts
```

Jangan commit file `.env` atau secret. Untuk mengganti provider, ubah `AI_PROVIDER` dan secret terkait; kontrak request/response serta UI tidak berubah.
