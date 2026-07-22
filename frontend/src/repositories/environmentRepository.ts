import { supabase } from '../config/supabaseClient';
import { mapEnvironmentRow } from '../helpers/mappers';
import type { Environment } from '../types/domain';

export const environmentRepository = {
  async findAllByProject(projectId: string): Promise<Environment[]> {
    const { data, error } = await supabase.from('environments').select('*').eq('project_id', projectId).order('name');
    if (error) throw error;
    return (data ?? []).map(mapEnvironmentRow);
  },

  async create(input: { projectId: string; name: string; baseUrl?: string | null }): Promise<Environment> {
    const { data, error } = await supabase
      .from('environments')
      .insert({ project_id: input.projectId, name: input.name, base_url: input.baseUrl || null })
      .select('*')
      .single();
    if (error) throw error;
    return mapEnvironmentRow(data);
  },

  async update(id: string, changes: { name?: string; baseUrl?: string | null }): Promise<Environment> {
    const payload: Record<string, unknown> = {};
    if (changes.name !== undefined) payload.name = changes.name;
    if (changes.baseUrl !== undefined) payload.base_url = changes.baseUrl;
    const { data, error } = await supabase.from('environments').update(payload).eq('id', id).select('*').single();
    if (error) throw error;
    return mapEnvironmentRow(data);
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase.from('environments').delete().eq('id', id);
    if (error) throw error;
  },
};
