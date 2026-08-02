import { automationRepository } from '../repositories/automationRepository';
import type { AutomationBrowser, AutomationJob, AutomationRunner, AutomationRunnerSecret, AutomationStepCommand, TestCase } from '../types/domain';

export type RunnerReadableStatus = 'online' | 'idle' | 'busy' | 'offline';
export type JobQueueDiagnosisReason = 'environment_unreachable' | 'all_runners_offline' | 'label_mismatch' | 'waiting_for_runner';
export interface JobQueueDiagnosis {
  reason: JobQueueDiagnosisReason;
  title: string;
  detail: string;
}
export const AUTOMATION_SERVER_VERSION = '0.1.0';
export function isRunnerVersionOutdated(version: string | null, serverVersion = AUTOMATION_SERVER_VERSION): boolean {
  if (!version) return false;
  const parse = (value: string) => value.split(/[+-]/)[0].split('.').map(Number);
  const a = parse(version), b = parse(serverVersion);
  return [0, 1, 2].some((index) => (a[index] ?? 0) !== (b[index] ?? 0) && (a[index] ?? 0) < (b[index] ?? 0) && b.slice(0, index).every((part, i) => part === (a[i] ?? 0)));
}

export function getRunnerReadableStatus(runner: AutomationRunner, jobs: AutomationJob[], now = Date.now()): RunnerReadableStatus {
  if (!runner.active || !runner.lastSeenAt || now - new Date(runner.lastSeenAt).getTime() >= 60_000) return 'offline';
  if (jobs.some((job) => job.runnerId === runner.id && job.status === 'running')) return 'busy';
  return now - new Date(runner.lastSeenAt).getTime() < 15_000 ? 'online' : 'idle';
}

export function getJobQueueDiagnosis(job: AutomationJob, runners: AutomationRunner[], jobs: AutomationJob[], now = Date.now()): JobQueueDiagnosis | null {
  if (job.status !== 'queued') return null;

  if (job.errorMessage?.startsWith('Sanity check base URL gagal:')) {
    return {
      reason: 'environment_unreachable',
      title: 'Environment tidak terjangkau',
      detail: `${job.errorMessage} Periksa Base URL environment dan akses jaringan dari mesin runner.`,
    };
  }

  const onlineRunners = runners.filter((runner) => getRunnerReadableStatus(runner, jobs, now) !== 'offline');
  if (onlineRunners.length === 0) {
    return {
      reason: 'all_runners_offline',
      title: 'Semua runner offline',
      detail: 'Tidak ada runner aktif dengan heartbeat terbaru. Nyalakan runner yang terhubung ke project ini.',
    };
  }

  const matchingRunner = onlineRunners.find((runner) => job.requiredLabels.every((label) => runner.labels.includes(label)));
  if (!matchingRunner) {
    const requiredLabels = job.requiredLabels.length ? job.requiredLabels.join(', ') : '(tanpa label)';
    return {
      reason: 'label_mismatch',
      title: 'Label runner tidak cocok',
      detail: `Job membutuhkan label ${requiredLabels}, tetapi tidak ada runner online yang memiliki semua label tersebut.`,
    };
  }

  return {
    reason: 'waiting_for_runner',
    title: 'Menunggu runner mengambil job',
    detail: `Runner ${matchingRunner.name} memenuhi label job dan sedang online. Job akan diambil pada siklus polling berikutnya.`,
  };
}

function createToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return `tm_${Array.from(bytes, (value) => value.toString(16).padStart(2, '0')).join('')}`;
}

function normalizeLabels(labels: string[]): string[] {
  return Array.from(new Set(labels.map((l) => l.trim().toLowerCase()).filter(Boolean)));
}

