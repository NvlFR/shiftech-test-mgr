import { beforeEach, describe, expect, it, vi } from 'vitest';

const { repository } = vi.hoisted(() => ({
  repository: {
    getPolicy: vi.fn(), savePolicy: vi.fn(), backup: vi.fn(), downloadStorageObject: vi.fn(),
    uploadStorageObject: vi.fn(), restorePreview: vi.fn(), restore: vi.fn(), cleanupPreview: vi.fn(), cleanup: vi.fn(),
  },
}));

vi.mock('../repositories/backupRetentionRepository', () => ({ backupRetentionRepository: repository }));

import { backupRetentionService } from './backupRetentionService';

const metadata = {
  format: 'testmanager-project-backup', version: 1,
  attachments: { test: [{ storage_path: 'test_case/case-1/evidence.png', mime_type: 'image/png', size_bytes: 3 }], issue: [] },
};

describe('backupRetentionService', () => {
  beforeEach(() => vi.clearAllMocks());

  it('mengekspor object binary Storage di format backup versi 2', async () => {
    repository.backup.mockResolvedValue(metadata);
    repository.downloadStorageObject.mockResolvedValue(new Blob([new Uint8Array([1, 2, 3])], { type: 'image/png' }));

    const result = await backupRetentionService.backup('project-1');

    expect(repository.downloadStorageObject).toHaveBeenCalledWith('test-attachments', 'test_case/case-1/evidence.png');
    expect(result).toMatchObject({ version: 2, storage_objects: [{ bucket: 'test-attachments', path: 'test_case/case-1/evidence.png', mime_type: 'image/png', size_bytes: 3, base64: 'AQID' }] });
  });

  it('memulihkan metadata sebelum mengunggah object Storage dan menghitung hasilnya', async () => {
    repository.restore.mockResolvedValue({ projectId: 'project-1', inserted: 1, skipped: 0, storageRestored: 0, storageSkipped: 0 });
    repository.uploadStorageObject.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    const backup = {
      ...metadata,
      version: 2,
      storage_objects: [
        { bucket: 'test-attachments', path: 'test_case/case-1/evidence.png', mime_type: 'image/png', size_bytes: 3, base64: 'AQID' },
        { bucket: 'issue-attachments', path: 'issue-1/log.txt', mime_type: 'text/plain', size_bytes: 1, base64: 'eA==' },
      ],
      attachments: { ...metadata.attachments, issue: [{ storage_path: 'issue-1/log.txt', mime_type: 'text/plain', size_bytes: 1 }] },
    };

    await expect(backupRetentionService.restore('project-1', backup)).resolves.toMatchObject({ storageRestored: 1, storageSkipped: 1 });
    expect(repository.restore.mock.invocationCallOrder[0]).toBeLessThan(repository.uploadStorageObject.mock.invocationCallOrder[0]);
  });

  it('menolak binary yang tidak cocok dengan metadata sebelum restore database', async () => {
    const backup = { ...metadata, version: 2, storage_objects: [{ bucket: 'test-attachments', path: 'test_case/case-1/evidence.png', mime_type: 'image/png', size_bytes: 3, base64: 'eA==' }] };
    await expect(backupRetentionService.restore('project-1', backup)).rejects.toThrow('Ukuran atau tipe');
    expect(repository.restore).not.toHaveBeenCalled();
  });

  it('tetap menerima backup metadata-only versi lama', async () => {
    repository.restore.mockResolvedValue({ projectId: 'project-1', inserted: 2, skipped: 1, storageRestored: 0, storageSkipped: 0 });
    await expect(backupRetentionService.restore('project-1', metadata)).resolves.toMatchObject({ storageRestored: 0, storageSkipped: 0 });
    expect(repository.uploadStorageObject).not.toHaveBeenCalled();
  });

  it('menolak versi backup yang tidak didukung sebelum preview RPC', async () => {
    await expect(backupRetentionService.restorePreview({ ...metadata, version: 3 })).rejects.toThrow('Format atau versi');
    expect(repository.restorePreview).not.toHaveBeenCalled();
  });

  it('menolak backup versi 2 yang tidak memuat seluruh binary attachment', async () => {
    await expect(backupRetentionService.restore('project-1', { ...metadata, version: 2, storage_objects: [] })).rejects.toThrow('seluruh object Storage');
    expect(repository.restore).not.toHaveBeenCalled();
  });
});
