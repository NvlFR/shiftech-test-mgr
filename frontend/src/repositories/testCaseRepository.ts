import { supabase } from '../config/supabaseClient';
import { mapModuleRow, mapTagRow, mapTestCaseRow, mapTestCaseVersionRow, mapTestPlanCaseRow, mapTestRoleRow } from '../helpers/mappers';
import type { TestCase, TestCaseVersion, TestCaseWithDetails, TestPlanCase, TestPlanCaseWithDetails } from '../types/domain';

export const testCaseRepository = {
  async searchByProject(projectId: string, query: string, limit = 5): Promise<Pick<TestCase, 'id' | 'code' | 'title'>[]> {
    const search = query.trim().replace(/^#/, '').replace(/[,()%*]/g, '');
    if (!search) return [];
    const { data, error } = await supabase.from('test_cases').select('id, code, title').eq('project_id', projectId).or(`code.ilike.%${search}%,title.ilike.%${search}%`).limit(limit);
    if (error) throw error;
    return data ?? [];
  },

  async findByCode(projectId: string, code: string): Promise<TestCase | null> {
    const { data, error } = await supabase.from('test_cases').select('*').eq('project_id', projectId).eq('code', code).maybeSingle();
    if (error) throw error;
    return data ? mapTestCaseRow(data) : null;
  },

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
  async findAllByProjectWithDetails(projectId: string, options?: { search?: string; statuses?: TestCase['status'][]; priorities?: TestCase['priority'][]; moduleIds?: string[]; tagIds?: string[]; testRoleIds?: string[] }): Promise<TestCaseWithDetails[]> {
    let query = supabase
      .from('test_cases')
      .select('*, module:modules(*), test_case_tags(tag:tags(*)), target_role:test_roles(*)')
      .eq('project_id', projectId);

    const search = options?.search?.trim().replace(/[,()%*]/g, '');
    if (search) query = query.or(`title.ilike.%${search}%,code.ilike.%${search}%`);
    if (options?.statuses?.length) query = query.in('status', options.statuses);
    if (options?.priorities?.length) query = query.in('priority', options.priorities);
    if (options?.moduleIds?.length) query = query.in('module_id', options.moduleIds);
    if (options?.testRoleIds?.length) query = query.in('target_role_id', options.testRoleIds);
    if (options?.tagIds?.length) {
      const { data: linked, error: linkedError } = await supabase.from('test_case_tags').select('test_case_id').in('tag_id', options.tagIds);
      if (linkedError) throw linkedError;
      const caseIds = [...new Set((linked ?? []).map((row: any) => row.test_case_id))];
      if (!caseIds.length) return [];
      query = query.in('id', caseIds);
    }

    const { data, error } = await query.order('code');

    if (error) throw error;
    return (data ?? []).map((row: any) => ({
      ...mapTestCaseRow(row),
      module: row.module ? mapModuleRow(row.module) : null,
      tags: (row.test_case_tags ?? []).map((t: any) => mapTagRow(t.tag)),
      targetRole: row.target_role ? mapTestRoleRow(row.target_role) : null,
    }));
  },

  async findByIdsWithDetails(ids: string[]): Promise<TestCaseWithDetails[]> {
    if (!ids.length) return [];
    const { data, error } = await supabase.from('test_cases').select('*, module:modules(*), test_case_tags(tag:tags(*)), target_role:test_roles(*)').in('id', ids);
    if (error) throw error;
    return (data ?? []).map((row: any) => ({
      ...mapTestCaseRow(row),
      module: row.module ? mapModuleRow(row.module) : null,
      tags: (row.test_case_tags ?? []).map((tag: any) => mapTagRow(tag.tag)),
      targetRole: row.target_role ? mapTestRoleRow(row.target_role) : null,
    }));
  },

  async findById(id: string): Promise<TestCase | null> {
    const { data, error } = await supabase.from('test_cases').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return data ? mapTestCaseRow(data) : null;
  },

  async findByIdWithDetails(id: string): Promise<(TestCaseWithDetails & { project: { id: string; name: string } }) | null> {
    const { data, error } = await supabase
      .from('test_cases')
      .select('*, module:modules(*), test_case_tags(tag:tags(*)), target_role:test_roles(*), project:projects(id, name)')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    return {
      ...mapTestCaseRow(data),
      module: data.module ? mapModuleRow(data.module) : null,
      tags: (data.test_case_tags ?? []).map((t: any) => mapTagRow(t.tag)),
      targetRole: data.target_role ? mapTestRoleRow(data.target_role) : null,
      project: data.project,
    };
  },

  // `code` optional — omit/empty lets the `set_test_case_code` DB trigger auto-generate TC-####.
  async create(input: Omit<TestCase, 'id' | 'createdAt' | 'updatedAt' | 'code' | 'assignedTo'> & { code?: string | null; assignedTo?: string | null }): Promise<TestCase> {
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
        step_type: input.stepType,
        priority: input.priority,
        status: input.status,
        notes: input.notes,
        assigned_to: input.assignedTo ?? null,
        target_role_id: input.targetRoleId ?? null,
        external_links: input.externalLinks ?? [],
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
    if (changes.stepType !== undefined) payload.step_type = changes.stepType;
    if (changes.priority !== undefined) payload.priority = changes.priority;
    if (changes.status !== undefined) payload.status = changes.status;
    if (changes.notes !== undefined) payload.notes = changes.notes;
    if (changes.assignedTo !== undefined) payload.assigned_to = changes.assignedTo;
    if (changes.targetRoleId !== undefined) payload.target_role_id = changes.targetRoleId;
    if (changes.externalLinks !== undefined) payload.external_links = changes.externalLinks;

    const { data, error } = await supabase
      .from('test_cases')
      .update(payload)
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw error;
    return mapTestCaseRow(data);
  },

  async listVersions(testCaseId: string): Promise<TestCaseVersion[]> {
    const { data, error } = await supabase.from('test_case_versions').select('*').eq('test_case_id', testCaseId).order('version', { ascending: false });
    if (error) throw error;
    return (data ?? []).map(mapTestCaseVersionRow);
  },

  async bulkUpdate(ids: string[], changes: Partial<Pick<TestCase, 'priority' | 'status' | 'moduleId' | 'assignedTo'>>): Promise<void> {
    if (!ids.length) return;
    const payload: Record<string, unknown> = {};
    if (changes.priority !== undefined) payload.priority = changes.priority;
    if (changes.status !== undefined) payload.status = changes.status;
    if (changes.moduleId !== undefined) payload.module_id = changes.moduleId;
    if (changes.assignedTo !== undefined) payload.assigned_to = changes.assignedTo;
    const { error } = await supabase.from('test_cases').update(payload).in('id', ids);
    if (error) throw error;
  },

  async createMany(inputs: (Omit<TestCase, 'id' | 'createdAt' | 'updatedAt' | 'code' | 'assignedTo'> & { code?: string | null; assignedTo?: string | null })[]): Promise<TestCase[]> {
    if (!inputs.length) return [];
    const { data, error } = await supabase.from('test_cases').insert(inputs.map((input) => ({
      project_id: input.projectId, module_id: input.moduleId, code: input.code || undefined,
      title: input.title, objective: input.objective, preconditions: input.preconditions,
      steps: input.steps, expected_result: input.expectedResult, step_type: input.stepType,
      priority: input.priority, status: input.status, notes: input.notes,
      assigned_to: input.assignedTo ?? null, target_role_id: input.targetRoleId ?? null,
      external_links: input.externalLinks ?? [], created_by: input.createdBy ?? null,
    }))).select('*');
    if (error) throw error;
    return (data ?? []).map(mapTestCaseRow);
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase.from('test_cases').delete().eq('id', id);
    if (error) throw error;
  },

  // --- Junction: which test cases are in scope for a test plan (no result columns) ---

  async findCasesForPlan(testPlanId: string): Promise<TestPlanCaseWithDetails[]> {
    const { data, error } = await supabase
      .from('test_plan_cases')
      .select('*, test_case:test_cases(*, module:modules(*), test_case_tags(tag:tags(*)))')
      .eq('test_plan_id', testPlanId)
      .order('order', { ascending: true });

    if (error) throw error;
    return (data ?? []).map((row: any) => ({
      ...mapTestPlanCaseRow(row),
      testCase: {
        ...mapTestCaseRow(row.test_case),
        module: row.test_case.module ? mapModuleRow(row.test_case.module) : null,
        tags: (row.test_case.test_case_tags ?? []).map((t: any) => mapTagRow(t.tag)),
      },
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

  async attachToPlanMany(inputs: { testPlanId: string; testCaseId: string; order: number }[]): Promise<TestPlanCase[]> {
    if (!inputs.length) return [];
    const { data, error } = await supabase.from('test_plan_cases').insert(inputs.map((input) => ({ test_plan_id: input.testPlanId, test_case_id: input.testCaseId, order: input.order }))).select('*');
    if (error) throw error;
    return (data ?? []).map(mapTestPlanCaseRow);
  },

  async findAdjacentPlanCase(testPlanId: string, order: number, direction: 'before' | 'after'): Promise<TestPlanCase | null> {
    const { data, error } = await supabase.from('test_plan_cases').select('*').eq('test_plan_id', testPlanId).or(direction === 'after' ? `order.gt.${order}` : `order.lt.${order}`);
    if (error) throw error;
    if (!data?.length) return null;
    const rows = data.map(mapTestPlanCaseRow);
    return direction === 'after'
      ? rows.reduce((nearest, row) => row.order < nearest.order ? row : nearest)
      : rows.reduce((nearest, row) => row.order > nearest.order ? row : nearest);
  },

  async swapCaseOrder(testPlanCaseIdA: string, orderA: number, testPlanCaseIdB: string, orderB: number): Promise<void> {
    const [first, second] = await Promise.all([
      supabase.from('test_plan_cases').update({ order: orderB }).eq('id', testPlanCaseIdA),
      supabase.from('test_plan_cases').update({ order: orderA }).eq('id', testPlanCaseIdB),
    ]);
    if (first.error) throw first.error;
    if (second.error) throw second.error;
  },

  async detachFromPlan(testPlanCaseId: string): Promise<void> {
    const { error } = await supabase.from('test_plan_cases').delete().eq('id', testPlanCaseId);
    if (error) throw error;
  },
};
