import { useEffect, useState } from 'react';
import { testResultService } from '../services/testResultService';
import type { TestResultWithDetails, ViewableAutomationArtifact } from '../types/domain';

export function useTestResultDetail(testResultId: string | null) {
  const [result, setResult] = useState<TestResultWithDetails | null>(null);
  const [artifacts, setArtifacts] = useState<ViewableAutomationArtifact[]>([]);
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
        const nextArtifacts = await testResultService.prepareArtifacts(nextResult.automationArtifacts);
        if (active) {
          setResult(nextResult);
          setArtifacts(nextArtifacts);
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

  return { result, artifacts, loading, error };
}
