import { useEffect, useState } from 'react';
import { runnerDistributionService } from '../services/runnerDistributionService';
import type { RunnerRelease } from '../types/runnerDistribution';

export function useRunnerDistribution() {
  const [release, setRelease] = useState<RunnerRelease | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    runnerDistributionService.getRelease()
      .then(setRelease)
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : 'Gagal memuat rilis runner.'))
      .finally(() => setLoading(false));
  }, []);

  return { release, loading, error };
}