function normalizeScriptRef(scriptRef: string): string {
  return scriptRef.trim().replaceAll('\\', '/').replace(/^\.\//, '');
}

export function getEligibleScriptRunners(scriptRef: string, labels: string[], runners: AutomationRunner[], jobs: AutomationJob[] = [], now = Date.now()) {
  const normalizedRef = normalizeScriptRef(scriptRef);
  const normalizedLabels = normalizeLabels(labels);
  const labelMatches = runners.filter((runner) => getRunnerReadableStatus(runner, jobs, now) !== 'offline'
    && normalizedLabels.every((label) => runner.labels.includes(label)));
  return { labelMatches, fileMatches: labelMatches.filter((runner) => runner.scriptRefs.includes(normalizedRef)) };
}

export function buildBulkScriptRef(pattern: string, testCase: Pick<TestCase, 'code' | 'title'>): string {
  if (!pattern.includes('{code}') && !pattern.includes('{slug}')) throw new Error('Pola harus memuat {code} atau {slug}');
  const slug = testCase.title.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return normalizeScriptRef(pattern.replaceAll('{code}', testCase.code).replaceAll('{slug}', slug));
}

async function validateScriptRefs(inputs: Array<{ scriptRef: string; runnerLabels: string[] }>, projectId: string): Promise<void> {
  const runners = await automationService.listRunners(projectId);
  for (const input of inputs) {
    const { labelMatches, fileMatches } = getEligibleScriptRunners(input.scriptRef, input.runnerLabels, runners);
    if (!labelMatches.length) throw new Error(`Tidak ada runner online yang memenuhi label untuk ${input.scriptRef}`);
    if (!fileMatches.length) throw new Error(`File ${input.scriptRef} tidak ditemukan di runner online yang memenuhi label`);
  }
}

export const automationService = {
  async listRunners(projectId: string) {
    if (!projectId) throw new Error('Project wajib dipilih');
    const [runners, heartbeats, jobs] = await Promise.all([
      automationRepository.listRunners(projectId), automationRepository.listRunnerHeartbeats(projectId), automationRepository.listJobs(projectId),
    ]);
    return runners.map((runner) => {
      const heartbeat = heartbeats.find((item) => item.runnerId === runner.id);
      const runnerJobs = jobs.filter((job) => job.runnerId === runner.id);
      const lastJob = runnerJobs[0] ?? null;
      return { ...runner, version: heartbeat?.version ?? null, os: heartbeat?.os ?? null, startedAt: heartbeat?.startedAt ?? null, scriptRefs: heartbeat?.scriptRefs ?? [],
        browsers: Array.from(new Set(runnerJobs.map((job) => job.browser))),
        lastJob: lastJob ? { id: lastJob.id, status: lastJob.status, browser: lastJob.browser, finishedAt: lastJob.finishedAt, startedAt: lastJob.startedAt, queuedAt: lastJob.queuedAt } : null };
    });
  },
  listRunnerDiagnostics(projectId: string) {
    if (!projectId) throw new Error('Project wajib dipilih');
    return automationRepository.listRunnerDiagnostics(projectId);
  },
  enqueueRunnerDiagnostic(runnerId: string) {
    if (!runnerId) throw new Error('Runner tidak valid');
    return automationRepository.enqueueRunnerDiagnostic(runnerId);
  },
  createRunner(input: { projectId: string; name: string; labels: string[] }): Promise<AutomationRunnerSecret> {
    if (!input.projectId) throw new Error('Project wajib dipilih');
    if (!input.name.trim()) throw new Error('Nama runner tidak boleh kosong');
    return automationRepository.createRunner({ projectId: input.projectId, name: input.name.trim(), labels: normalizeLabels(input.labels), token: createToken() });
  },
  rotateRunnerToken(id: string) {
    if (!id) throw new Error('Runner tidak valid');
    return automationRepository.rotateRunnerToken(id, createToken());
  },
  setRunnerActive(id: string, active: boolean) {
    return automationRepository.setRunnerActive(id, active);
  },

  listScripts(projectId: string) {
    if (!projectId) throw new Error('Project wajib dipilih');
    return automationRepository.listScripts(projectId);
  },
  async createScript(input: { projectId: string; testCaseId: string; scriptRef: string; runnerLabels: string[]; createdBy: string }) {
    if (!input.projectId || !input.testCaseId) throw new Error('Project dan Test Case wajib dipilih');
    if (!input.scriptRef.trim()) throw new Error('Referensi script tidak boleh kosong');
    if (!input.createdBy) throw new Error('User tidak valid');
    const normalized = { ...input, scriptRef: normalizeScriptRef(input.scriptRef), runnerLabels: normalizeLabels(input.runnerLabels) };
    await validateScriptRefs([normalized], input.projectId);
    return automationRepository.createScript(normalized);
  },
  async createScriptsBulk(input: { projectId: string; testCases: Array<Pick<TestCase, 'id' | 'code' | 'title'>>; pattern: string; runnerLabels: string[]; createdBy: string }) {
    if (!input.projectId || !input.testCases.length) throw new Error('Pilih minimal satu Test Case');
    if (!input.createdBy) throw new Error('User tidak valid');
    const runnerLabels = normalizeLabels(input.runnerLabels);
    const rows = input.testCases.map((testCase) => ({ projectId: input.projectId, testCaseId: testCase.id, scriptRef: buildBulkScriptRef(input.pattern, testCase), runnerLabels, createdBy: input.createdBy }));
    if (new Set(rows.map((row) => row.scriptRef)).size !== rows.length) throw new Error('Pola menghasilkan referensi script duplikat');
    await validateScriptRefs(rows, input.projectId);
    return automationRepository.createScripts(rows);
  },
  deleteScript(id: string) {
    if (!id) throw new Error('Script tidak valid');
    return automationRepository.deleteScript(id);
  },

  async listJobs(projectId: string) {
    if (!projectId) throw new Error('Project wajib dipilih');
    const jobs = await automationRepository.listJobs(projectId);
    return jobs.map((job) => {
      const priorDurations = jobs
        .filter((candidate) => candidate.id !== job.id && candidate.testCaseId === job.testCaseId && candidate.startedAt && candidate.finishedAt)
        .map((candidate) => new Date(candidate.finishedAt!).getTime() - new Date(candidate.startedAt!).getTime())
        .filter((duration) => duration >= 0);
      return { ...job, estimatedDurationMs: priorDurations.length ? Math.round(priorDurations.reduce((sum, duration) => sum + duration, 0) / priorDurations.length) : null };
    });
  },
  listQueuedJobCounts() {
    return automationRepository.listQueuedJobProjectIds().then((projectIds) => projectIds.reduce<Record<string, number>>((counts, projectId) => {
      counts[projectId] = (counts[projectId] ?? 0) + 1;
      return counts;
    }, {}));
  },
  listJobLogs(jobId: string) {
    if (!jobId) throw new Error('Job tidak valid');
    return automationRepository.listJobLogs(jobId);
  },
  subscribeJobLogs(jobId: string, onInsert: Parameters<typeof automationRepository.subscribeJobLogs>[1]) {
    if (!jobId) throw new Error('Job tidak valid');
    return automationRepository.subscribeJobLogs(jobId, onInsert);
  },
  enqueue(input: { projectId: string; testPlanId: string; name?: string; environmentId?: string | null; maxAttempts?: number; browser: AutomationBrowser; deviceProfile?: string | null; pauseOnFailure?: boolean }) {
    if (!input.projectId || !input.testPlanId) throw new Error('Project dan Test Plan wajib dipilih');
    const maxAttempts = input.maxAttempts ?? 1;
    if (maxAttempts < 1 || maxAttempts > 10) throw new Error('Max attempts harus antara 1 dan 10');
    if (!['chromium', 'firefox', 'webkit'].includes(input.browser)) throw new Error('Browser tidak didukung');
    return automationRepository.enqueue({ ...input, deviceProfile: input.deviceProfile?.trim() || null, maxAttempts, pauseOnFailure: input.pauseOnFailure ?? false });
  },
  runLocally(input: { projectId: string; testPlanId: string; testCaseId: string; name?: string; browser: AutomationBrowser; deviceProfile?: string | null; pauseOnFailure?: boolean }) {
    if (!input.projectId || !input.testPlanId || !input.testCaseId) throw new Error('Project, Test Plan, dan Test Case wajib dipilih');
    if (!['chromium', 'firefox', 'webkit'].includes(input.browser)) throw new Error('Browser tidak didukung');
    return automationRepository.runLocally({ ...input, name: input.name?.trim() || undefined, deviceProfile: input.deviceProfile?.trim() || null, pauseOnFailure: input.pauseOnFailure ?? false });
  },
  cancelJob(id: string) {
    if (!id) throw new Error('Job tidak valid');
    return automationRepository.cancelJob(id);
  },
  sendStepCommand(jobId: string, command: AutomationStepCommand) {
    if (!jobId) throw new Error('Job tidak valid');
    if (!['next', 'continue'].includes(command)) throw new Error('Perintah step-through tidak valid');
    return automationRepository.sendStepCommand(jobId, command);
  },
  getArtifactSignedUrl(bucket: string, path: string) {
    if (!bucket || !path) throw new Error('Artifact tidak valid');
    return automationRepository.getArtifactSignedUrl(bucket, path);
  },
};
