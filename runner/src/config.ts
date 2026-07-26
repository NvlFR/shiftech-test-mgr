import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

export interface RunnerConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  runnerToken: string;
  projectDir: string;
  playwrightCmd: string;
  pollIntervalMs: number;
  heartbeatIntervalMs: number;
  jobTimeoutMs: number;
  artifactDir: string;
  artifactBaseUrl: string | null;
  artifactUpload: boolean;
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

export function loadConfig(envPath = '.env'): RunnerConfig {
  loadDotEnv(resolve(process.cwd(), envPath));
  return {
    supabaseUrl: required('TM_SUPABASE_URL').replace(/\/+$/, ''),
    supabaseAnonKey: required('TM_SUPABASE_ANON_KEY'),
    runnerToken: required('TM_RUNNER_TOKEN'),
    projectDir: resolve(process.cwd(), process.env.TM_PROJECT_DIR?.trim() || '.'),
    playwrightCmd: process.env.TM_PLAYWRIGHT_CMD?.trim() || 'npx playwright test',
    pollIntervalMs: intEnv('TM_POLL_INTERVAL_SECONDS', 5) * 1000,
    heartbeatIntervalMs: intEnv('TM_HEARTBEAT_INTERVAL_SECONDS', 30) * 1000,
    jobTimeoutMs: intEnv('TM_JOB_TIMEOUT_SECONDS', 900) * 1000,
    artifactDir: resolve(process.cwd(), process.env.TM_ARTIFACT_DIR?.trim() || './artifacts'),
    artifactBaseUrl: process.env.TM_ARTIFACT_BASE_URL?.trim().replace(/\/+$/, '') || null,
    artifactUpload: (process.env.TM_ARTIFACT_UPLOAD?.trim().toLowerCase() ?? 'true') !== 'false',
  };
}
