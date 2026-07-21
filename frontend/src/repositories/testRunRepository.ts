import { supabase } from '../config/supabaseClient';
import { mapTestRunRow } from '../helpers/mappers';
import type { TestRun, TestRunStatus } from '../types/domain';

export const testRunRepository = {
  async findAllByPlan(testPlanId: string): Promise<TestRun[]> {
    const { data, error } = await supabase
      .from('test_runs')
      .select('*')
      .eq('test_plan_id', testPlanId)
      .order('started_at', { ascending: false });

    if (error) throw error;
    return (data ?? []).map(mapTestRunRow);
  },

  // Cross-plan listing for a whole project — joins through test_plans since
  // test_runs only has test_plan_id, not project_id directly.
  async findAllByProject(projectId: string): Promise<(TestRun & { testPlanName: string })[]> {
    const { data, error } = await supabase
      .from('test_runs')
      .select('*, test_plan:test_plans!inner(project_id, name)')
      .eq('test_plan.project_id', projectId)
      .order('started_at', { ascending: false });

    if (error) throw error;
    return (data ?? []).map((row: any) => ({ ...mapTestRunRow(row), testPlanName: row.test_plan.name }));
  },

  async findById(id: string): Promise<TestRun | null> {
    const { data, error } = await supabase.from('test_runs').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return data ? mapTestRunRow(data) : null;
  },

  // `code` optional — omit/empty lets the `set_test_run_code` DB trigger auto-generate TR-####.
  async create(input: { testPlanId: string; name: string; code?: string | null }): Promise<TestRun> {
    const { data, error } = await supabase
      .from('test_runs')
      .insert({ test_plan_id: input.testPlanId, name: input.name, code: input.code || undefined })
      .select('*')
      .single();

    if (error) throw error;
    return mapTestRunRow(data);
  },

  async update(id: string, changes: { name?: string; code?: string }): Promise<TestRun> {
    const { data, error } = await supabase.from('test_runs').update(changes).eq('id', id).select('*').single();
    if (error) throw error;
    return mapTestRunRow(data);
  },

  async updateStatus(id: string, status: TestRunStatus): Promise<TestRun> {
    const payload: Record<string, unknown> = { status };
    if (status === 'completed') payload.completed_at = new Date().toISOString();
    const { data, error } = await supabase.from('test_runs').update(payload).eq('id', id).select('*').single();
    if (error) throw error;
    return mapTestRunRow(data);
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase.from('test_runs').delete().eq('id', id);
    if (error) throw error;
  },
};
