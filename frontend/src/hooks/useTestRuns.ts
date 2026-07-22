import { useCallback, useEffect, useState } from 'react';
import { testRunService } from '../services/testRunService';
import type { TestRun } from '../types/domain';
import type { TestRunFilters } from '../repositories/testRunRepository';

export interface TestRunWithSummary extends TestRun {
  total: number;
  pass: number;
  fail: number;
  testers: { id: string; fullName: string | null }[];
}

const EMPTY_FILTERS: TestRunFilters = {};

export function useTestRuns(testPlanId: string | null, filters: TestRunFilters = EMPTY_FILTERS) {
  const [testRuns, setTestRuns] = useState<TestRunWithSummary[]>([]);
  const [loading, setLoading] = useState(false);

  const reload = useCallback(async () => {
    if (!testPlanId) {
      setTestRuns([]);
      return;
    }
    setLoading(true);
    try {
      setTestRuns(await testRunService.listByPlanWithSummary(testPlanId, filters));
    } finally {
      setLoading(false);
    }
  }, [testPlanId, filters]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { testRuns, loading, reload };
}
