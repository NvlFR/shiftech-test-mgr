import { supabase } from '../config/supabaseClient';
import { mapActivityEventRow } from '../helpers/mappers';
import type { ActivityEvent } from '../types/domain';

export const activityRepository = {
  async findByProject(projectId: string, limit = 40): Promise<ActivityEvent[]> {
    const { data, error } = await supabase.from('audit_logs').select('*, actor:profiles!changed_by(*)').eq('project_id', projectId).order('created_at', { ascending: false }).limit(limit);
    if (error) throw error;
    return (data ?? []).map(mapActivityEventRow);
  },
};
