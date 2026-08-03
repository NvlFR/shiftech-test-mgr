import { supabase } from '../config/supabaseClient';
import { mapUserPreferenceRow } from '../helpers/mappers';
import type { UserPreference, ThemeMode } from '../types/domain';

export const userPreferenceRepository = {
  async getPreferences(userId: string): Promise<UserPreference | null> {
    const { data, error } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;
    return data ? mapUserPreferenceRow(data) : null;
  },

  async upsertPreferences(
    userId: string,
    updates: { theme?: ThemeMode; notificationsEnabled?: boolean; defaultProjectId?: string | null }
  ): Promise<UserPreference> {
    const payload: any = { user_id: userId };
    if (updates.theme !== undefined) payload.theme = updates.theme;
    if (updates.notificationsEnabled !== undefined) payload.notifications_enabled = updates.notificationsEnabled;
    if (updates.defaultProjectId !== undefined) payload.default_project_id = updates.defaultProjectId;

    const { data, error } = await supabase
      .from('user_preferences')
      .upsert(payload, { onConflict: 'user_id' })
      .select()
      .single();

    if (error) throw error;
    return mapUserPreferenceRow(data);
  },
};
