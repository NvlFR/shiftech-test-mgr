import { backupRetentionRepository } from '../repositories/backupRetentionRepository';
import type { BackupStorageObject, RestorePreview, RestoreResult } from '../types/domain';

function validateDays(days: number) {
  if (!Number.isInteger(days) || days < 1 || days > 3650) throw new Error('Retensi harus antara 1 dan 3650 hari');
}

type AttachmentMetadata = { storage_path?: unknown; mime_type?: unknown; size_bytes?: unknown };
const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024;

function attachmentObjects(backupData: Record<string, unknown>) {
  const attachments = backupData.attachments as { test?: AttachmentMetadata[]; issue?: AttachmentMetadata[] } | undefined;
  return [
    ...((attachments?.test ?? []).map((item) => ({ item, bucket: 'test-attachments' as const }))),
    ...((attachments?.issue ?? []).map((item) => ({ item, bucket: 'issue-attachments' as const }))),
  ];
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error('File Storage gagal dibaca'));
    reader.onload = () => resolve(String(reader.result).split(',', 2)[1] ?? '');
    reader.readAsDataURL(blob);
  });
}

function parseStorageObjects(backupData: Record<string, unknown>): BackupStorageObject[] {
  if (backupData.format !== 'testmanager-project-backup' || (backupData.version !== 1 && backupData.version !== 2)) throw new Error('Format atau versi backup tidak didukung');
  if (backupData.version === 1) {
    if (backupData.storage_objects !== undefined) throw new Error('Backup versi 1 tidak boleh memiliki object Storage');
    return [];
  }
  if (!Array.isArray(backupData.storage_objects)) throw new Error('Daftar object Storage backup tidak valid');
  const attachments = attachmentObjects(backupData);
  const allowed = new Map(attachments.map(({ item, bucket }) => [`${bucket}:${String(item.storage_path)}`, item]));
  const seen = new Set<string>();
  const objects = backupData.storage_objects.map((value) => {
    if (!value || typeof value !== 'object') throw new Error('Object Storage backup tidak valid');
    const row = value as Record<string, unknown>;
    const key = `${String(row.bucket)}:${String(row.path)}`;
    const metadata = allowed.get(key);
    if (!metadata || seen.has(key) || typeof row.base64 !== 'string' || typeof row.mime_type !== 'string' || !Number.isSafeInteger(row.size_bytes) || Number(row.size_bytes) < 0 || Number(row.size_bytes) > MAX_ATTACHMENT_SIZE) throw new Error('Object Storage backup tidak cocok dengan metadata attachment');
    let decodedSize: number;
    try { decodedSize = atob(row.base64).length; }
    catch { throw new Error('Payload binary Storage bukan base64 yang valid'); }
    if (decodedSize !== Number(row.size_bytes) || Number(metadata.size_bytes) !== decodedSize || String(metadata.mime_type) !== row.mime_type) throw new Error('Ukuran atau tipe object Storage tidak cocok dengan metadata attachment');
    seen.add(key);
    return { bucket: row.bucket as BackupStorageObject['bucket'], path: String(row.path), mimeType: row.mime_type, sizeBytes: Number(row.size_bytes), base64: row.base64 };
  });
  if (objects.length !== attachments.length) throw new Error('Backup versi 2 harus memuat seluruh object Storage attachment');
  return objects;
}

export const backupRetentionService = {
  getPolicy: backupRetentionRepository.getPolicy,
  savePolicy(input: Parameters<typeof backupRetentionRepository.savePolicy>[0]) {
    validateDays(input.retentionDays);
    if (input.attachmentRetentionDays !== null) validateDays(input.attachmentRetentionDays);
    return backupRetentionRepository.savePolicy(input);
  },
  async backup(projectId: string) {
    if (!projectId) throw new Error('Project wajib dipilih');
    const metadata = await backupRetentionRepository.backup(projectId);
    const storageObjects: Record<string, unknown>[] = [];
    for (const { item, bucket } of attachmentObjects(metadata)) {
      if (typeof item.storage_path !== 'string') throw new Error('Metadata attachment tidak memiliki path Storage');
      const blob = await backupRetentionRepository.downloadStorageObject(bucket, item.storage_path);
      if (Number(item.size_bytes) !== blob.size) throw new Error(`Ukuran object Storage tidak cocok: ${item.storage_path}`);
      storageObjects.push({ bucket, path: item.storage_path, mime_type: typeof item.mime_type === 'string' ? item.mime_type : blob.type || 'application/octet-stream', size_bytes: blob.size, base64: await blobToBase64(blob) });
    }
    return { ...metadata, version: 2, storage_objects: storageObjects };
  },
  async restorePreview(backupData: Record<string, unknown>): Promise<RestorePreview> {
    parseStorageObjects(backupData);
    return backupRetentionRepository.restorePreview(backupData);
  },
  async restore(projectId: string, backupData: Record<string, unknown>): Promise<RestoreResult> {
    if (!projectId || !backupData) throw new Error('Target dan backup wajib diisi');
    const storageObjects = parseStorageObjects(backupData);
    const result = await backupRetentionRepository.restore(projectId, backupData);
    let storageRestored = 0;
    let storageSkipped = 0;
    for (const object of storageObjects) {
      const restored = await backupRetentionRepository.uploadStorageObject(object);
      if (restored) storageRestored += 1; else storageSkipped += 1;
    }
    return { ...result, storageRestored, storageSkipped };
  },
  cleanupPreview: backupRetentionRepository.cleanupPreview,
  cleanup(projectId: string | null) { return backupRetentionRepository.cleanup(projectId); },
};
