import { useCallback, useEffect, useState } from 'react';
import { testRunService } from '../services/testRunService';
import type { TestRun } from '../types/domain';

export function useTestRuns(testPlanId: string | null) {
  const [testRuns, setTestRuns] = useState<TestRun[]>([]);
  const [loading, setLoading] = useState(false);

  const reload = useCallback(async () => {
    if (!testPlanId) {
      setTestRuns([]);
      return;
    }
    setLoading(true);
    try {
      setTestRuns(await testRunService.listByPlan(testPlanId));
    } finally {
      setLoading(false);
    }
  }, [testPlanId]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { testRuns, loading, reload };
}
