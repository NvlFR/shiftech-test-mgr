import { useCallback, useEffect, useState } from 'react';
import { backupRetentionService } from '../services/backupRetentionService';
import type { RetentionCleanupPreview, RetentionPolicy } from '../types/domain';

export function useBackupRetention(projectId: string | null) {
  const [policy, setPolicy] = useState<RetentionPolicy | null>(null);
  const [preview, setPreview] = useState<RetentionCleanupPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const reload = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try { setPolicy(await backupRetentionService.getPolicy(projectId)); setPreview(await backupRetentionService.cleanupPreview(projectId)); }
    finally { setLoading(false); }
  }, [projectId]);
  useEffect(() => { void reload(); }, [reload]);
  return { policy, preview, loading, reload, setPolicy, setPreview };
}
