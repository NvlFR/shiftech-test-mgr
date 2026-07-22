import { useCallback, useEffect, useState } from 'react';
import { attachmentService } from '../services/attachmentService';
import type { Attachment, AttachmentEntityKind } from '../types/domain';

export function useAttachments(kind: AttachmentEntityKind, entityId: string | null) {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(false);

  const reload = useCallback(async () => {
    if (!entityId) return;
    setLoading(true);
    try {
      setAttachments(await attachmentService.list(kind, entityId));
    } finally {
      setLoading(false);
    }
  }, [kind, entityId]);

  useEffect(() => { void reload(); }, [reload]);

  return { attachments, loading, reload };
}
