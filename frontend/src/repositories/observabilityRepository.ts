import { supabase } from '../config/supabaseClient';
import { mapOperationalErrorLogRow, mapOperationalHealth } from '../helpers/mappers';
import type { OperationalErrorLog, OperationalHealth, OperationalSource } from '../types/domain';

export interface OperationalLogFilters { source?: OperationalSource; search?: string; unresolvedOnly?: boolean; limit?: number; }

export const observabilityRepository = {
  async getHealth(): Promise<OperationalHealth> {
    const { data, error } = await supabase.rpc('get_operational_health');
    if (error) throw error;
    return mapOperationalHealth(data);
  },
  async listErrors(filters: OperationalLogFilters = {}): Promise<OperationalErrorLog[]> {
    let query = supabase.from('operational_error_logs').select('id, source, severity, code, message, project_id, resource_type, resource_id, context, occurred_at, resolved_at').order('occurred_at', { ascending: false }).limit(filters.limit ?? 100);
    if (filters.source) query = query.eq('source', filters.source);
    if (filters.unresolvedOnly) query = query.is('resolved_at', null);
    if (filters.search?.trim()) query = query.or(`message.ilike.%${filters.search.trim()}%,code.ilike.%${filters.search.trim()}%,resource_id.ilike.%${filters.search.trim()}%`);
    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []).map(mapOperationalErrorLogRow);
  },
};
