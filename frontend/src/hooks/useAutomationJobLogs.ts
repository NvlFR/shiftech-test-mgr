import { useEffect, useState } from 'react';
import { automationService } from '../services/automationService';
import type { AutomationJobLog } from '../types/domain';

export function useAutomationJobLogs(jobId: string | null) {
  const [logs, setLogs] = useState<AutomationJobLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!jobId) { setLogs([]); setError(null); return; }
    let active = true;
    setLogs([]);
    setLoading(true);
    setError(null);
    void automationService.listJobLogs(jobId)
      .then((entries) => { if (active) setLogs((current) => {
        const merged = new Map([...entries, ...current].map((entry) => [entry.id, entry]));
        return Array.from(merged.values()).sort((a, b) => a.attempt - b.attempt || a.sequence - b.sequence);
      }); })
      .catch((err) => { if (active) setError(err instanceof Error ? err.message : 'Gagal memuat live log'); })
      .finally(() => { if (active) setLoading(false); });
    const unsubscribe = automationService.subscribeJobLogs(jobId, (entry) => {
      if (!active) return;
      setLogs((current) => current.some((item) => item.id === entry.id) ? current : [...current, entry].sort((a, b) => a.attempt - b.attempt || a.sequence - b.sequence));
    });
    return () => { active = false; unsubscribe(); };
  }, [jobId]);

  return { logs, loading, error };
}
