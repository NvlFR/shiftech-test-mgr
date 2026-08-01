import assert from 'node:assert/strict';
import test from 'node:test';
import { classifyArtifact } from '../dist/artifacts.js';

test('mengklasifikasikan seluruh bundle bukti kegagalan', () => {
  assert.equal(classifyArtifact('test-failed-1.png'), 'screenshot');
  assert.equal(classifyArtifact('video.webm'), 'video');
  assert.equal(classifyArtifact('trace.zip'), 'trace');
  assert.equal(classifyArtifact('browser-console.log'), 'log');
  assert.equal(classifyArtifact('network.har'), 'network');
  assert.equal(classifyArtifact('dom-snapshot.html'), 'dom');
});
