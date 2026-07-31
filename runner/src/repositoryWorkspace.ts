import { execFile } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { isAbsolute, join, normalize, relative, resolve } from 'node:path';
import { promisify } from 'node:util';
import type { JobRepository } from './api.js';
import type { RunnerConfig } from './config.js';
import { inspectLocalRepository, type LocalRepositoryMetadata } from './localRepository.js';

const execFileAsync = promisify(execFile);

type GitCommand = (args: string[], env: NodeJS.ProcessEnv) => Promise<void>;
type InspectRepository = (repositoryPath: string) => LocalRepositoryMetadata;

async function runGit(args: string[], env: NodeJS.ProcessEnv): Promise<void> {
  await execFileAsync('git', args, { env, maxBuffer: 1024 * 1024 });
}

function gitEnvironment(token: string | null): NodeJS.ProcessEnv {
  if (!token) return { ...process.env, GIT_TERMINAL_PROMPT: '0' };
  const authorization = Buffer.from(`x-access-token:${token}`, 'utf8').toString('base64');
  return {
    ...process.env,
    GIT_TERMINAL_PROMPT: '0',
    GIT_CONFIG_COUNT: '1',
    GIT_CONFIG_KEY_0: 'http.extraHeader',
    GIT_CONFIG_VALUE_0: `Authorization: Basic ${authorization}`,
  };
}

function resolveSubdirectory(repositoryRoot: string, subdirectory: string | null): string {
  if (!subdirectory) return repositoryRoot;
  if (isAbsolute(subdirectory)) throw new Error('Repository subdirectory harus berupa path relatif');
  const resolved = resolve(repositoryRoot, normalize(subdirectory));
  const childPath = relative(repositoryRoot, resolved);
  if (!childPath || childPath.startsWith('..') || isAbsolute(childPath)) {
    throw new Error('Repository subdirectory berada di luar root repository');
  }
  if (!existsSync(resolved)) throw new Error(`Repository subdirectory tidak ditemukan: ${subdirectory}`);
  return resolved;
}

export async function prepareJobRepository(
  config: RunnerConfig,
  repository: JobRepository | null,
  gitCommand: GitCommand = runGit,
  inspectRepository: InspectRepository = inspectLocalRepository,
): Promise<{ projectDir: string; metadata: LocalRepositoryMetadata }> {
  if (!repository) {
    return { projectDir: config.projectDir, metadata: inspectRepository(config.projectDir) };
  }

  if (repository.source_type === 'local_path') {
    const metadata = inspectRepository(repository.url_or_path);
    return {
      projectDir: resolveSubdirectory(repository.url_or_path, repository.subdirectory),
      metadata,
    };
  }

  let repositoryUrl: URL;
  try {
    repositoryUrl = new URL(repository.url_or_path);
  } catch {
    throw new Error('Remote repository harus menggunakan URL HTTP(S)');
  }
  if (!['http:', 'https:'].includes(repositoryUrl.protocol)) {
    throw new Error('Remote repository harus menggunakan URL HTTP(S)');
  }
  if (repositoryUrl.username || repositoryUrl.password) {
    throw new Error('Credential tidak boleh disimpan di URL repository');
  }
  if (repository.source_type === 'github_private' && !repository.token) {
    throw new Error('Credential private repository tidak tersedia');
  }

  mkdirSync(config.repositoryCacheDir, { recursive: true });
  const repositoryRoot = join(config.repositoryCacheDir, repository.id);
  const branch = repository.default_branch || 'main';
  const env = gitEnvironment(repository.token);

  if (!existsSync(join(repositoryRoot, '.git'))) {
    await gitCommand(['clone', '--branch', branch, '--single-branch', '--', repository.url_or_path, repositoryRoot], env);
  } else {
    await gitCommand(['-C', repositoryRoot, 'remote', 'set-url', 'origin', repository.url_or_path], env);
    await gitCommand(['-C', repositoryRoot, 'checkout', branch], env);
    await gitCommand(['-C', repositoryRoot, 'pull', '--ff-only', 'origin', branch], env);
  }

  return {
    projectDir: resolveSubdirectory(repositoryRoot, repository.subdirectory),
    metadata: inspectRepository(repositoryRoot),
  };
}
