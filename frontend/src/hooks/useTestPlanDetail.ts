import { useCallback, useEffect, useState } from 'react';
import { testPlanService } from '../services/testPlanService';
import type { TestPlanCaseWithDetails } from '../types/domain';

// Just "which test cases are in scope for this plan" — no result/progress here.
// Execution history lives under Test Runs (see useTestRuns / useTestRunDetail).
export function useTestPlanDetail(testPlanId: string | null) {
  const [cases, setCases] = useState<TestPlanCaseWithDetails[]>([]);
  const [loading, setLoading] = useState(false);

  const reload = useCallback(async () => {
    if (!testPlanId) return;
    setLoading(true);
    try {
      setCases(await testPlanService.listCases(testPlanId));
    } finally {
      setLoading(false);
    }
  }, [testPlanId]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { cases, loading, reload };
}
