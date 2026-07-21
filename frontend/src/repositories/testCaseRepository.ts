import { supabase } from '../config/supabaseClient';
import { mapModuleRow, mapTagRow, mapTestCaseRow, mapTestPlanCaseRow } from '../helpers/mappers';
import type { TestCase, TestCaseWithDetails, TestPlanCase, TestPlanCaseWithDetails } from '../types/domain';

export const testCaseRepository = {
  async findAllByProject(projectId: string): Promise<TestCase[]> {
    const { data, error } = await supabase
      .from('test_cases')
      .select('*')
      .eq('project_id', projectId)
      .order('code');

    if (error) throw error;
    return (data ?? []).map(mapTestCaseRow);
  },

  // Includes module + tags in one round trip — used by the list page so the
  // Module column and tag chips don't need N+1 queries.
  async findAllByProjectWithDetails(projectId: string): Promise<TestCaseWithDetails[]> {
    const { data, error } = await supabase
      .from('test_cases')
      .select('*, module:modules(*), test_case_tags(tag:tags(*))')
      .eq('project_id', projectId)
      .order('code');

    if (error) throw error;
    return (data ?? []).map((row: any) => ({
      ...mapTestCaseRow(row),
      module: row.module ? mapModuleRow(row.module) : null,
      tags: (row.test_case_tags ?? []).map((t: any) => mapTagRow(t.tag)),
    }));
  },

  async findById(id: string): Promise<TestCase | null> {
    const { data, error } = await supabase.from('test_cases').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return data ? mapTestCaseRow(data) : null;
  },

  // `code` optional — omit/empty lets the `set_test_case_code` DB trigger auto-generate TC-####.
  async create(input: Omit<TestCase, 'id' | 'createdAt' | 'updatedAt' | 'code'> & { code?: string | null }): Promise<TestCase> {
    const { data, error } = await supabase
      .from('test_cases')
      .insert({
        project_id: input.projectId,
        module_id: input.moduleId,
        code: input.code || undefined,
        title: input.title,
        objective: input.objective,
        preconditions: input.preconditions,
        steps: input.steps,
        expected_result: input.expectedResult,
        priority: input.priority,
        status: input.status,
        notes: input.notes,
      })
      .select('*')
      .single();

    if (error) throw error;
    return mapTestCaseRow(data);
  },

  async update(id: string, changes: Partial<Omit<TestCase, 'id' | 'projectId' | 'createdAt' | 'updatedAt'>>): Promise<TestCase> {
    const payload: Record<string, unknown> = {};
    if (changes.moduleId !== undefined) payload.module_id = changes.moduleId;
    if (changes.code !== undefined) payload.code = changes.code;
    if (changes.title !== undefined) payload.title = changes.title;
    if (changes.objective !== undefined) payload.objective = changes.objective;
    if (changes.preconditions !== undefined) payload.preconditions = changes.preconditions;
    if (changes.steps !== undefined) payload.steps = changes.steps;
    if (changes.expectedResult !== undefined) payload.expected_result = changes.expectedResult;
    if (changes.priority !== undefined) payload.priority = changes.priority;
    if (changes.status !== undefined) payload.status = changes.status;
    if (changes.notes !== undefined) payload.notes = changes.notes;

    const { data, error } = await supabase
      .from('test_cases')
      .update(payload)
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw error;
    return mapTestCaseRow(data);
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase.from('test_cases').delete().eq('id', id);
    if (error) throw error;
  },

  // --- Junction: which test cases are in scope for a test plan (no result columns) ---

  async findCasesForPlan(testPlanId: string): Promise<TestPlanCaseWithDetails[]> {
    const { data, error } = await supabase
      .from('test_plan_cases')
      .select('*, test_case:test_cases(*)')
      .eq('test_plan_id', testPlanId)
      .order('order', { ascending: true });

    if (error) throw error;
    return (data ?? []).map((row: any) => ({
      ...mapTestPlanCaseRow(row),
      testCase: mapTestCaseRow(row.test_case),
    }));
  },

  async attachToPlan(testPlanId: string, testCaseId: string, order: number): Promise<TestPlanCase> {
    const { data, error } = await supabase
      .from('test_plan_cases')
      .insert({ test_plan_id: testPlanId, test_case_id: testCaseId, order })
      .select('*')
      .single();

    if (error) throw error;
    return mapTestPlanCaseRow(data);
  },

  async detachFromPlan(testPlanCaseId: string): Promise<void> {
    const { error } = await supabase.from('test_plan_cases').delete().eq('id', testPlanCaseId);
    if (error) throw error;
  },
};
