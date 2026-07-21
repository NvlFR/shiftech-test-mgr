import { useCallback, useEffect, useState } from 'react';
import { profileService } from '../services/profileService';
import type { Profile } from '../types/domain';

export function useProfiles() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setProfiles(await profileService.listAll());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return { profiles, loading, reload };
}
