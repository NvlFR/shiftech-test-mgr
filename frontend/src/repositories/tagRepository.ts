import { supabase } from '../config/supabaseClient';
import { mapTagRow } from '../helpers/mappers';
import type { Tag } from '../types/domain';

export const tagRepository = {
  async findAllByProject(projectId: string): Promise<Tag[]> {
    const { data, error } = await supabase.from('tags').select('*').eq('project_id', projectId).order('name');
    if (error) throw error;
    return (data ?? []).map(mapTagRow);
  },

  async findOrCreate(projectId: string, name: string): Promise<Tag> {
    // Exact match, not ilike: `_`/`%` in a tag name are literal characters, but ilike would
    // treat them as wildcards (matching the wrong tag, or several rows → maybeSingle throws).
    // `.eq` also mirrors the case-sensitive `unique (project_id, name)` DB constraint.
    const { data: existing, error: findError } = await supabase
      .from('tags')
      .select('*')
      .eq('project_id', projectId)
      .eq('name', name)
      .maybeSingle();
    if (findError) throw findError;
    if (existing) return mapTagRow(existing);

    const { data, error } = await supabase
      .from('tags')
      .insert({ project_id: projectId, name })
      .select('*')
      .single();
    if (error) throw error;
    return mapTagRow(data);
  },

  async update(id: string, name: string): Promise<Tag> {
    const { data, error } = await supabase.from('tags').update({ name }).eq('id', id).select('*').single();
    if (error) throw error;
    return mapTagRow(data);
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase.from('tags').delete().eq('id', id);
    if (error) throw error;
  },

  async findTagsForTestCase(testCaseId: string): Promise<Tag[]> {
    const { data, error } = await supabase
      .from('test_case_tags')
      .select('tag:tags(*)')
      .eq('test_case_id', testCaseId);
    if (error) throw error;
    return (data ?? []).map((row: any) => mapTagRow(row.tag));
  },

  async setTagsForTestCase(testCaseId: string, tagIds: string[]): Promise<void> {
    const { error: deleteError } = await supabase.from('test_case_tags').delete().eq('test_case_id', testCaseId);
    if (deleteError) throw deleteError;

    if (tagIds.length === 0) return;
    const { error: insertError } = await supabase
      .from('test_case_tags')
      .insert(tagIds.map((tagId) => ({ test_case_id: testCaseId, tag_id: tagId })));
    if (insertError) throw insertError;
  },
};
