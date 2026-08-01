import { AutomationApi, ApiError } from './api.js';
import type { RunnerConfig } from './config.js';
import { executeJob } from './executor.js';
import { collectEnvironmentMetadata } from './environmentMetadata.js';
import { uploadArtifacts } from './upload.js';
import { hasCompleteFailureBundle } from './artifacts.js';
import { log } from './logger.js';
import type { LocalRepositoryMetadata } from './localRepository.js';
import { prepareJobRepository } from './repositoryWorkspace.js';

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export class Runner {
  private readonly api: AutomationApi;
  private stopping = false;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;

  constructor(private readonly config: RunnerConfig) {
    this.api = new AutomationApi(config);
  }

  stop(): void {
    this.stopping = true;
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
  }

  private startHeartbeat(): void {
    const beat = async () => {
      try { await this.api.heartbeat(); }
      catch (err) { log.warn('Heartbeat failed', { error: (err as Error).message }); }
    };
    void beat();
    this.heartbeatTimer = setInterval(() => void beat(), this.config.heartbeatIntervalMs);
  }

  async start(): Promise<void> {
    log.info('Runner workspace ready', { repositoryCacheDir: this.config.repositoryCacheDir });

    // Fail fast if the token is invalid so operators get a clear error on boot.
    try {
      const hb = await this.api.heartbeat();
      log.info('Runner authenticated', { runnerId: hb.runner_id, active: hb.active });
    } catch (err) {
      if (err instanceof ApiError && err.status >= 400 && err.status < 500) {
        throw new Error(`Runner token rejected by server: ${err.message}`);
      }
      log.warn('Initial heartbeat failed, will keep retrying', { error: (err as Error).message });
    }

    this.startHeartbeat();
    log.info('Polling for jobs', { intervalMs: this.config.pollIntervalMs, projectDir: this.config.projectDir });

    while (!this.stopping) {
      try {
        const job = await this.api.poll();
        if (!job) {
          await sleep(this.config.pollIntervalMs);
          continue;
        }
        let workspace: { projectDir: string; metadata: LocalRepositoryMetadata } | null = null;
        let outcome;
        try {
          workspace = await prepareJobRepository(this.config, job.repository);
          outcome = await executeJob(this.config, job, workspace.projectDir);
        } catch (error) {
          outcome = {
            result: 'blocked' as const,
            errorMessage: error instanceof Error ? error.message : 'Repository tidak dapat disiapkan',
            artifacts: [],
          };
        }
        let artifacts;
        try {
          if (outcome.result === 'fail' && !hasCompleteFailureBundle(outcome.artifacts)) {
            throw new Error('Bundle bukti kegagalan tidak lengkap (screenshot, video, trace, console, HAR, dan DOM wajib tersedia)');
          }
          artifacts = await uploadArtifacts(this.config, job.id, outcome.artifacts);
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Upload bundle artifact gagal';
          const report = await this.api.report(job.id, {
            result: 'blocked',
            retry: job.attempt < job.max_attempts,
            error_message: message,
            artifacts: [],
            environment: collectEnvironmentMetadata(
              job,
              { browser: job.browser ?? 'chromium', deviceProfile: job.device_profile?.trim() || null },
              workspace?.metadata,
              workspace?.projectDir ?? this.config.projectDir,
            ),
          });
          log.error('Bundle artifact tidak dapat di-upload seluruhnya', { jobId: job.id, serverStatus: report.status, requeued: report.requeued });
          continue;
        }
        const environment = collectEnvironmentMetadata(
          job,
          { browser: job.browser ?? 'chromium', deviceProfile: job.device_profile?.trim() || null },
          workspace?.metadata,
          workspace?.projectDir ?? this.config.projectDir,
        );
        const report = await this.api.report(job.id, {
          result: outcome.result,
          retry: outcome.result !== 'pass' && job.attempt < job.max_attempts,
          notes: outcome.notes,
          error_message: outcome.errorMessage,
          artifacts,
          repository: workspace?.metadata,
          environment,
        });
        log.info('Reported job', { jobId: job.id, result: outcome.result, serverStatus: report.status, requeued: report.requeued, artifacts: artifacts.length });
      } catch (err) {
        log.error('Poll/execute cycle failed', { error: (err as Error).message });
        await sleep(this.config.pollIntervalMs);
      }
    }
    log.info('Runner stopped');
  }
}
