import assert from 'node:assert/strict';
import test from 'node:test';

import { findRuntimeDependencies } from './check-agent-runtime-dependencies.mjs';

test('menerima manifest yang hanya memiliki devDependencies', () => {
  assert.deepEqual(findRuntimeDependencies({ devDependencies: { typescript: '^5.7.0' } }), []);
});

test('menolak semua bentuk runtime dependency', () => {
  assert.deepEqual(
    findRuntimeDependencies({
      dependencies: { production: '1.0.0' },
      optionalDependencies: { optional: '1.0.0' },
      peerDependencies: { peer: '1.0.0' },
      bundledDependencies: ['bundled'],
    }),
    [
      'dependencies.production',
      'optionalDependencies.optional',
      'peerDependencies.peer',
      'bundledDependencies.bundled',
    ],
  );
});
