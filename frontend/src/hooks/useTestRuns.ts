import { useCallback, useEffect, useState } from 'react';
import { testRunService } from '../services/testRunService';
import type { TestRun } from '../types/domain';

export interface TestRunWithSummary extends TestRun {
  total: number;
  pass: number;
  fail: number;
  testers: { id: string; fullName: string | null }[];
}

export function useTestRuns(testPlanId: string | null) {
  const [testRuns, setTestRuns] = useState<TestRunWithSummary[]>([]);
  const [loading, setLoading] = useState(false);

  const reload = useCallback(async () => {
    if (!testPlanId) {
      setTestRuns([]);
      return;
    }
    setLoading(true);
    try {
      setTestRuns(await testRunService.listByPlanWithSummary(testPlanId));
    } finally {
      setLoading(false);
    }
  }, [testPlanId]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { testRuns, loading, reload };
}
