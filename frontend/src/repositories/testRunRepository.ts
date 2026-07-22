import { supabase } from '../config/supabaseClient';
import { mapTestRunAssignmentRow, mapTestRunRow } from '../helpers/mappers';
import type { TestRun, TestRunAssignment, TestRunStatus } from '../types/domain';

export type TestRunFilters = {
  status?: TestRunStatus | null;
  testerId?: string | null;
  environmentId?: string | null;
  browser?: string | null;
  device?: string | null;
  buildVersion?: string | null;
  release?: string | null;
};

export const testRunRepository = {
  async findAllByPlan(testPlanId: string, filters: TestRunFilters = {}): Promise<TestRun[]> {
    let query = supabase
      .from('test_runs')
      .select('*')
      .eq('test_plan_id', testPlanId);
    if (filters.status) query = query.eq('status', filters.status);
    if (filters.browser?.trim()) query = query.ilike('browser', `%${filters.browser.trim()}%`);
    if (filters.device?.trim()) query = query.ilike('device', `%${filters.device.trim()}%`);
    if (filters.buildVersion?.trim()) query = query.ilike('build_version', `%${filters.buildVersion.trim()}%`);
    if (filters.release?.trim()) query = query.ilike('release', `%${filters.release.trim()}%`);
    const { data, error } = await query.order('started_at', { ascending: false });

    if (error) throw error;
    return (data ?? []).map(mapTestRunRow);
  },

  // Cross-plan listing for a whole project — joins through test_plans since
  // test_runs only has test_plan_id, not project_id directly.
  async findAllByProject(projectId: string, filters: TestRunFilters = {}): Promise<(TestRun & { testPlanId: string; testPlanName: string })[]> {
    let query = supabase
      .from('test_runs')
      .select('*, test_plan:test_plans!inner(project_id, name)')
      .eq('test_plan.project_id', projectId);
    if (filters.status) query = query.eq('status', filters.status);
    if (filters.environmentId) query = query.eq('environment_id', filters.environmentId);
    if (filters.browser?.trim()) query = query.ilike('browser', `%${filters.browser.trim()}%`);
    if (filters.device?.trim()) query = query.ilike('device', `%${filters.device.trim()}%`);
    if (filters.buildVersion?.trim()) query = query.ilike('build_version', `%${filters.buildVersion.trim()}%`);
    if (filters.release?.trim()) query = query.ilike('release', `%${filters.release.trim()}%`);
    const { data, error } = await query.order('started_at', { ascending: false });

    if (error) throw error;
    return (data ?? []).map((row: any) => ({
      ...mapTestRunRow(row),
      testPlanId: row.test_plan_id,
      testPlanName: row.test_plan.name,
    }));
  },

  async findById(id: string): Promise<TestRun | null> {
    const { data, error } = await supabase.from('test_runs').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return data ? mapTestRunRow(data) : null;
  },

  // `code` optional — omit/empty lets the `set_test_run_code` DB trigger auto-generate TR-####.
  async create(input: { testPlanId: string; name: string; code?: string | null; environmentId?: string | null; browser?: string | null; device?: string | null; buildVersion?: string | null; release?: string | null }): Promise<TestRun> {
    const { data, error } = await supabase
      .from('test_runs')
      .insert({ test_plan_id: input.testPlanId, name: input.name, code: input.code || undefined, environment_id: input.environmentId || null, browser: input.browser || null, device: input.device || null, build_version: input.buildVersion || null, release: input.release || null })
      .select('*')
      .single();

    if (error) throw error;
    return mapTestRunRow(data);
  },

  async update(id: string, changes: { name?: string; code?: string; environmentId?: string | null; browser?: string | null; device?: string | null; buildVersion?: string | null; release?: string | null }): Promise<TestRun> {
    const payload: Record<string, unknown> = { name: changes.name, code: changes.code, environment_id: changes.environmentId, browser: changes.browser, device: changes.device, build_version: changes.buildVersion, release: changes.release };
    Object.keys(payload).forEach((key) => payload[key] === undefined && delete payload[key]);
    const { data, error } = await supabase.from('test_runs').update(payload).eq('id', id).select('*').single();
    if (error) throw error;
    return mapTestRunRow(data);
  },

  async updateStatus(id: string, status: TestRunStatus, notes?: string | null): Promise<TestRun> {
    const payload: Record<string, unknown> = { status };
    if (status === 'completed') payload.completed_at = new Date().toISOString();
    if (notes !== undefined) payload.notes = notes;
    const { data, error } = await supabase.from('test_runs').update(payload).eq('id', id).select('*').single();
    if (error) throw error;
    return mapTestRunRow(data);
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase.from('test_runs').delete().eq('id', id);
    if (error) throw error;
  },

  async listAssignments(testRunId: string): Promise<TestRunAssignment[]> {
    const { data, error } = await supabase.from('test_run_assignments').select('*').eq('test_run_id', testRunId);
    if (error) throw error;
    return (data ?? []).map(mapTestRunAssignmentRow);
  },

  async assign(testRunId: string, testCaseIds: string[], testerId: string): Promise<void> {
    if (!testCaseIds.length) return;
    const { error } = await supabase.from('test_run_assignments').upsert(testCaseIds.map((testCaseId) => ({ test_run_id: testRunId, test_case_id: testCaseId, tester_id: testerId })), { onConflict: 'test_run_id,test_case_id' });
    if (error) throw error;
    const { error: resultError } = await supabase.from('test_results').update({ tester_id: testerId }).eq('test_run_id', testRunId).in('test_case_id', testCaseIds).eq('status', 'not_run');
    if (resultError) throw resultError;
  },
};
