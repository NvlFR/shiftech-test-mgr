import { useCallback, useEffect, useState } from 'react';
import { cicdService } from '../services/cicdService';
import type { CicdPipeline } from '../types/domain';

export function useCicdPipelines(projectId: string | null) {
  const [pipelines, setPipelines] = useState<CicdPipeline[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reload = useCallback(async () => {
    if (!projectId) { setPipelines([]); return; }
    setLoading(true); setError(null);
    try { setPipelines(await cicdService.listByProject(projectId)); }
    catch (err) { setError(err instanceof Error ? err.message : 'Gagal memuat pipeline'); }
    finally { setLoading(false); }
  }, [projectId]);
  useEffect(() => { void reload(); }, [reload]);
  return { pipelines, loading, error, reload };
}
