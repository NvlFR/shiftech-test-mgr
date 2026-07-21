import { useCallback, useEffect, useState } from 'react';
import { testPlanService } from '../services/testPlanService';
import type { TestPlan } from '../types/domain';

// Hook (composable) layer: bridges React state/lifecycle with the service layer.
// Components consume hooks; hooks call services; services call repositories.

export function useTestPlans(projectId: string | null) {
  const [testPlans, setTestPlans] = useState<TestPlan[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!projectId) {
      setTestPlans([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setTestPlans(await testPlanService.listByProject(projectId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat test plan');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { testPlans, loading, error, reload };
}
