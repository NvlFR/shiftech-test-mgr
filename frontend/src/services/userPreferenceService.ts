import { userPreferenceRepository } from '../repositories/userPreferenceRepository';
import type { UserPreference, ThemeMode } from '../types/domain';

export const userPreferenceService = {
  async getPreferences(userId: string): Promise<UserPreference | null> {
    if (!userId) throw new Error('User ID is required');
    return await userPreferenceRepository.getPreferences(userId);
  },

  async upsertPreferences(
    userId: string,
    updates: { theme?: ThemeMode; notificationsEnabled?: boolean; defaultProjectId?: string | null }
  ): Promise<UserPreference> {
    if (!userId) throw new Error('User ID is required');
    return await userPreferenceRepository.upsertPreferences(userId, updates);
  },
};
