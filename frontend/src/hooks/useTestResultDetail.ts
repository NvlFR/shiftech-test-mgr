import { useEffect, useState } from 'react';
import { testResultService } from '../services/testResultService';
import type { ScreenshotComparison, TestResultWithDetails, ViewableAutomationArtifact } from '../types/domain';

export function useTestResultDetail(testResultId: string | null) {
  const [result, setResult] = useState<TestResultWithDetails | null>(null);
  const [artifacts, setArtifacts] = useState<ViewableAutomationArtifact[]>([]);
  const [screenshotComparison, setScreenshotComparison] = useState<ScreenshotComparison | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      if (!testResultId) {
        setError('Test Result tidak valid');
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const nextResult = await testResultService.getById(testResultId);
        if (!nextResult) throw new Error('Test Result tidak ditemukan');
        const [nextArtifacts, nextComparison] = await Promise.all([
          testResultService.prepareArtifacts(nextResult.automationArtifacts),
          testResultService.getScreenshotComparison(nextResult),
        ]);
        if (active) {
          setResult(nextResult);
          setArtifacts(nextArtifacts);
          setScreenshotComparison(nextComparison);
        }
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'Gagal memuat Test Result');
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => { active = false; };
  }, [testResultId]);

  return { result, artifacts, screenshotComparison, loading, error };
}
