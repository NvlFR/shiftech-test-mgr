import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { isAbsolute, join, relative, resolve } from 'node:path';
import type { RunnerConfig } from './config.js';
import type { AutomationJob, JobLogStream, JobResult } from './api.js';
import { collectArtifacts, type CollectedArtifact } from './artifacts.js';
import { log } from './logger.js';
import { checkBaseUrlReachable } from './baseUrlSanityCheck.js';

export interface ExecutionOutcome {
  result: JobResult;
  errorMessage?: string;
  notes?: string;
  artifacts: CollectedArtifact[];
}

export interface ExecutionMode {
  headed: boolean;
  slowMoMs: number;
  pauseOnFailure: boolean;
}

const SUPPORTED_BROWSERS = ['chromium', 'firefox', 'webkit'] as const;
export interface ExecutionTarget { browser: (typeof SUPPORTED_BROWSERS)[number]; deviceProfile: string | null; }

export function resolveExecutionTarget(job: AutomationJob): ExecutionTarget {
  const browser = job.browser ?? 'chromium';
  if (!SUPPORTED_BROWSERS.includes(browser)) throw new Error('browser pada job tidak didukung');
  const deviceProfile = job.device_profile?.trim() || null;
  if (deviceProfile && !/^[\w .+()-]{1,80}$/.test(deviceProfile)) throw new Error('device_profile pada job tidak valid');
  return { browser, deviceProfile };
}

export function resolveExecutionMode(config: RunnerConfig, job: AutomationJob): ExecutionMode {
  const slowMoMs = job.slow_mo_ms == null ? config.slowMoMs : job.slow_mo_ms;
  if (!Number.isInteger(slowMoMs) || slowMoMs < 0) {
    throw new Error('slow_mo_ms pada job harus berupa integer milidetik >= 0');
  }
  return {
    headed: job.pause_on_failure ? true : job.headed ?? (slowMoMs > 0 ? true : config.headed),
    slowMoMs,
    pauseOnFailure: job.pause_on_failure ?? false,
  };
}

// Run one Playwright spec in an isolated per-job output directory. We invoke the
// Playwright CLI (no library import) so this runner has zero runtime deps and
// works against whatever Playwright version the project under test uses.
export async function executeJob(config: RunnerConfig, job: AutomationJob, projectDir = config.projectDir, onLog?: (stream: JobLogStream, content: string) => void): Promise<ExecutionOutcome> {
  if (isAbsolute(job.script_ref)) {
    return { result: 'blocked', errorMessage: 'script_ref harus berupa path relatif di repository', artifacts: [] };
  }
  const resolvedScript = resolve(projectDir, job.script_ref);
  const relativeScript = relative(projectDir, resolvedScript);
  if (!relativeScript || relativeScript.startsWith('..') || isAbsolute(relativeScript)) {
    return { result: 'blocked', errorMessage: 'script_ref berada di luar root repository', artifacts: [] };
  }

  let executionMode: ExecutionMode;
  let executionTarget: ExecutionTarget;
  try {
    executionMode = resolveExecutionMode(config, job);
    executionTarget = resolveExecutionTarget(job);
  } catch (error) {
    return { result: 'blocked', errorMessage: (error as Error).message, artifacts: [] };
  }

  const sanityCheck = await checkBaseUrlReachable(job.base_url);
  if (!sanityCheck.reachable) {
    return { result: 'blocked', errorMessage: sanityCheck.errorMessage, artifacts: [] };
  }
  if (job.base_url?.trim()) onLog?.('system', `Base URL ${new URL(job.base_url).origin} dapat dijangkau\n`);

  const jobOutputDir = join(config.artifactDir, job.id);
  mkdirSync(jobOutputDir, { recursive: true });

  const [cmd, ...baseArgs] = config.playwrightCmd.split(' ').filter(Boolean);
  const args = [
    ...baseArgs,
    relativeScript,
    `--output=${jobOutputDir}`,
    '--trace=retain-on-failure',
    '--reporter=list',
    `--browser=${executionTarget.browser}`,
    ...(executionMode.headed ? ['--headed'] : []),
  ];

  return new Promise<ExecutionOutcome>((resolve) => {
    log.info('Executing job', { jobId: job.id, testCase: job.test_case_code, script: job.script_ref, attempt: job.attempt, ...executionMode, ...executionTarget });
    const child = spawn(cmd ?? 'npx', args, {
      cwd: projectDir,
      env: { ...process.env, TM_PLAYWRIGHT_SLOW_MO_MS: String(executionMode.slowMoMs), TM_PLAYWRIGHT_DEVICE_PROFILE: executionTarget.deviceProfile ?? '', TM_PAUSE_ON_FAILURE: executionMode.pauseOnFailure ? '1' : '0' },
    });

    let stdout = '';
    let stderr = '';
    let settled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    child.stdout.on('data', (chunk: Buffer) => {
      const content = chunk.toString(); stdout += content; onLog?.('stdout', content);
      if (executionMode.pauseOnFailure && content.includes('[TM_PAUSE_ON_FAILURE]') && timer) {
        clearTimeout(timer);
        timer = null;
        onLog?.('system', 'Job gagal dan dijeda untuk inspeksi lokal; tekan Resume di Playwright Inspector.\n');
      }
    });
    child.stderr.on('data', (chunk: Buffer) => { const content = chunk.toString(); stderr += content; onLog?.('stderr', content); });

    timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      child.kill('SIGKILL');
      finalize('blocked', `Job timed out after ${config.jobTimeoutMs / 1000}s`);
    }, config.jobTimeoutMs);

    function finalize(result: JobResult, errorMessage?: string): void {
      const logPath = join(jobOutputDir, 'runner-output.log');
      try { writeFileSync(logPath, `$ ${cmd} ${args.join(' ')}\n\n[stdout]\n${stdout}\n[stderr]\n${stderr}\n`); } catch { /* best effort */ }
      const artifacts = collectArtifacts(jobOutputDir);
      resolve({ result, errorMessage, notes: errorMessage ? undefined : 'Automation run selesai', artifacts });
    }

    child.on('error', (err) => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      finalize('blocked', `Failed to spawn Playwright: ${err.message}`);
    });

    child.on('close', (code) => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      if (code === 0) finalize('pass');
      else finalize('fail', `Playwright exited with code ${code}`);
    });
  });
}
