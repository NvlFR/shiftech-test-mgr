import { test, expect, type Page } from '@playwright/test';
import { E2E_USER } from './fixtures';

// E2E-INFRA-03 — alur utama: login → buat project → buat test case →
// buat test plan → jalankan test run → catat hasil FAIL → buat issue dari
// hasil FAIL itu. Berbeda dari smoke.spec.ts yang cuma memverifikasi harness
// bisa boot, ini menelusuri fungsionalitas nyata lewat UI.
//
// Setiap run membuat entity baru bernama unik (timestamp) karena reset
// otomatis belum ada (lihat catatan E2E-INFRA-02 di WORKLOG.md) — data
// menumpuk di project Supabase yang sama dengan dev sampai dibersihkan
// manual lewat supabase/seed_e2e.sql atau penghapusan project manual.

async function login(page: Page) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(E2E_USER.email);
  await page.locator('#password').fill(E2E_USER.password);
  await page.getByRole('button', { name: 'Masuk' }).click();
  await expect(page).toHaveURL(/\/$/);
}

test('alur utama: project → test case → test plan → run → hasil FAIL → issue', async ({ page }) => {
  const runId = Date.now();
  const projectName = `E2E Main Flow ${runId}`;
  const caseTitle = `E2E Login gagal ${runId}`;
  const planName = `E2E Plan ${runId}`;

  await login(page);

  // --- Buat project ---
  await page.goto('/projects');
  // AppSidebar juga punya shortcut "Project Baru" — scope ke tombol PageHeader (p-button).
  await page.locator('button.p-button', { hasText: 'Project Baru' }).click();
  await page.locator('#name').fill(projectName);
  await page.locator('#description').fill('Project sekali pakai dari E2E-INFRA-03');
  await page.getByRole('dialog').getByRole('button', { name: 'Simpan' }).click();
  await expect(page.getByRole('cell', { name: projectName })).toBeVisible();

  await page.getByRole('cell', { name: projectName }).click();
  await expect(page).toHaveURL(/\/projects\/[0-9a-f-]+/);

  // --- Buat test case ---
  await page.getByRole('tab', { name: 'Test Cases' }).click();
  await page.getByRole('button', { name: 'Test Case Baru' }).click();
  await page.locator('#case-title').fill(caseTitle);
  await page.locator('#case-steps').fill('1. Buka /login\n2. Isi email/password salah\n3. Klik Masuk');
  await page.locator('#case-expected').fill('Muncul pesan error, user tidak masuk');
  await page.getByRole('dialog').getByRole('button', { name: 'Simpan' }).click();
  await expect(page.getByRole('cell', { name: caseTitle })).toBeVisible();

  // --- Buat test plan + tambahkan test case ---
  await page.getByRole('tab', { name: 'Test Plans' }).click();
  await page.getByRole('button', { name: 'Test Plan Baru' }).click();
  await page.locator('#plan-name').fill(planName);
  await page.getByRole('dialog').getByRole('button', { name: 'Save' }).click();
  await expect(page.getByRole('cell', { name: planName })).toBeVisible();

  // Link kode plan ada di kolom terpisah dari kolom nama, jadi cari lewat baris.
  await page.getByRole('row', { name: new RegExp(planName) }).getByRole('link').click();
  await expect(page).toHaveURL(/\/test-plans\/[0-9a-f-]+/);

  await page.getByRole('button', { name: 'Tambah Test Case' }).click();
  const addCaseDialog = page.getByRole('dialog', { name: 'Tambah Test Case ke Plan' });
  await addCaseDialog.locator('.p-multiselect').click();
  await page.getByRole('option', { name: caseTitle, exact: false }).click();
  // Tutup overlay MultiSelect dengan klik ke header dialog, bukan Escape (Escape ikut menutup Dialog-nya).
  await addCaseDialog.getByText('Tambah Test Case ke Plan').click();
  await addCaseDialog.getByRole('button', { name: 'Tambahkan' }).click();
  await expect(addCaseDialog).toBeHidden();
  await expect(page.getByRole('cell', { name: caseTitle })).toBeVisible();

  // --- Setujui plan (draft -> active) supaya run bisa dimulai ---
  // Dropdown status plan ada di PageHeader — dibedakan dari dropdown filter lain
  // (yang juga w-10rem) lewat nilai "Draf" yang lagi ditampilkan.
  const statusDropdown = page.locator('.p-dropdown').filter({ hasText: 'Draf' });
  await statusDropdown.click();
  await page.getByRole('option', { name: 'Aktif' }).click();

  // --- Mulai test run ---
  await page.getByRole('tab', { name: 'Test Runs' }).click();
  await page.getByRole('button', { name: 'Mulai Test Run' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Mulai' }).click();
  await expect(page).toHaveURL(/\/test-runs\/[0-9a-f-]+/);

  // --- Catat hasil FAIL ---
  await page.getByRole('button', { name: 'Catat' }).click();
  await page.locator('#result-status').click();
  await page.getByRole('option', { name: 'Fail' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Simpan' }).click();
  // Dropdown opsi hasil pakai label literal "Fail", tapi tabel merender label
  // Indonesia (TEST_RESULT_STATUS_LABEL.fail = "Gagal").
  await expect(page.locator('.p-tag').filter({ hasText: 'Gagal' })).toBeVisible();

  // --- Buat issue dari hasil FAIL ---
  await page.getByRole('button', { name: 'Buat Issue' }).click();
  await expect(page.locator('#issue-title')).not.toBeEmpty();
  await page.locator('#issue-actual').fill('User tetap di halaman login tanpa pesan error');
  await page.getByRole('dialog').getByRole('button', { name: 'Buat Issue' }).click();

  await expect(page).toHaveURL(/\/test-runs\/[0-9a-f-]+\/issues/);
  await expect(page.getByText(`${caseTitle} gagal`)).toBeVisible();
});
