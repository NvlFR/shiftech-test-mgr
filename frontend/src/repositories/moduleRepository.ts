import { supabase } from '../config/supabaseClient';
import { mapModuleRow } from '../helpers/mappers';
import type { Module } from '../types/domain';

export const moduleRepository = {
  async findAllByProject(projectId: string): Promise<Module[]> {
    const { data, error } = await supabase
      .from('modules')
      .select('*')
      .eq('project_id', projectId)
      .order('code');

    if (error) throw error;
    return (data ?? []).map(mapModuleRow);
  },

  // `code` is optional — omitting it (or passing null) lets the `set_module_code`
  // DB trigger auto-generate the next MOD-#### for this project.
  async create(input: { projectId: string; name: string; code?: string | null }): Promise<Module> {
    const { data, error } = await supabase
      .from('modules')
      .insert({ project_id: input.projectId, name: input.name, code: input.code || undefined })
      .select('*')
      .single();

    if (error) throw error;
    return mapModuleRow(data);
  },

  async update(id: string, changes: { name?: string; code?: string }): Promise<Module> {
    const { data, error } = await supabase.from('modules').update(changes).eq('id', id).select('*').single();
    if (error) throw error;
    return mapModuleRow(data);
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase.from('modules').delete().eq('id', id);
    if (error) throw error;
  },
};
