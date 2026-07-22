import { useCallback, useEffect, useState } from 'react';
import { requirementService } from '../services/requirementService';
import type { RequirementWithLinks } from '../types/domain';
export function useRequirements(projectId: string | null) {
  const [requirements, setRequirements] = useState<RequirementWithLinks[]>([]); const [loading, setLoading] = useState(false);
  const reload = useCallback(async () => { if (!projectId) { setRequirements([]); return; } setLoading(true); try { setRequirements(await requirementService.listByProject(projectId)); } finally { setLoading(false); } }, [projectId]);
  useEffect(() => { reload(); }, [reload]); return { requirements, loading, reload };
}
