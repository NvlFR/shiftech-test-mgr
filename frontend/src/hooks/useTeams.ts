import { useCallback, useEffect, useState } from 'react';
import { teamService } from '../services/teamService';
import type { Team, TeamWithMembers } from '../types/domain';

export function useTeams(withMembers = false) {
  const [teams, setTeams] = useState<(Team | TeamWithMembers)[]>([]);
  const [loading, setLoading] = useState(true);
  const reload = useCallback(async () => {
    setLoading(true);
    try { setTeams(await (withMembers ? teamService.listWithMembers() : teamService.list())); }
    finally { setLoading(false); }
  }, [withMembers]);
  useEffect(() => { void reload(); }, [reload]);
  return { teams, loading, reload };
}
