import { useCallback, useEffect, useState } from 'react';
import { issueAttachmentService } from '../services/issueAttachmentService';
import type { IssueAttachment } from '../types/domain';

export function useIssueAttachments(issueId: string | null) {
  const [attachments, setAttachments] = useState<IssueAttachment[]>([]);
  const [loading, setLoading] = useState(false);

  const reload = useCallback(async () => {
    if (!issueId) {
      setAttachments([]);
      return;
    }
    setLoading(true);
    try {
      setAttachments(await issueAttachmentService.listByIssue(issueId));
    } finally {
      setLoading(false);
    }
  }, [issueId]);

  useEffect(() => { void reload(); }, [reload]);

  const upload = useCallback(async (file: File, uploadedBy: string) => {
    if (!issueId) throw new Error('Issue tidak ditemukan');
    const attachment = await issueAttachmentService.upload(issueId, file, uploadedBy);
    setAttachments((current) => [attachment, ...current]);
    return attachment;
  }, [issueId]);

  const remove = useCallback(async (attachment: IssueAttachment) => {
    await issueAttachmentService.remove(attachment);
    setAttachments((current) => current.filter((item) => item.id !== attachment.id));
  }, []);

  return { attachments, loading, reload, upload, remove };
}
