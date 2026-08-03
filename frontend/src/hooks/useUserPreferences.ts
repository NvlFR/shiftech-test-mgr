import { useState, useEffect, useCallback } from 'react';
import { userPreferenceService } from '../services/userPreferenceService';
import { useAuthContext } from './useAuth';
import type { UserPreference, ThemeMode } from '../types/domain';

export function useUserPreferences() {
  const { session } = useAuthContext();
  const userId = session?.user?.id;

  const [preferences, setPreferences] = useState<UserPreference | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPreferences = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await userPreferenceService.getPreferences(userId);
      setPreferences(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch preferences');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchPreferences();
  }, [fetchPreferences]);

  const updatePreferences = async (updates: { theme?: ThemeMode; notificationsEnabled?: boolean; defaultProjectId?: string | null }) => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await userPreferenceService.upsertPreferences(userId, updates);
      setPreferences(data);
      return data;
    } catch (err: any) {
      setError(err.message || 'Failed to update preferences');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    preferences,
    loading,
    error,
    updatePreferences,
    reload: fetchPreferences,
  };
}
