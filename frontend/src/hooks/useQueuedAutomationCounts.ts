import { useCallback, useEffect, useState } from 'react';
import { automationService } from '../services/automationService';

export function useQueuedAutomationCounts() {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const reload = useCallback(async () => {
    try { setCounts(await automationService.listQueuedJobCounts()); }
    catch { setCounts({}); }
  }, []);

  useEffect(() => {
    void reload();
    const timer = window.setInterval(() => void reload(), 15_000);
    return () => window.clearInterval(timer);
  }, [reload]);

  return counts;
}
