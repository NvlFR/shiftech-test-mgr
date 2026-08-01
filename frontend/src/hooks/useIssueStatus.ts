import { useState } from 'react';
import { issueService } from '../services/issueService';
import type { IssueStatus } from '../types/domain';

export function useIssueStatus() {
  const [updating, setUpdating] = useState(false);

  async function changeStatus(issueId: string, status: IssueStatus, fixReferenceUrl?: string | null) {
    setUpdating(true);
    try {
      return await issueService.changeStatus(issueId, status, fixReferenceUrl);
    } finally {
      setUpdating(false);
    }
  }

  return { changeStatus, updating };
}
