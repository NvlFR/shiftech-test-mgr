import { useCallback, useEffect, useState } from 'react';
import { moduleService } from '../services/moduleService';
import type { Module } from '../types/domain';

export function useModules(projectId: string | null) {
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(false);

  const reload = useCallback(async () => {
    if (!projectId) {
      setModules([]);
      return;
    }
    setLoading(true);
    try {
      setModules(await moduleService.listByProject(projectId));
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { modules, loading, reload };
}
