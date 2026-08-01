import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseCliInput } from '../dist/config.js';
import { scaffoldPlaywrightProject } from '../dist/init.js';

test('command init menerima paling banyak satu direktori tanpa opsi', () => {
  assert.deepEqual(parseCliInput(['init']), { command: 'init', options: {}, playwrightArgs: [], initDirectory: undefined });
  assert.deepEqual(parseCliInput(['init', 'e2e']), { command: 'init', options: {}, playwrightArgs: [], initDirectory: 'e2e' });
  assert.throws(() => parseCliInput(['init', 'one', 'two']), /Usage/);
  assert.throws(() => parseCliInput(['init', '--force']), /Usage/);
});

test('init membuat project Playwright minimal dengan kebijakan artifact kegagalan', async () => {
  const root = await mkdtemp(join(tmpdir(), 'tm-runner-init-'));
  const target = join(root, 'my-e2e');
  assert.equal(await scaffoldPlaywrightProject(target), target);

  const pkg = JSON.parse(await readFile(join(target, 'package.json'), 'utf8'));
  assert.equal(pkg.private, true);
  assert.equal(pkg.devDependencies['@playwright/test'], '^1.49.0');
  assert.equal(pkg.scripts.test, 'playwright test');
  const config = await readFile(join(target, 'playwright.config.ts'), 'utf8');
  assert.match(config, /screenshot: 'only-on-failure'/);
  assert.match(config, /video: 'retain-on-failure'/);
  assert.match(config, /trace: 'retain-on-failure'/);
  assert.match(await readFile(join(target, '.gitignore'), 'utf8'), /^node_modules\//);
  assert.match(await readFile(join(target, 'tests/example.spec.ts'), 'utf8'), /page\.goto\('\/'\)/);
});

test('init membatalkan seluruh scaffold sebelum menimpa file existing', async () => {
  const target = await mkdtemp(join(tmpdir(), 'tm-runner-init-conflict-'));
  await writeFile(join(target, 'package.json'), '{"keep":true}\n');
  await assert.rejects(scaffoldPlaywrightProject(target), /tidak menimpa.*package\.json/);
  assert.equal(await readFile(join(target, 'package.json'), 'utf8'), '{"keep":true}\n');
  await assert.rejects(readFile(join(target, 'playwright.config.ts')), /ENOENT/);
});
