import { useCallback, useState } from 'react';
import { useAuthContext } from './useAuth';
import { useProjectContext } from './useProjectContext';
import { aiAssistantService } from '../services/aiAssistantService';
import type { AiAssistantEntityType, AiAssistantSearchResult } from '../types/ai';

export function useAiAssistant() {
  const { session, isApproved } = useAuthContext();
  const { projectId } = useProjectContext();
  const [result, setResult] = useState<AiAssistantSearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(async (query: string, entityTypes?: AiAssistantEntityType[], limit?: number) => {
    if (!projectId || !session?.user) return null;
    setLoading(true);
    setError(null);
    try {
      const next = await aiAssistantService.search({
        projectId,
        query,
        entityTypes,
        limit,
        actor: { userId: session.user.id, isApproved },
      });
      setResult(next);
      return next;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Gagal mencari data project dengan AI');
      return null;
    } finally {
      setLoading(false);
    }
  }, [isApproved, projectId, session?.user]);

  return { result, loading, error, projectId, search };
}
