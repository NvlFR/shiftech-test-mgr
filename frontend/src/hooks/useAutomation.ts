import { useCallback, useEffect, useState } from 'react';
import { automationService } from '../services/automationService';
import type { AutomationJob, AutomationRunner, AutomationScript } from '../types/domain';

export function useAutomation(projectId: string | null) {
  const [runners, setRunners] = useState<AutomationRunner[]>([]);
  const [scripts, setScripts] = useState<AutomationScript[]>([]);
  const [jobs, setJobs] = useState<AutomationJob[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!projectId) { setRunners([]); setScripts([]); setJobs([]); return; }
    setLoading(true); setError(null);
    try {
      const [r, s, j] = await Promise.all([
        automationService.listRunners(projectId),
        automationService.listScripts(projectId),
        automationService.listJobs(projectId),
      ]);
      setRunners(r); setScripts(s); setJobs(j);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat automation');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => { void reload(); }, [reload]);
  return { runners, scripts, jobs, loading, error, reload };
}
