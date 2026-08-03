import { defineConfig, devices } from '@playwright/test';

// E2E jalan lewat build produksi (`vite preview`), bukan `vite dev` — dev
// server memicu koneksi HMR websocket yang menghabiskan resource Playwright
// dan menyebabkan ERR_INSUFFICIENT_RESOURCES palsu pada navigasi berturut-turut
// (ditemukan saat smoke test manual Section 7, lihat WORKLOG.md 2026-08-02).
const PORT = 4174;
const BASE_URL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list']],
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    // Default browser terlihat (bukan headless) supaya jalannya test kelihatan
    // saat dijalankan lokal. Tetap headless di CI karena tidak ada display.
    headless: !!process.env.CI,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: `npm run build && npm run preview -- --port ${PORT} --strictPort`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
