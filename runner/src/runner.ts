import { AutomationApi, ApiError, type JobLogStream, type StepCommand } from './api.js';
import type { RunnerConfig } from './config.js';
import { executeJob } from './executor.js';
import { collectEnvironmentMetadata } from './environmentMetadata.js';
import { uploadArtifacts } from './upload.js';
import { hasCompleteFailureBundle } from './artifacts.js';
import { log } from './logger.js';
import type { LocalRepositoryMetadata } from './localRepository.js';
import { prepareJobRepository } from './repositoryWorkspace.js';
import { registerSecret, redactSecrets } from './security.js';

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

class JobLogStreamer {
  private sequence = 0;
  private pending: Array<{ stream: JobLogStream; content: string }> = [];
  private sending: Promise<void> = Promise.resolve();
  private timer: ReturnType<typeof setInterval>;

  constructor(private readonly api: AutomationApi, private readonly jobId: string, private readonly attempt: number) {
    this.timer = setInterval(() => this.flush(), 1_000);
  }

  push(stream: JobLogStream, content: string): void {
    content = redactSecrets(content);
    for (let offset = 0; offset < content.length; offset += 32_768) {
      const chunk = content.slice(offset, offset + 32_768);
      if (chunk) this.pending.push({ stream, content: chunk });
    }
  }

  flush(): void {
    const chunks = this.pending.splice(0);
    if (!chunks.length) return;
    this.sending = this.sending.then(async () => {
      for (const chunk of chunks) {
        const sequence = this.sequence++;
        try { await this.api.appendLog(this.jobId, this.attempt, sequence, chunk.stream, chunk.content); }
        catch (error) { log.warn('Live log chunk failed', { jobId: this.jobId, sequence, error: (error as Error).message }); }
      }
    });
  }

  async close(): Promise<void> {
    clearInterval(this.timer);
    this.flush();
    await this.sending;
  }
}

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

  private subscribeJobCommands(jobId: string, onCommand: (command: StepCommand) => void): () => void {
    let stopped = false;
    let polling = false;
    const poll = async () => {
      if (stopped || polling) return;
      polling = true;
      try {
        const commands = await this.api.pollCommands(jobId);
        if (stopped) return;
        commands.forEach(({ command }) => onCommand(command));
      } catch (error) {
        log.warn('Step command poll failed', { jobId, error: (error as Error).message });
      } finally { polling = false; }
    };
    void poll();
    const timer = setInterval(() => void poll(), this.config.pollIntervalMs);
    return () => { stopped = true; clearInterval(timer); };
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
        const logStreamer = new JobLogStreamer(this.api, job.id, job.attempt);
        try {
          registerSecret(job.repository?.token);
          workspace = await prepareJobRepository(this.config, job.repository);
          logStreamer.push('system', `Menjalankan ${job.script_ref}\n`);
          outcome = await executeJob(
            this.config,
            job,
            workspace.projectDir,
            (stream, content) => logStreamer.push(stream, content),
            (deliver) => this.subscribeJobCommands(job.id, deliver),
          );
        } catch (error) {
          outcome = {
            result: 'blocked' as const,
            errorMessage: error instanceof Error ? error.message : 'Repository tidak dapat disiapkan',
            artifacts: [],
          };
        } finally {
          await logStreamer.close();
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
