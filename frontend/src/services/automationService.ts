import { automationRepository } from '../repositories/automationRepository';
import type { AutomationBrowser, AutomationRunnerSecret } from '../types/domain';

function createToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return `tm_${Array.from(bytes, (value) => value.toString(16).padStart(2, '0')).join('')}`;
}

function normalizeLabels(labels: string[]): string[] {
  return Array.from(new Set(labels.map((l) => l.trim().toLowerCase()).filter(Boolean)));
}

export const automationService = {
  listRunners(projectId: string) {
    if (!projectId) throw new Error('Project wajib dipilih');
    return automationRepository.listRunners(projectId);
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
  createScript(input: { projectId: string; testCaseId: string; scriptRef: string; runnerLabels: string[]; createdBy: string }) {
    if (!input.projectId || !input.testCaseId) throw new Error('Project dan Test Case wajib dipilih');
    if (!input.scriptRef.trim()) throw new Error('Referensi script tidak boleh kosong');
    if (!input.createdBy) throw new Error('User tidak valid');
    return automationRepository.createScript({ ...input, scriptRef: input.scriptRef.trim(), runnerLabels: normalizeLabels(input.runnerLabels) });
  },
  deleteScript(id: string) {
    if (!id) throw new Error('Script tidak valid');
    return automationRepository.deleteScript(id);
  },

  listJobs(projectId: string) {
    if (!projectId) throw new Error('Project wajib dipilih');
    return automationRepository.listJobs(projectId);
  },
  listJobLogs(jobId: string) {
    if (!jobId) throw new Error('Job tidak valid');
    return automationRepository.listJobLogs(jobId);
  },
  subscribeJobLogs(jobId: string, onInsert: Parameters<typeof automationRepository.subscribeJobLogs>[1]) {
    if (!jobId) throw new Error('Job tidak valid');
    return automationRepository.subscribeJobLogs(jobId, onInsert);
  },
  enqueue(input: { projectId: string; testPlanId: string; name?: string; environmentId?: string | null; maxAttempts?: number; browser: AutomationBrowser; deviceProfile?: string | null }) {
    if (!input.projectId || !input.testPlanId) throw new Error('Project dan Test Plan wajib dipilih');
    const maxAttempts = input.maxAttempts ?? 1;
    if (maxAttempts < 1 || maxAttempts > 10) throw new Error('Max attempts harus antara 1 dan 10');
    if (!['chromium', 'firefox', 'webkit'].includes(input.browser)) throw new Error('Browser tidak didukung');
    return automationRepository.enqueue({ ...input, deviceProfile: input.deviceProfile?.trim() || null, maxAttempts });
  },
  cancelJob(id: string) {
    if (!id) throw new Error('Job tidak valid');
    return automationRepository.cancelJob(id);
  },
  getArtifactSignedUrl(bucket: string, path: string) {
    if (!bucket || !path) throw new Error('Artifact tidak valid');
    return automationRepository.getArtifactSignedUrl(bucket, path);
  },
};
