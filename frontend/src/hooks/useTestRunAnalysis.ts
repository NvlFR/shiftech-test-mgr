import { useCallback, useEffect, useState } from 'react';
import { aiTestRunAnalysisService } from '../services/aiTestRunAnalysisService';
import type { AiTestRunAnalysisResponse } from '../types/aiTestRunAnalysis';

export function useTestRunAnalysis(projectId: string | null, testRunId: string | null) {
  const [analysis, setAnalysis] = useState<AiTestRunAnalysisResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyze = useCallback(async () => {
    if (!projectId || !testRunId) return null;
    setLoading(true);
    setError(null);
    try {
      const result = await aiTestRunAnalysisService.analyzeTestRun(projectId, testRunId);
      setAnalysis(result);
      return result;
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : 'Analisis AI gagal dijalankan';
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [projectId, testRunId]);

  useEffect(() => {
    setAnalysis(null);
    setError(null);
  }, [projectId, testRunId]);

  return { analysis, loading, error, analyze, reload: analyze };
}
