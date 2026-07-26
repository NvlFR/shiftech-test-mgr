import { useCallback, useEffect, useRef, useState } from 'react';
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
  // Monotonic request id: a slower earlier fetch must not overwrite a newer one when inputs change.
  const requestRef = useRef(0);
  // Depend on the filters' *value*, not its object identity: a caller passing an inline `{}` would
  // otherwise hand us a new reference every render → reload rebuilt every render → infinite fetch loop.
  const filtersKey = JSON.stringify(filters);

  const reload = useCallback(async () => {
    if (!testPlanId) {
      setTestRuns([]);
      return;
    }
    const requestId = ++requestRef.current;
    setLoading(true);
    try {
      const result = await testRunService.listByPlanWithSummary(testPlanId, JSON.parse(filtersKey) as TestRunFilters);
      if (requestId !== requestRef.current) return;
      setTestRuns(result);
    } finally {
      if (requestId === requestRef.current) setLoading(false);
    }
  }, [testPlanId, filtersKey]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { testRuns, loading, reload };
}
