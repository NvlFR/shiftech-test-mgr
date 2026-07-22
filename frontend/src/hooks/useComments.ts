import { useCallback, useEffect, useState } from 'react';
import { commentService } from '../services/commentService';
import type { Comment, CommentTargetType } from '../types/domain';

export function useComments(targetType: CommentTargetType, targetId: string | null) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const reload = useCallback(async () => {
    if (!targetId) return;
    setLoading(true);
    try { setComments(await commentService.list(targetType, targetId)); } finally { setLoading(false); }
  }, [targetId, targetType]);
  useEffect(() => { reload(); }, [reload]);
  return { comments, loading, reload };
}
