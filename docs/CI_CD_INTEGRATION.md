# Kontrak Integrasi CI/CD

Migration `supabase/schema_020_p2_cicd.sql` menambahkan pipeline project-scoped
dan RPC `ingest_cicd_test_run`. Karena aplikasi utama adalah SPA, runner eksternal
memanggil Supabase RPC langsung (atau membungkusnya dengan Edge Function/API
gateway organisasi). Tidak ada secret pipeline di frontend setelah dialog token
ditutup.

## Ingest

Simpan token sebagai secret `TM_PIPELINE_TOKEN`. Kirim `POST` ke:

```text
${VITE_SUPABASE_URL}/rest/v1/rpc/ingest_cicd_test_run
```

Header wajib: `apikey: <Supabase anon key>` dan `Content-Type: application/json`.
Body:

```json
{
  "p_token": "tm_<token>",
  "p_payload": {
    "name": "CI regression",
    "branch": "main",
    "commit_sha": "abc123",
    "build_number": "1842",
    "external_run_id": "github-1842",
    "environment_id": "<optional-environment-uuid>",
    "build_version": "1.4.0",
    "release": "2026.07",
    "results": [
      {"test_case_code": "TC-0001", "status": "pass"},
      {"test_case_code": "TC-0002", "status": "fail", "notes": "Assertion failed"},
      {"test_case_code": "TC-0003", "status": "skip"},
      {"test_case_code": "TC-0004", "status": "blocked"}
    ]
  }
}
```

`test_case_id` juga dapat dipakai. Setiap case harus sudah berada di cakupan
test plan pipeline. RPC membuat Test Run baru dan men-seed `test_results`; ia
tidak pernah menulis status ke `test_cases`, dan tidak mengubah Test Run menjadi
`completed`. Response berisi `run_id`, kode run, status aktual, dan summary
on-the-fly untuk dipakai sebagai exit status pipeline. Pipeline dapat memilih
GitHub Actions, GitLab CI, Jenkins, runner internal, atau generic.

Token di-hash SHA-256 di database, hanya ditampilkan sekali saat create/rotate,
dan ingest dibatasi 60 request per pipeline per menit. Error HTTP/RPC perlu
diubah runner menjadi failure; status `fail`/`blocked` pada summary biasanya
dapat dipetakan ke exit code non-zero oleh pipeline.

## Batasan deployment

Supabase RPC sudah menjadi kontrak server-side yang realistis untuk deployment
saat ini. Retry/queue webhook berada pada migration API/Webhook terpisah.
Untuk isolasi tambahan, produksi dapat menambahkan Edge Function/API gateway
yang meneruskan request setelah memvalidasi provider signature; jangan pernah
menaruh service-role key di browser atau pipeline log.
