import assert from 'node:assert/strict';
import test from 'node:test';
import { parseCliOptions } from '../dist/config.js';
import { resolveExecutionMode, resolveExecutionTarget } from '../dist/executor.js';

const config = { headed: false, slowMoMs: 0 };
const job = { headed: undefined, slow_mo_ms: null };

test('CLI headed dan slow-mo diparse, slow-mo otomatis headed', () => {
  assert.deepEqual(parseCliOptions(['--headed']), { headed: true });
  assert.deepEqual(parseCliOptions(['--slow-mo', '250']), { slowMoMs: 250, headed: true });
  assert.deepEqual(parseCliOptions(['--slow-mo=100']), { slowMoMs: 100, headed: true });
  assert.throws(() => parseCliOptions(['--slow-mo=-1']), /integer milidetik/);
});

test('target browser dan device profile divalidasi dari payload job', () => {
  assert.deepEqual(resolveExecutionTarget({ browser: 'webkit', device_profile: 'iPhone 13' }), { browser: 'webkit', deviceProfile: 'iPhone 13' });
  assert.deepEqual(resolveExecutionTarget({}), { browser: 'chromium', deviceProfile: null });
  assert.throws(() => resolveExecutionTarget({ browser: 'chrome' }), /tidak didukung/);
  assert.throws(() => resolveExecutionTarget({ device_profile: '../invalid' }), /tidak valid/);
});

test('opsi job mengalahkan default runner', () => {
  assert.deepEqual(resolveExecutionMode({ ...config, headed: true, slowMoMs: 50 }, { ...job, headed: false, slow_mo_ms: 10 }), {
    headed: false,
    slowMoMs: 10,
  });
});

test('slow-mo job tanpa headed eksplisit mengaktifkan browser terlihat', () => {
  assert.deepEqual(resolveExecutionMode(config, { ...job, slow_mo_ms: 75 }), { headed: true, slowMoMs: 75 });
});
