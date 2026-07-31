import { issueAttachmentRepository } from '../repositories/issueAttachmentRepository';

const MAX_FILE_SIZE = 10 * 1024 * 1024;

export const issueAttachmentService = {
  listByIssue(issueId: string) {
    return issueAttachmentRepository.findAllByIssue(issueId);
  },

  upload(issueId: string, file: File, uploadedBy: string) {
    if (file.size === 0) throw new Error('File tidak boleh kosong');
    if (file.size > MAX_FILE_SIZE) throw new Error('Ukuran file maksimal 10 MB');
    return issueAttachmentRepository.upload(issueId, file, uploadedBy);
  },

  remove: issueAttachmentRepository.remove,
};
