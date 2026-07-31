import { supabase } from '../config/supabaseClient';
import { mapTestSuiteItemRow, mapTestSuiteItemStepRow, mapTestSuiteRow } from '../helpers/mappers';
import type { TestSuite, TestSuiteItem, TestSuiteItemStep, TestSuiteVisibility } from '../types/domain';

type SuiteItemInput = Omit<TestSuiteItem, 'id' | 'createdAt' | 'updatedAt'>;

const toItemRow = (input: SuiteItemInput) => ({
  suite_id: input.suiteId,
  module_name: input.moduleName,
  title: input.title,
  objective: input.objective,
  preconditions: input.preconditions,
  steps: input.steps,
  expected_result: input.expectedResult,
  priority: input.priority,
  step_type: input.stepType,
  target_role: input.targetRole,
  tag_names: input.tagNames,
  order_index: input.orderIndex,
});

export const testSuiteRepository = {
  async findAllPaginated(params: { search?: string; ownership?: 'mine' | 'all'; visibilityFilter?: string[]; userId?: string; page: number; pageSize: number; sortField?: string; sortOrder?: 'asc' | 'desc' }) {
    let query = supabase.from('test_suites').select('*', { count: 'exact' });
    if (params.ownership === 'mine' && params.userId) query = query.eq('owner_id', params.userId);
    if (params.ownership === 'all' && params.userId) query = query.neq('owner_id', params.userId);
    if (params.search) query = query.ilike('name', `%${params.search.replace(/%/g, '')}%`);
    if (params.visibilityFilter?.length) query = query.in('visibility', params.visibilityFilter);
    const columns: Record<string, string> = { name: 'name', updatedAt: 'updated_at', createdAt: 'created_at' };
    query = query.order(columns[params.sortField ?? 'name'] ?? 'name', { ascending: params.sortOrder !== 'desc' });
    const from = (params.page - 1) * params.pageSize;
    const { data, error, count } = await query.range(from, from + params.pageSize - 1);
    if (error) throw error;
    return { data: data ?? [], total: count ?? 0 };
  },
  async findAll(): Promise<TestSuite[]> {
    const { data, error } = await supabase.from('test_suites').select('*').order('name');
    if (error) throw error;
    return (data ?? []).map(mapTestSuiteRow);
  },
  async findByOwner(ownerId: string, visibilityFilter?: string[]): Promise<TestSuite[]> {
    let query = supabase.from('test_suites').select('*').eq('owner_id', ownerId);
    if (visibilityFilter?.length) query = query.in('visibility', visibilityFilter);
    const { data, error } = await query.order('name');
    if (error) throw error;
    return (data ?? []).map(mapTestSuiteRow);
  },
  async findById(id: string): Promise<TestSuite | null> {
    const { data, error } = await supabase.from('test_suites').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return data ? mapTestSuiteRow(data) : null;
  },
  async create(input: { name: string; description: string | null; visibility?: TestSuiteVisibility }): Promise<TestSuite> {
    const { data, error } = await supabase.from('test_suites').insert(input).select('*').single();
    if (error) throw error;
    return mapTestSuiteRow(data);
  },
  async update(id: string, changes: { name?: string; description?: string | null; visibility?: TestSuiteVisibility }): Promise<TestSuite> {
    const { data, error } = await supabase.from('test_suites').update(changes).eq('id', id).select('*').single();
    if (error) throw error;
    return mapTestSuiteRow(data);
  },
  async remove(id: string) { const { error } = await supabase.from('test_suites').delete().eq('id', id); if (error) throw error; },
  async findItemsBySuite(suiteId: string): Promise<TestSuiteItem[]> {
    const { data, error } = await supabase.from('test_suite_items').select('*').eq('suite_id', suiteId).order('order_index');
    if (error) throw error;
    return (data ?? []).map(mapTestSuiteItemRow);
  },
  async findItems(suiteId: string) { return this.findItemsBySuite(suiteId); },
  async findItemsByIds(ids: string[]): Promise<TestSuiteItem[]> {
    if (!ids.length) return [];
    const { data, error } = await supabase.from('test_suite_items').select('*').in('id', ids);
    if (error) throw error;
    return (data ?? []).map(mapTestSuiteItemRow);
  },
  async createItem(input: SuiteItemInput): Promise<TestSuiteItem> {
    const { data, error } = await supabase.from('test_suite_items').insert(toItemRow(input)).select('*').single();
    if (error) throw error;
    return mapTestSuiteItemRow(data);
  },
  async updateItem(id: string, changes: Partial<Omit<TestSuiteItem, 'id' | 'suiteId' | 'createdAt' | 'updatedAt'>>): Promise<TestSuiteItem> {
    const fields: Record<string, string | number | string[] | null> = {};
    const map: Record<string, string> = { moduleName: 'module_name', objective: 'objective', preconditions: 'preconditions', steps: 'steps', expectedResult: 'expected_result', priority: 'priority', stepType: 'step_type', targetRole: 'target_role', tagNames: 'tag_names', orderIndex: 'order_index', title: 'title' };
    for (const [key, value] of Object.entries(changes)) if (value !== undefined) fields[map[key]] = value as never;
    const { data, error } = await supabase.from('test_suite_items').update(fields).eq('id', id).select('*').single();
    if (error) throw error;
    return mapTestSuiteItemRow(data);
  },
  async removeItem(id: string) { const { error } = await supabase.from('test_suite_items').delete().eq('id', id); if (error) throw error; },
  async removeItemsMany(ids: string[]) { if (!ids.length) return; const { error } = await supabase.from('test_suite_items').delete().in('id', ids); if (error) throw error; },
  async createItemsMany(inputs: SuiteItemInput[]): Promise<TestSuiteItem[]> {
    if (!inputs.length) return [];
    const { data, error } = await supabase.from('test_suite_items').insert(inputs.map(toItemRow)).select('*');
    if (error) throw error;
    return (data ?? []).map(mapTestSuiteItemRow);
  },
  async findStepsByItems(ids: string[]): Promise<TestSuiteItemStep[]> {
    if (!ids.length) return [];
    const { data, error } = await supabase.from('test_suite_item_steps').select('*').in('suite_item_id', ids).order('step_number');
    if (error) throw error;
    return (data ?? []).map(mapTestSuiteItemStepRow);
  },
  async findStepsByItem(id: string) { return this.findStepsByItems([id]); },
  async createStepsMany(steps: { suiteItemId: string; action: string; expectedResult: string | null; stepNumber: number }[]) {
    if (!steps.length) return [];
    const { data, error } = await supabase.from('test_suite_item_steps').insert(steps.map((s) => ({ suite_item_id: s.suiteItemId, step_number: s.stepNumber, action: s.action, expected_result: s.expectedResult }))).select('*');
    if (error) throw error;
    return (data ?? []).map(mapTestSuiteItemStepRow);
  },
  async replaceStepsForItem(id: string, steps: { action: string; expectedResult: string | null }[]) {
    const { error: deleteError } = await supabase.from('test_suite_item_steps').delete().eq('suite_item_id', id);
    if (deleteError) throw deleteError;
    return this.createStepsMany(steps.map((s, index) => ({ suiteItemId: id, stepNumber: index + 1, action: s.action, expectedResult: s.expectedResult })));
  },
};
