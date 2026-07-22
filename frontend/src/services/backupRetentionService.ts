import { backupRetentionRepository } from '../repositories/backupRetentionRepository';

function validateDays(days: number) {
  if (!Number.isInteger(days) || days < 1 || days > 3650) throw new Error('Retensi harus antara 1 dan 3650 hari');
}

export const backupRetentionService = {
  getPolicy: backupRetentionRepository.getPolicy,
  savePolicy(input: Parameters<typeof backupRetentionRepository.savePolicy>[0]) {
    validateDays(input.retentionDays);
    if (input.attachmentRetentionDays !== null) validateDays(input.attachmentRetentionDays);
    return backupRetentionRepository.savePolicy(input);
  },
  backup(projectId: string) {
    if (!projectId) throw new Error('Project wajib dipilih');
    return backupRetentionRepository.backup(projectId);
  },
  restorePreview: backupRetentionRepository.restorePreview,
  restore(projectId: string, backupData: Record<string, unknown>) {
    if (!projectId || !backupData) throw new Error('Target dan backup wajib diisi');
    return backupRetentionRepository.restore(projectId, backupData);
  },
  cleanupPreview: backupRetentionRepository.cleanupPreview,
  cleanup(projectId: string | null) { return backupRetentionRepository.cleanup(projectId); },
};
