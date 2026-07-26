import { defineConfig } from '@playwright/test';

// Minimal config for the runner smoke test. Artifacts (screenshot/video/trace)
// are turned on so the runner has something to collect and report back.
export default defineConfig({
  testDir: '.',
  reporter: 'list',
  use: {
    screenshot: 'on',
    video: 'on',
    trace: 'on',
  },
});
