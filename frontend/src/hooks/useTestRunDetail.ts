import { useCallback, useEffect, useRef, useState } from 'react';
import { testRunService } from '../services/testRunService';
import type { ProjectRepository, TestResultWithDetails, TestRun, TestRunSummary } from '../types/domain';

export function useTestRunDetail(testRunId: string | null) {
  const [testRun, setTestRun] = useState<TestRun | null>(null);
  const [repositoryTraceability, setRepositoryTraceability] = useState<{ repository: ProjectRepository | null; branch: string | null; commitSha: string | null } | null>(null);
  const [results, setResults] = useState<TestResultWithDetails[]>([]);
  const [summary, setSummary] = useState<TestRunSummary>({
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
  // Monotonic request id: a slower earlier fetch must not overwrite a newer one when testRunId changes.
  const requestRef = useRef(0);

  const reload = useCallback(async () => {
    if (!testRunId) return;
    const requestId = ++requestRef.current;
    setLoading(true);
    try {
      const [run, withResults, traceability] = await Promise.all([
        testRunService.getById(testRunId),
        testRunService.getWithResults(testRunId),
        testRunService.getRepositoryTraceability(testRunId),
      ]);
      if (requestId !== requestRef.current) return;
      setTestRun(run);
      setRepositoryTraceability(traceability);
      setResults(withResults.results);
      setSummary(withResults.summary);
    } finally {
      if (requestId === requestRef.current) setLoading(false);
    }
  }, [testRunId]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { testRun, repositoryTraceability, results, summary, loading, reload };
}
