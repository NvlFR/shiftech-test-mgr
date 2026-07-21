import { supabase } from '../config/supabaseClient';
import { mapProfileRow } from '../helpers/mappers';
import type { Profile, UserRole } from '../types/domain';

export const profileRepository = {
  async findById(id: string): Promise<Profile | null> {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', id).is('deleted_at', null).maybeSingle();
    if (error) throw error;
    return data ? mapProfileRow(data) : null;
  },

  async findAll(): Promise<Profile[]> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .is('deleted_at', null)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []).map(mapProfileRow);
  },

  async updateRole(id: string, role: UserRole): Promise<Profile> {
    const { data, error } = await supabase.from('profiles').update({ role }).eq('id', id).select('*').single();
    if (error) throw error;
    return mapProfileRow(data);
  },

  async softDelete(id: string): Promise<void> {
    const { error } = await supabase.from('profiles').update({ deleted_at: new Date().toISOString() }).eq('id', id);
    if (error) throw error;
  },
};
