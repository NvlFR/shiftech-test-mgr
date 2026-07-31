import { AutomationApi, ApiError } from './api.js';
import type { RunnerConfig } from './config.js';
import { executeJob } from './executor.js';
import { uploadArtifacts } from './upload.js';
import { log } from './logger.js';
import { inspectLocalRepository, type LocalRepositoryMetadata } from './localRepository.js';

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
    const repositoryMetadata: LocalRepositoryMetadata = inspectLocalRepository(this.config.projectDir);
    log.info('Local repository ready', { ...repositoryMetadata });

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
        const outcome = await executeJob(this.config, job);
        const artifacts = await uploadArtifacts(this.config, job.id, outcome.artifacts);
        const report = await this.api.report(job.id, {
          result: outcome.result,
          retry: outcome.result !== 'pass' && job.attempt < job.max_attempts,
          notes: outcome.notes,
          error_message: outcome.errorMessage,
          artifacts,
          repository: inspectLocalRepository(this.config.projectDir),
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
