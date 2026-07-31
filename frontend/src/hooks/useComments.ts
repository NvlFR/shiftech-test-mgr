import { useCallback, useEffect, useState } from 'react';
import { commentService } from '../services/commentService';
import { supabase } from '../config/supabaseClient';
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
  useEffect(() => {
    if (!targetId) return;
    const channel = supabase.channel(`comments:${targetType}:${targetId}`).on('postgres_changes', { event: '*', schema: 'public', table: 'comments', filter: `target_id=eq.${targetId}` }, () => { void reload(); }).subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [reload, targetId, targetType]);
  return { comments, loading, reload };
}
