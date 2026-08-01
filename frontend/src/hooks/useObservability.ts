import { useCallback, useEffect, useState } from 'react';
import { observabilityService } from '../services/observabilityService';
import type { OperationalErrorLog, OperationalHealth, OperationalSource } from '../types/domain';

export function useObservability(filters: { source?: OperationalSource; search?: string; unresolvedOnly?: boolean }) {
  const { source, search, unresolvedOnly } = filters;
  const [health, setHealth] = useState<OperationalHealth | null>(null);
  const [logs, setLogs] = useState<OperationalErrorLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const reload = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [nextHealth, nextLogs] = await Promise.all([observabilityService.getHealth(), observabilityService.listErrors({ source, search, unresolvedOnly })]);
      setHealth(nextHealth); setLogs(nextLogs);
    } catch (err) { setError(err instanceof Error ? err.message : 'Gagal memuat observability'); }
    finally { setLoading(false); }
  }, [search, source, unresolvedOnly]);
  useEffect(() => { void reload(); }, [reload]);
  return { health, logs, loading, error, reload };
}
