import assert from 'node:assert/strict';
import test from 'node:test';
import { codegenScriptRef, createCodegenInvocation } from '../dist/codegen.js';
import { parseCliInput } from '../dist/config.js';

test('command codegen mewajibkan tepat satu URL HTTP(S)', () => {
  assert.deepEqual(parseCliInput(['codegen', 'https://app.example.test/login']), {
    command: 'codegen', options: {}, playwrightArgs: [], codegenUrl: 'https://app.example.test/login',
  });
  assert.throws(() => parseCliInput(['codegen']), /Usage/);
  assert.throws(() => parseCliInput(['codegen', 'file:\/\/private']), /HTTP\(S\)/);
});

test('invocation codegen membuang subcommand test dan menentukan file dari kode Test Case', () => {
  assert.equal(codegenScriptRef({ code: 'TC-0042' }), 'tests/tc-0042.spec.ts');
  assert.deepEqual(createCodegenInvocation({ playwrightCmd: 'npx playwright test' }, 'https://app.test', '/repo/tests/tc.spec.ts'), {
    command: 'npx', args: ['playwright', 'codegen', 'https://app.test', '--output', '/repo/tests/tc.spec.ts'],
  });
});
