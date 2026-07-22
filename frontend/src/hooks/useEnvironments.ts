import { useCallback, useEffect, useState } from 'react';
import { environmentService } from '../services/environmentService';
import type { Environment } from '../types/domain';

export function useEnvironments(projectId: string | null) {
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [loading, setLoading] = useState(false);
  const reload = useCallback(async () => {
    if (!projectId) { setEnvironments([]); return; }
    setLoading(true);
    try { setEnvironments(await environmentService.listByProject(projectId)); }
    finally { setLoading(false); }
  }, [projectId]);
  useEffect(() => { reload(); }, [reload]);
  return { environments, loading, reload };
}
