import { useCallback, useEffect, useRef, useState } from 'react';
import { testPlanService } from '../services/testPlanService';
import type { TestPlanCaseWithDetails } from '../types/domain';

// Just "which test cases are in scope for this plan" — no result/progress here.
// Execution history lives under Test Runs (see useTestRuns / useTestRunDetail).
export function useTestPlanDetail(testPlanId: string | null) {
  const [cases, setCases] = useState<TestPlanCaseWithDetails[]>([]);
  const [loading, setLoading] = useState(false);
  // Monotonic request id: a slower earlier fetch must not overwrite a newer one when testPlanId changes.
  const requestRef = useRef(0);

  const reload = useCallback(async () => {
    if (!testPlanId) return;
    const requestId = ++requestRef.current;
    setLoading(true);
    try {
      const result = await testPlanService.listCases(testPlanId);
      if (requestId !== requestRef.current) return;
      setCases(result);
    } finally {
      if (requestId === requestRef.current) setLoading(false);
    }
  }, [testPlanId]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { cases, loading, reload };
}
