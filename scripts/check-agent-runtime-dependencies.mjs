#!/usr/bin/env node

import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const runtimeDependencyFields = [
  'dependencies',
  'optionalDependencies',
  'peerDependencies',
  'bundledDependencies',
  'bundleDependencies',
];

export function findRuntimeDependencies(packageJson) {
  return runtimeDependencyFields.flatMap((field) => {
    const value = packageJson[field];
    if (Array.isArray(value)) return value.map((name) => `${field}.${name}`);
    if (value && typeof value === 'object') {
      return Object.keys(value).map((name) => `${field}.${name}`);
    }
    return [];
  });
}

export async function checkManifests(manifestPaths) {
  const violations = [];
  for (const manifestPath of manifestPaths) {
    const packageJson = JSON.parse(await readFile(manifestPath, 'utf8'));
    for (const dependency of findRuntimeDependencies(packageJson)) {
      violations.push(`${manifestPath}: ${dependency}`);
    }
  }
  return violations;
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  const root = fileURLToPath(new URL('..', import.meta.url));
  const manifests = process.argv.slice(2);
  const manifestPaths = (manifests.length > 0
    ? manifests
    : ['runner/package.json', 'packages/agent-core/package.json'])
    .map((manifest) => resolve(root, manifest));
  const violations = await checkManifests(manifestPaths);

  if (violations.length > 0) {
    console.error('Runtime dependency dilarang untuk Local Agent:');
    for (const violation of violations) console.error(`- ${violation}`);
    console.error('Gunakan devDependencies; nol runtime dependency adalah batas keamanan supply chain.');
    process.exitCode = 1;
  } else {
    console.log('Guard runtime dependency lulus: runner dan agent-core hanya memakai devDependencies.');
  }
}
