import { attachmentRepository } from '../repositories/attachmentRepository';
import type { AttachmentEntityKind } from '../types/domain';

const MAX_FILE_SIZE = 10 * 1024 * 1024;

export const attachmentService = {
  list(kind: AttachmentEntityKind, entityId: string) {
    return attachmentRepository.findAll(kind, entityId);
  },

  upload(kind: AttachmentEntityKind, entityId: string, file: File, uploadedBy: string) {
    if (file.size === 0) throw new Error('File tidak boleh kosong');
    if (file.size > MAX_FILE_SIZE) throw new Error('Ukuran file maksimal 10 MB');
    return attachmentRepository.upload(kind, entityId, file, uploadedBy);
  },

  remove: attachmentRepository.remove,
};
