import { useCallback, useEffect, useState } from 'react';
import { testRunService } from '../services/testRunService';
import type { TestResultWithDetails, TestRun } from '../types/domain';

interface Summary {
  total: number;
  executed: number;
  progressPercent: number;
  pass: number;
  fail: number;
  skip: number;
  blocked: number;
  notRun: number;
}

export function useTestRunDetail(testRunId: string | null) {
  const [testRun, setTestRun] = useState<TestRun | null>(null);
  const [results, setResults] = useState<TestResultWithDetails[]>([]);
  const [summary, setSummary] = useState<Summary>({
    total: 0,
    executed: 0,
    progressPercent: 0,
    pass: 0,
    fail: 0,
    skip: 0,
    blocked: 0,
    notRun: 0,
  });
  const [loading, setLoading] = useState(false);

  const reload = useCallback(async () => {
    if (!testRunId) return;
    setLoading(true);
    try {
      const [run, withResults] = await Promise.all([
        testRunService.getById(testRunId),
        testRunService.getWithResults(testRunId),
      ]);
      setTestRun(run);
      setResults(withResults.results);
      setSummary(withResults.summary);
    } finally {
      setLoading(false);
    }
  }, [testRunId]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { testRun, results, summary, loading, reload };
}
