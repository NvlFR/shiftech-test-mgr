import { useCallback, useEffect, useState } from 'react';
import { teamService } from '../services/teamService';
import type { ProjectTeam } from '../types/domain';

export function useProjectTeams(projectId?: string) {
  const [projectTeams, setProjectTeams] = useState<ProjectTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const reload = useCallback(async () => {
    if (!projectId) { setProjectTeams([]); setLoading(false); return; }
    setLoading(true);
    try { setProjectTeams(await teamService.listByProject(projectId)); }
    finally { setLoading(false); }
  }, [projectId]);
  useEffect(() => { void reload(); }, [reload]);
  return { projectTeams, loading, reload };
}
