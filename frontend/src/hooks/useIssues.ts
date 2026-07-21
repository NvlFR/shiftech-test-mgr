import { useCallback, useEffect, useState } from 'react';
import { issueService } from '../services/issueService';
import type { IssueWithDetails } from '../types/domain';

export function useIssuesByTestRun(testRunId: string | null) {
  const [issues, setIssues] = useState<IssueWithDetails[]>([]);
  const [loading, setLoading] = useState(false);

  const reload = useCallback(async () => {
    if (!testRunId) return;
    setLoading(true);
    try {
      setIssues(await issueService.listByTestRun(testRunId));
    } finally {
      setLoading(false);
    }
  }, [testRunId]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { issues, loading, reload };
}
