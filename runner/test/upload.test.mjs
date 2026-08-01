import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { uploadArtifacts } from '../dist/upload.js';

const config = {
  artifactUpload: true,
  supabaseUrl: 'https://example.supabase.co',
  supabaseAnonKey: 'anon-key',
  runnerToken: 'runner-token',
};

test('meng-upload seluruh bundle dan mengembalikan metadata Storage', async (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'tm-upload-'));
  const localPath = join(dir, 'failure.png');
  writeFileSync(localPath, 'image');
  const calls = [];
  t.mock.method(globalThis, 'fetch', async (url, init) => {
    calls.push({ url: String(url), init });
    if (calls.length === 1) return new Response(JSON.stringify({ bucket: 'automation-artifacts', uploads: [{ name: 'failure.png', path: 'project/job/failure.png', uploadUrl: 'https://upload.test/signed' }] }), { status: 200 });
    return new Response('', { status: 200 });
  });

  const result = await uploadArtifacts(config, 'job', [{ type: 'screenshot', name: 'failure.png', localPath }]);
  assert.deepEqual(result, [{ type: 'screenshot', name: 'failure.png', url: 'project/job/failure.png', path: 'project/job/failure.png', bucket: 'automation-artifacts' }]);
  assert.equal(calls.length, 2);
});

test('menolak metadata signing parsial agar bundle tidak tertaut setengah', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => new Response(JSON.stringify({ bucket: 'automation-artifacts', uploads: [] }), { status: 200 }));
  await assert.rejects(
    uploadArtifacts(config, 'job', [{ type: 'trace', name: 'trace.zip', localPath: '/tmp/not-read.zip' }]),
    /seluruh bundle/,
  );
});
