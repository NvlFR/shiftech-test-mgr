import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { basename, resolve } from 'node:path';

const scaffoldFiles = (projectName: string): Record<string, string> => ({
  'package.json': `${JSON.stringify({
    name: projectName,
    version: '1.0.0',
    private: true,
    type: 'module',
    scripts: { test: 'playwright test', 'test:ui': 'playwright test --ui' },
    devDependencies: { '@playwright/test': '^1.49.0' },
  }, null, 2)}\n`,
  'playwright.config.ts': `import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  reporter: 'html',
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
  },
});
`,
  'tests/example.spec.ts': `import { expect, test } from '@playwright/test';

test('halaman utama dapat dibuka', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/.+/);
});
`,
  '.gitignore': `node_modules/
playwright-report/
test-results/
artifacts/
.env
`,
});

function safePackageName(directory: string): string {
  const normalized = basename(directory).toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, '');
  return normalized || 'playwright-tests';
}

export async function scaffoldPlaywrightProject(directory = '.'): Promise<string> {
  const target = resolve(process.cwd(), directory);
  const files = scaffoldFiles(safePackageName(target));
  await mkdir(target, { recursive: true });

  const conflicts: string[] = [];
  for (const path of Object.keys(files)) {
    try {
      await readFile(resolve(target, path));
      conflicts.push(path);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
  }
  if (conflicts.length > 0) {
    throw new Error(`Init dibatalkan agar tidak menimpa file yang sudah ada: ${conflicts.join(', ')}`);
  }

  const written: string[] = [];
  try {
    for (const [path, content] of Object.entries(files)) {
      const output = resolve(target, path);
      await mkdir(resolve(output, '..'), { recursive: true });
      await writeFile(output, content, { encoding: 'utf8', flag: 'wx' });
      written.push(output);
    }
  } catch (error) {
    await Promise.all(written.map((path) => rm(path, { force: true })));
    throw error;
  }
  return target;
}

export async function runInit(directory?: string): Promise<number> {
  const target = await scaffoldPlaywrightProject(directory);
  process.stdout.write(`Project Playwright dibuat di ${target}\n\nBerikutnya:\n  cd ${target}\n  npm install\n  npx playwright install\n  npm test\n`);
  return 0;
}
