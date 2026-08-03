// Kredensial akun seed E2E — bukan akun nyata, dibuat oleh
// `supabase/seed_e2e.sql` (E2E-INFRA-02) khusus untuk Playwright. Login
// email/password hanya jalur dev sementara (Google OAuth dinonaktifkan
// sampai keluar mode dev, lihat docs/REMAINING_WORK.md).
export const E2E_USER = {
  email: 'e2e@testmanager.local',
  password: 'E2eSeed!2026',
};

export const E2E_PROJECT_ID = 'e2e00000-0000-4000-8000-000000000002';
export const E2E_PROJECT_NAME = 'E2E Fixture Project';
export const E2E_TEST_CASE_TITLE = 'E2E Login Test Case';
export const E2E_TEST_PLAN_NAME = 'E2E Smoke Plan';
