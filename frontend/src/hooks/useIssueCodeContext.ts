import { useEffect, useState } from 'react';
import { issueService } from '../services/issueService';
import type { IssueCodeContext } from '../types/domain';

export function useIssueCodeContext(issueId: string | null) {
  const [codeContext, setCodeContext] = useState<IssueCodeContext | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    if (!issueId) {
      setCodeContext(null);
      return;
    }

    setLoading(true);
    issueService.getCodeContext(issueId)
      .then((context) => {
        if (active) setCodeContext(context);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [issueId]);

  return { codeContext, loading };
}
