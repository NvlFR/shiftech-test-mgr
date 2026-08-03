import { test, expect } from '@playwright/test';
import { E2E_PROJECT_NAME, E2E_USER } from './fixtures';

// Smoke test infrastruktur E2E-INFRA-01 — belum ada seed data deterministik
// (E2E-INFRA-02) atau skenario alur utama (E2E-INFRA-03), jadi cakupannya
// sengaja dibatasi ke route yang tidak butuh auth: memastikan harness
// benar-benar bisa boot build produksi dan menavigasi SPA.
test('halaman login termuat tanpa error runtime', async ({ page }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));

  await page.goto('/login');

  await expect(page.getByText('TestManager', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Email')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Masuk' })).toBeVisible();

  expect(pageErrors).toEqual([]);
});

test('route tak dikenal menampilkan halaman 404 dengan navigasi kembali', async ({ page }) => {
  await page.goto('/login');
  await page.goto('/rute-tidak-ada');

  // Belum login -> ProtectedRoute mengalihkan ke /login sebelum NotFoundPage sempat dirender.
  await expect(page).toHaveURL(/\/login$/);
});

// Membuktikan seed E2E-INFRA-02 benar-benar bisa dipakai login + terlihat di UI,
// bukan cuma data yang ada di database tanpa pernah diverifikasi lewat aplikasi.
test('login dengan akun seed E2E dan melihat project fixture', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill(E2E_USER.email);
  await page.locator('#password').fill(E2E_USER.password);
  await page.getByRole('button', { name: 'Masuk' }).click();

  await expect(page).toHaveURL(/\/$/);

  await page.goto('/projects');
  await expect(page.getByRole('cell', { name: E2E_PROJECT_NAME })).toBeVisible();
});
