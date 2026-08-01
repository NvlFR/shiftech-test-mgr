import { realpathSync, statSync } from 'node:fs';
import { delimiter, isAbsolute, relative, resolve } from 'node:path';

const secrets = new Set<string>();
const SENSITIVE_ENV_NAME = /(?:TOKEN|SECRET|PASSWORD|PASSWD|API_KEY|PRIVATE_KEY|CREDENTIAL|AUTHORIZATION|COOKIE)/i;

export function registerSecret(value: string | null | undefined): void {
  if (value && value.length >= 4) secrets.add(value);
}

export function registerEnvironmentSecrets(env: NodeJS.ProcessEnv = process.env): void {
  for (const [name, value] of Object.entries(env)) {
    if (SENSITIVE_ENV_NAME.test(name)) registerSecret(value);
  }
}

export function redactSecrets(value: string): string {
  let redacted = value;
  for (const secret of [...secrets].sort((a, b) => b.length - a.length)) {
    redacted = redacted.split(secret).join('[REDACTED]');
    try {
      const encoded = Buffer.from(secret, 'utf8').toString('base64');
      if (encoded.length >= 4) redacted = redacted.split(encoded).join('[REDACTED]');
    } catch { /* non-text secrets are ignored */ }
  }
  return redacted;
}

export class SecretRedactorStream {
  private pending = '';

  write(chunk: string): string {
    this.pending += chunk;
    const longest = Math.max(0, ...[...secrets].flatMap((secret) => [secret.length, Buffer.from(secret, 'utf8').toString('base64').length]));
    if (longest === 0) {
      const output = this.pending;
      this.pending = '';
      return output;
    }
    this.pending = redactSecrets(this.pending);
    const safeLength = Math.max(0, this.pending.length - (longest - 1));
    if (safeLength === 0) return '';
    const output = redactSecrets(this.pending.slice(0, safeLength));
    this.pending = this.pending.slice(safeLength);
    return output;
  }

  flush(): string {
    const output = redactSecrets(this.pending);
    this.pending = '';
    return output;
  }
}

export function redactValue(value: unknown): unknown {
  if (typeof value === 'string') return redactSecrets(value);
  if (Array.isArray(value)) return value.map(redactValue);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, redactValue(item)]));
  }
  return value;
}

export function assertPrivateConfigFile(path: string): void {
  if (process.platform === 'win32') return;
  const permissions = statSync(path).mode & 0o777;
  if ((permissions & 0o077) !== 0) {
    throw new Error(`Runner config harus private (chmod 600): ${path}`);
  }
}

export function parseTrustedRepositories(raw: string | undefined): string[] {
  if (!raw?.trim()) throw new Error('TM_TRUSTED_REPOSITORIES wajib berisi root repository yang dipercaya');
  return raw.split(delimiter).map((item) => item.trim()).filter(Boolean).map((item) => {
    if (!isAbsolute(item)) throw new Error('TM_TRUSTED_REPOSITORIES hanya menerima path absolut');
    return realpathSync(resolve(item));
  });
}

export function assertTrustedRepository(repositoryRoot: string, trustedRepositories: readonly string[]): string {
  const root = realpathSync(repositoryRoot);
  if (!trustedRepositories.includes(root)) {
    throw new Error(`Repository belum dipercaya oleh runner: ${root}. Tambahkan root ini ke TM_TRUSTED_REPOSITORIES setelah memeriksa seluruh repository, termasuk playwright.config.*`);
  }
  return root;
}

export function assertPathInsideRepository(repositoryRoot: string, path: string): string {
  const root = realpathSync(repositoryRoot);
  const target = realpathSync(path);
  const child = relative(root, target);
  if (!child || child === '..' || child.startsWith(`..${process.platform === 'win32' ? '\\' : '/'}`) || isAbsolute(child)) {
    throw new Error('script_ref berada di luar root repository');
  }
  return target;
}

export interface AllowedCommand { command: string; args: string[] }

export function parseAllowedPlaywrightCommand(raw: string | undefined): AllowedCommand {
  const command = raw?.trim() || 'npx playwright test';
  const allowed: Record<string, AllowedCommand> = {
    'npx playwright test': { command: 'npx', args: ['playwright', 'test'] },
    'npm exec playwright test': { command: 'npm', args: ['exec', 'playwright', 'test'] },
    'pnpm exec playwright test': { command: 'pnpm', args: ['exec', 'playwright', 'test'] },
    'yarn playwright test': { command: 'yarn', args: ['playwright', 'test'] },
  };
  const invocation = allowed[command];
  if (!invocation) throw new Error('TM_PLAYWRIGHT_CMD tidak diizinkan; gunakan invocation Playwright resmi yang didukung');
  return { command: invocation.command, args: [...invocation.args] };
}

export function childProcessEnvironment(overrides: NodeJS.ProcessEnv = {}): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {};
  for (const [name, value] of Object.entries(process.env)) {
    if (!SENSITIVE_ENV_NAME.test(name) && !name.startsWith('TM_SUPABASE_') && name !== 'TM_RUNNER_TOKEN') env[name] = value;
  }
  return { ...env, ...overrides };
}
