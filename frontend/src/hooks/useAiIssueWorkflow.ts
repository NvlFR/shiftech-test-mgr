import { useCallback, useMemo, useState } from 'react';
import { useAuthContext } from './useAuth';
import { useProjectContext } from './useProjectContext';
import { aiIssueService } from '../services/aiIssueService';
import type { AiIssueDraft, DuplicateIssueCandidate } from '../types/ai';
import type { Issue, TestResultWithDetails } from '../types/domain';

export function useAiIssueWorkflow(projectOverride?: string) {
  const { session, isApproved } = useAuthContext();
  const { projectId: contextProjectId } = useProjectContext();
  const projectId = projectOverride ?? contextProjectId;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const actor = useMemo(
    () => session?.user ? { userId: session.user.id, isApproved } : null,
    [isApproved, session?.user],
  );

  const draftFromFailedResult = useCallback(async (result: TestResultWithDetails): Promise<AiIssueDraft | null> => {
    if (!projectId || !actor) return null;
    setLoading(true);
    setError(null);
    try {
      return await aiIssueService.draftFromFailedResult({ projectId, result, actor });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Gagal membuat draft Issue AI');
      return null;
    } finally {
      setLoading(false);
    }
  }, [actor, projectId]);

  const detectDuplicates = useCallback(async (draft: AiIssueDraft): Promise<DuplicateIssueCandidate[]> => {
    if (!projectId || !actor) return [];
    setLoading(true);
    setError(null);
    try {
      return await aiIssueService.detectDuplicates({ projectId, draft, actor });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Gagal mendeteksi duplicate Issue');
      return [];
    } finally {
      setLoading(false);
    }
  }, [actor, projectId]);

  const saveReviewedDraft = useCallback(async (draft: AiIssueDraft, duplicateAcknowledged: boolean): Promise<Issue | null> => {
    if (!projectId || !actor) return null;
    setLoading(true);
    setError(null);
    try {
      return await aiIssueService.saveReviewedDraft({ projectId, draft, actor, reviewed: true, duplicateAcknowledged });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Gagal menyimpan Issue dari draft AI');
      return null;
    } finally {
      setLoading(false);
    }
  }, [actor, projectId]);

  return { loading, error, projectId, draftFromFailedResult, detectDuplicates, saveReviewedDraft };
}
