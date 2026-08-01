#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { basename, dirname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outputArg = process.argv.find((argument) => argument.startsWith('--output='));
const outputDir = outputArg
  ? resolve(root, outputArg.slice('--output='.length))
  : join(root, 'frontend', 'public', 'runner');
const runnerDir = join(root, 'runner');
const coreDir = join(root, 'packages', 'agent-core');

function run(command, args, cwd) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: 'utf8',
    stdio: 'pipe',
    env: { ...process.env, npm_config_cache: join(root, 'scripts', '.runner-release-cache') },
  });
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} gagal (status=${result.status}, signal=${result.signal})\n${result.error ?? ''}\n${result.stdout}${result.stderr}`);
  }
  return result.stdout.trim();
}

const stagingRoot = join(root, 'scripts', '.runner-release-staging');

try {
  await rm(stagingRoot, { recursive: true, force: true });
  run('npm', ['run', 'build'], coreDir);
  run('npm', ['run', 'build'], runnerDir);

  const runnerPackage = JSON.parse(await readFile(join(runnerDir, 'package.json'), 'utf8'));
  const corePackage = JSON.parse(await readFile(join(coreDir, 'package.json'), 'utf8'));
  if (runnerPackage.version !== corePackage.version) {
    throw new Error(`Versi runner (${runnerPackage.version}) dan agent-core (${corePackage.version}) harus sama`);
  }

  const packageDir = join(stagingRoot, 'package');
  const bundledCoreDir = join(packageDir, 'node_modules', '@testmanager', 'agent-core');
  await mkdir(bundledCoreDir, { recursive: true });
  await cp(join(runnerDir, 'dist'), join(packageDir, 'dist'), { recursive: true });
  await cp(join(coreDir, 'dist'), join(bundledCoreDir, 'dist'), { recursive: true });

  const releasePackage = {
    ...runnerPackage,
    scripts: undefined,
    devDependencies: undefined,
    dependencies: { '@testmanager/agent-core': corePackage.version },
    bundledDependencies: ['@testmanager/agent-core'],
  };
  const releaseCorePackage = {
    name: corePackage.name,
    version: corePackage.version,
    type: corePackage.type,
    exports: corePackage.exports,
    engines: corePackage.engines,
  };
  await writeFile(join(packageDir, 'package.json'), `${JSON.stringify(releasePackage, null, 2)}\n`);
  await writeFile(join(bundledCoreDir, 'package.json'), `${JSON.stringify(releaseCorePackage, null, 2)}\n`);

  run('npm', ['pack', '--ignore-scripts'], packageDir);
  const npmFilename = (await readdir(packageDir)).find((name) => name.endsWith('.tgz'));
  if (!npmFilename) throw new Error('npm pack tidak menghasilkan nama tarball');

  await mkdir(outputDir, { recursive: true });
  const filename = `tm-runner-${runnerPackage.version}.tgz`;
  const destination = join(outputDir, filename);
  await cp(join(packageDir, npmFilename), destination);
  const contents = await readFile(destination);
  const sha256 = createHash('sha256').update(contents).digest('hex');
  const checksumFilename = `${filename}.sha256`;
  await writeFile(join(outputDir, checksumFilename), `${sha256}  ${filename}\n`);
  await writeFile(join(outputDir, 'release.json'), `${JSON.stringify({
    version: runnerPackage.version,
    filename,
    url: `/runner/${filename}`,
    sha256,
    checksumFilename,
    checksumUrl: `/runner/${checksumFilename}`,
    size: contents.byteLength,
    generatedAt: new Date().toISOString(),
    minimumNodeVersion: '20',
  }, null, 2)}\n`);

  process.stdout.write(`Runner ${runnerPackage.version}: ${basename(destination)}\nSHA256: ${sha256}\nOutput: ${outputDir}\n`);
} finally {
  await rm(stagingRoot, { recursive: true, force: true });
  await rm(join(root, 'scripts', '.runner-release-cache'), { recursive: true, force: true });
}
