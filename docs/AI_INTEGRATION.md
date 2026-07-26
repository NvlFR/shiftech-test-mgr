# AI Integration

Fitur AI TestManager berjalan melalui Supabase Edge Function `ai-gateway`.
Browser tidak pernah memanggil OpenAI/Gemini langsung dan tidak pernah menerima
API key provider.

## Fitur dan contract

Gateway mendukung action berikut:

- `generate_test_cases`: requirement teks, Excel, CSV, atau dokumen menjadi test case draft, scenario, dan edge case.
- `test_run_analysis`: ringkasan PASS/FAIL/SKIP/BLOCKED/NOT RUN, pola failure, area risiko, dan rekomendasi retest.
- `issue_draft`: draft Issue dari Test Result FAIL.
- `duplicate_issue_detection`: kandidat duplicate dengan confidence dan alasan.
- `assistant_search`: pencarian terstruktur dalam project aktif.

Semua respons diberi status `draft`/`review_only`. Frontend memvalidasi output
dengan Zod. Approval tetap aksi eksplisit user; AI tidak mengubah status Test
Result/Test Run dan tidak menghapus atau menggabungkan Issue.

## Secret Edge Function

Set secret di environment Supabase Edge Function, bukan di `frontend/.env`:

```text
SUPABASE_URL=https://<project>.supabase.co
SUPABASE_ANON_KEY=<anon-key>
AI_PROVIDER=mock
AI_MODEL=<model-provider>
OPENAI_API_KEY=<secret-jika-openai>
GEMINI_API_KEY=<secret-jika-gemini>
AI_TIMEOUT_MS=10000
AI_MAX_RETRIES=1
AI_RATE_LIMIT_MAX=20
AI_RATE_LIMIT_WINDOW_SECONDS=60
AI_ALLOWED_ORIGINS=http://localhost:5173
```

`AI_PROVIDER=mock` adalah default aman untuk development dan test. Jangan
menaruh secret asli di source code, dokumentasi, log, `VITE_*`, atau response
browser.

## Local development

Jalankan migration SQL berurutan sampai `supabase/schema_023_p3_ai_integration.sql`,
lalu jalankan:

```bash
supabase functions serve ai-gateway --env-file supabase/functions/.env
deno test supabase/functions/ai-gateway/contract.test.ts
cd frontend
npm run test
npm run build
```

File `.env` lokal harus di-ignore dan tidak boleh di-commit. Runtime Edge
Function membutuhkan Deno/Supabase CLI; pada environment tanpa keduanya,
gunakan contract test pada CI.

## Mengganti provider

Ubah `AI_PROVIDER` menjadi `openai` atau `gemini`, isi secret provider terkait,
dan pilih `AI_MODEL`. Provider adapter berada di
`supabase/functions/ai-gateway/providers.ts`; contract request/response dan UI
tidak perlu diubah. Jika secret provider tidak tersedia, gateway kembali ke
mock provider dan mengembalikan metadata provider `mock`.

## Security dan privacy

Gateway memvalidasi bearer token, project access melalui Supabase client dengan
JWT user, rate limit transactional melalui `consume_ai_rate_limit`, dan RLS
project isolation. Input yang dikirim ke provider direduksi dan dipotong; audit
menyimpan provider/model/prompt version/status/latency/hash saja di
`ai_audit_events`, bukan prompt atau response mentah.

Migration `schema_023_p3_ai_integration.sql` juga memperkuat `is_admin`,
`is_approved`, dan `has_project_access` agar user pending atau profile yang
di-soft-delete tidak bisa memakai membership lama.
