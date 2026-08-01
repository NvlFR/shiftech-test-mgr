import { readFileSync, existsSync } from 'node:fs';
import { isAbsolute, resolve } from 'node:path';

export interface RunnerConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  runnerToken: string;
  projectDir: string;
  repositoryCacheDir: string;
  playwrightCmd: string;
  headed: boolean;
  slowMoMs: number;
  pollIntervalMs: number;
  heartbeatIntervalMs: number;
  jobTimeoutMs: number;
  artifactDir: string;
  artifactBaseUrl: string | null;
  artifactUpload: boolean;
}

export interface RunnerCliOptions {
  headed?: boolean;
  slowMoMs?: number;
}

// Minimal zero-dependency .env loader. Existing process.env always wins so that
// container/CI env vars override the file.
function loadDotEnv(path: string): void {
  if (!existsSync(path)) return;
  for (const raw of readFileSync(path, 'utf8').split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    if (key in process.env) continue;
    let value = line.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

function required(name: string): string {
  const value = process.env[name];
  if (!value || !value.trim()) throw new Error(`Missing required env var: ${name}`);
  return value.trim();
}

function intEnv(name: string, fallback: number): number {
  const value = process.env[name];
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function nonNegativeIntEnv(name: string, fallback: number): number {
  const value = process.env[name];
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function boolEnv(name: string, fallback: boolean): boolean {
  const value = process.env[name]?.trim().toLowerCase();
  if (!value) return fallback;
  if (['1', 'true', 'yes', 'on'].includes(value)) return true;
  if (['0', 'false', 'no', 'off'].includes(value)) return false;
  return fallback;
}

export function parseCliOptions(args: string[]): RunnerCliOptions {
  const options: RunnerCliOptions = {};
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === '--headed') {
      options.headed = true;
      continue;
    }
    if (argument === '--slow-mo' || argument?.startsWith('--slow-mo=')) {
      const raw = argument === '--slow-mo' ? args[++index] : argument.slice('--slow-mo='.length);
      const value = Number(raw);
      if (!raw || !Number.isInteger(value) || value < 0) {
        throw new Error('--slow-mo harus berupa integer milidetik >= 0');
      }
      options.slowMoMs = value;
      options.headed = true;
      continue;
    }
    throw new Error(`Unknown runner option: ${argument}`);
  }
  return options;
}

export function loadConfig(envPath = '.env', cliOptions: RunnerCliOptions = {}): RunnerConfig {
  loadDotEnv(resolve(process.cwd(), envPath));
  const projectDir = process.env.TM_PROJECT_DIR?.trim() || process.cwd();
  if (process.env.TM_PROJECT_DIR && !isAbsolute(projectDir)) {
    throw new Error('TM_PROJECT_DIR must be an absolute path');
  }
  return {
    supabaseUrl: required('TM_SUPABASE_URL').replace(/\/+$/, ''),
    supabaseAnonKey: required('TM_SUPABASE_ANON_KEY'),
    runnerToken: required('TM_RUNNER_TOKEN'),
    projectDir: resolve(projectDir),
    repositoryCacheDir: resolve(process.cwd(), process.env.TM_REPOSITORY_CACHE_DIR?.trim() || './repositories'),
    playwrightCmd: process.env.TM_PLAYWRIGHT_CMD?.trim() || 'npx playwright test',
    headed: cliOptions.headed ?? boolEnv('TM_PLAYWRIGHT_HEADED', false),
    slowMoMs: cliOptions.slowMoMs ?? nonNegativeIntEnv('TM_PLAYWRIGHT_SLOW_MO_MS', 0),
    pollIntervalMs: intEnv('TM_POLL_INTERVAL_SECONDS', 5) * 1000,
    heartbeatIntervalMs: intEnv('TM_HEARTBEAT_INTERVAL_SECONDS', 30) * 1000,
    jobTimeoutMs: intEnv('TM_JOB_TIMEOUT_SECONDS', 900) * 1000,
    artifactDir: resolve(process.cwd(), process.env.TM_ARTIFACT_DIR?.trim() || './artifacts'),
    artifactBaseUrl: process.env.TM_ARTIFACT_BASE_URL?.trim().replace(/\/+$/, '') || null,
    artifactUpload: (process.env.TM_ARTIFACT_UPLOAD?.trim().toLowerCase() ?? 'true') !== 'false',
  };
}
