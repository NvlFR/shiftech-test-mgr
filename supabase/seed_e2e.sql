-- Seed data deterministik untuk E2E Playwright (E2E-INFRA-02).
--
-- Terpisah dari data pengembangan lewat namespace, BUKAN Supabase project
-- terpisah: semua id fixture memakai prefix tetap "e2e0000-..." dan user
-- e2e@testmanager.local, di project Supabase yang sama dengan dev (satu
-- project untuk semua environment, keputusan sadar — lihat WORKLOG.md).
--
-- Idempoten & dipakai juga sebagai skrip RESET: jalankan ulang skrip ini
-- kapan saja sebelum sesi E2E untuk mengembalikan data test-scoped (project,
-- module, tag, test case, test plan, dst) ke kondisi awal. User E2E sendiri
-- TIDAK dihapus setiap reset (auth.users/profiles idempoten via ON CONFLICT)
-- supaya tidak menumpuk churn di auth.identities.
--
-- Jalankan lewat MCP Supabase (execute_sql) atau SQL Editor. Butuh akses
-- service_role (insert ke auth.users) — TIDAK BISA dijalankan dari anon key
-- di frontend/.env.

do $$
declare
  e2e_user_id uuid := 'e2e00000-0000-4000-8000-000000000001';
  e2e_project_id uuid := 'e2e00000-0000-4000-8000-000000000002';
  e2e_module_id uuid := 'e2e00000-0000-4000-8000-000000000003';
  e2e_tag_id uuid := 'e2e00000-0000-4000-8000-000000000004';
  e2e_test_case_id uuid := 'e2e00000-0000-4000-8000-000000000005';
  e2e_test_plan_id uuid := 'e2e00000-0000-4000-8000-000000000006';
  e2e_email text := 'e2e@testmanager.local';
  -- Fixture-only credential untuk akun seed E2E, bukan kredensial nyata.
  -- Login manual (Google OAuth) tetap satu-satunya jalur untuk user asli.
  e2e_password text := 'E2eSeed!2026';
begin
  -- === Reset: buang seluruh data test-scoped di bawah project E2E (cascade) ===
  delete from projects where id = e2e_project_id;

  -- === Auth user (idempoten — tidak dihapus tiap reset) ===
  -- GoTrue men-scan semua kolom varchar token/change sebagai string non-null
  -- (bug lama Supabase Auth: NULL di kolom ini bikin grant_type=password gagal
  -- dengan 500 "converting NULL to string is unsupported" — ditemukan saat
  -- verifikasi E2E-INFRA-02, 2026-08-03). Isi eksplisit dengan '', jangan
  -- andalkan default kolom.
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, confirmation_sent_at,
    raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, is_super_admin,
    confirmation_token, recovery_token, email_change,
    email_change_token_new, email_change_token_current,
    phone_change, phone_change_token, reauthentication_token
  )
  values (
    '00000000-0000-0000-0000-000000000000', e2e_user_id, 'authenticated', 'authenticated',
    e2e_email, crypt(e2e_password, gen_salt('bf')),
    now(), now(),
    '{"provider":"email","providers":["email"]}', '{"full_name":"E2E Test User"}',
    now(), now(), false,
    '', '', '',
    '', '',
    '', '', ''
  )
  on conflict (id) do nothing;

  insert into auth.identities (
    id, user_id, provider_id, provider, identity_data, created_at, updated_at, last_sign_in_at
  )
  values (
    gen_random_uuid(), e2e_user_id, e2e_user_id::text, 'email',
    jsonb_build_object('sub', e2e_user_id::text, 'email', e2e_email),
    now(), now(), now()
  )
  on conflict (provider_id, provider) do nothing;

  -- Trigger handle_new_user() (schema_093) sudah membuat profil 'pending'
  -- dengan username auto-generated `user_<8 char pertama id>` — deterministik
  -- karena e2e_user_id tetap, jadi tidak perlu (dan tidak bisa: username
  -- immutable setelah diset, lihat schema_092) diganti manual. Cukup approve
  -- jadi 'user' untuk fixture ini.
  update profiles set role = 'user', full_name = 'E2E Test User'
  where id = e2e_user_id;

  -- === Baseline domain data ===
  perform set_config('request.jwt.claim.sub', e2e_user_id::text, true);

  insert into projects (id, name, description, owner_id, status)
  values (e2e_project_id, 'E2E Fixture Project', 'Project tetap untuk seed E2E — jangan dipakai untuk data manual.', e2e_user_id, 'active');

  insert into modules (id, project_id, name)
  values (e2e_module_id, e2e_project_id, 'E2E Module');

  insert into tags (id, project_id, name)
  values (e2e_tag_id, e2e_project_id, 'e2e');

  insert into test_cases (id, project_id, module_id, title, objective, preconditions, steps, expected_result, priority, status)
  values (
    e2e_test_case_id, e2e_project_id, e2e_module_id,
    'E2E Login Test Case', 'Memverifikasi user bisa login', 'User terdaftar sudah approved',
    '1. Buka /login\n2. Isi email & password\n3. Klik Masuk',
    'User berhasil masuk dan diarahkan ke halaman utama',
    'high', 'active'
  );

  insert into test_case_tags (test_case_id, tag_id) values (e2e_test_case_id, e2e_tag_id);

  insert into test_plans (id, project_id, name, description, status)
  values (e2e_test_plan_id, e2e_project_id, 'E2E Smoke Plan', 'Test plan tetap untuk seed E2E', 'active');

  insert into test_plan_cases (test_plan_id, test_case_id, "order")
  values (e2e_test_plan_id, e2e_test_case_id, 1);
end $$;
