import { supabase } from '../config/supabaseClient';
import { mapPublicProfileRow } from '../helpers/mappers';
import type { PublicProfile } from '../types/domain';

export const publicProfileRepository = {
  async getByUsername(username: string): Promise<PublicProfile | null> {
    const { data, error } = await supabase
      .from('public_profiles')
      .select('*')
      .eq('username', username)
      .maybeSingle();

    if (error) throw error;
    return data ? mapPublicProfileRow(data) : null;
  }
};
