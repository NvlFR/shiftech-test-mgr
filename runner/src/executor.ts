import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { RunnerConfig } from './config.js';
import type { AutomationJob, JobResult } from './api.js';
import { collectArtifacts, type CollectedArtifact } from './artifacts.js';
import { log } from './logger.js';

export interface ExecutionOutcome {
  result: JobResult;
  errorMessage?: string;
  notes?: string;
  artifacts: CollectedArtifact[];
}

// Run one Playwright spec in an isolated per-job output directory. We invoke the
// Playwright CLI (no library import) so this runner has zero runtime deps and
// works against whatever Playwright version the project under test uses.
export function executeJob(config: RunnerConfig, job: AutomationJob): Promise<ExecutionOutcome> {
  const jobOutputDir = join(config.artifactDir, job.id);
  mkdirSync(jobOutputDir, { recursive: true });

  const [cmd, ...baseArgs] = config.playwrightCmd.split(' ').filter(Boolean);
  const args = [
    ...baseArgs,
    job.script_ref,
    `--output=${jobOutputDir}`,
    '--trace=on',
    '--reporter=list',
  ];

  return new Promise<ExecutionOutcome>((resolve) => {
    log.info('Executing job', { jobId: job.id, testCase: job.test_case_code, script: job.script_ref, attempt: job.attempt });
    const child = spawn(cmd ?? 'npx', args, { cwd: config.projectDir, env: process.env });

    let stdout = '';
    let stderr = '';
    let settled = false;
    child.stdout.on('data', (chunk: Buffer) => { stdout += chunk.toString(); });
    child.stderr.on('data', (chunk: Buffer) => { stderr += chunk.toString(); });

    const timer = setTimeout(() => {
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
      clearTimeout(timer);
      finalize('blocked', `Failed to spawn Playwright: ${err.message}`);
    });

    child.on('close', (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (code === 0) finalize('pass');
      else finalize('fail', `Playwright exited with code ${code}`);
    });
  });
}
