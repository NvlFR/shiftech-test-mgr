import { supabase } from '../config/supabaseClient';
import { mapIssueRow, mapModuleRow, mapProfileRow, mapTagRow } from '../helpers/mappers';
import type { Issue, IssueStatus, IssueWithDetails } from '../types/domain';

function mapTestCaseSummary(testCase: any) {
  if (!testCase) return null;
  return {
    id: testCase.id,
    code: testCase.code,
    title: testCase.title,
    priority: testCase.priority,
    module: testCase.module ? mapModuleRow(testCase.module) : null,
    tags: (testCase.test_case_tags ?? []).map((t: any) => mapTagRow(t.tag)),
  };
}

function mapIssueDetails(row: any): IssueWithDetails {
  const result = row.test_result;
  const testRun = result?.test_run ?? null;
  const projectId = testRun?.test_plan?.project_id ?? testRun?.custom_project_id ?? null;
  return {
    ...mapIssueRow({ ...row, project_id: projectId }),
    assignee: row.assignee ? mapProfileRow(row.assignee) : null,
    testCase: mapTestCaseSummary(result?.test_case),
    testRun,
    targetRole: row.target_role ?? null,
    tags: [],
    linkedTestResults: result ? [{ id: result.id, testRunId: result.test_run_id, testCaseCode: result.test_case?.code ?? null, testCaseTitle: result.test_case?.title ?? '', testRun }] : [],
  };
}

export const issueRepository = {
  async searchByProject(projectId: string, query: string, limit = 5): Promise<Pick<Issue, 'id' | 'code' | 'title'>[]> {
    const search = query.trim().replace(/^!/, '').replace(/[,()%*]/g, '');
    if (!search) return [];
    const { data, error } = await supabase.from('issues').select('id, code, title').eq('project_id', projectId).or(`code.ilike.%${search}%,title.ilike.%${search}%`).limit(limit);
    if (error) throw error;
    return data ?? [];
  },

  async findByCode(projectId: string, code: string): Promise<Issue | null> {
    const { data, error } = await supabase.from('issues').select('*').eq('project_id', projectId).eq('code', code).maybeSingle();
    if (error) throw error;
    return data ? mapIssueRow(data) : null;
  },

  async findById(id: string): Promise<(IssueWithDetails & { projectId: string | null }) | null> {
    const { data, error } = await supabase
      .from('issues')
      .select(
        '*, assignee:profiles(*), target_role:test_roles(*), test_result:test_results!inner(id, test_run_id, test_case:test_cases(id, code, title, priority, module:modules(*), test_case_tags(tag:tags(*))), test_run:test_runs(id, code, name, custom_project_id, test_plan:test_plans(project_id)))',
      )
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    return { ...mapIssueDetails(data), projectId: data.test_result?.test_run?.test_plan?.project_id ?? data.test_result?.test_run?.custom_project_id ?? null };
  },

  async update(
    id: string,
    changes: Partial<Pick<Issue, 'title' | 'description' | 'actualResult' | 'expectedResult' | 'priority'>>,
  ): Promise<Issue> {
    const payload: Record<string, unknown> = {};
    if (changes.title !== undefined) payload.title = changes.title;
    if (changes.description !== undefined) payload.description = changes.description;
    if (changes.actualResult !== undefined) payload.actual_result = changes.actualResult;
    if (changes.expectedResult !== undefined) payload.expected_result = changes.expectedResult;
    if (changes.priority !== undefined) payload.priority = changes.priority;

    const { data, error } = await supabase.from('issues').update(payload).eq('id', id).select('*').single();
    if (error) throw error;
    return mapIssueRow(data);
  },

  async findAllByTestResult(testResultId: string): Promise<IssueWithDetails[]> {
    const { data, error } = await supabase
      .from('issues')
      .select('*, assignee:profiles(*), target_role:test_roles(*)')
      .eq('test_result_id', testResultId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data ?? []).map((row: any) => ({
      ...mapIssueRow(row),
      assignee: row.assignee ? mapProfileRow(row.assignee) : null,
      testCase: null,
      testRun: null,
      targetRole: row.target_role ?? null,
      tags: [],
      linkedTestResults: [],
    }));
  },

  // Issues across an entire project (joined test_runs → test_plans by project_id) — for a project-level issue list.
  async findAllByProject(projectId: string): Promise<IssueWithDetails[]> {
    const { data: runData, error: runError } = await supabase
      .from('test_runs')
      .select('id, test_plan:test_plans!inner(project_id)')
      .eq('test_plan.project_id', projectId);
    if (runError) throw runError;
    const runIds = (runData ?? []).map((r: any) => r.id);
    if (runIds.length === 0) return [];

    const { data, error } = await supabase
      .from('issues')
      .select(
        '*, assignee:profiles(*), test_result:test_results!inner(test_run_id, test_case:test_cases(id, code, title, priority, module:modules(*), test_case_tags(tag:tags(*))), test_run:test_runs(id, code, name))',
      )
      .in('test_result.test_run_id', runIds)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data ?? []).map((row: any) => ({
      ...mapIssueRow(row),
      assignee: row.assignee ? mapProfileRow(row.assignee) : null,
      testCase: mapTestCaseSummary(row.test_result?.test_case),
      testRun: row.test_result?.test_run ?? null,
    }));
  },

  async findAllByTestRun(testRunId: string): Promise<IssueWithDetails[]> {
    const { data, error } = await supabase
      .from('issues')
      .select(
        '*, assignee:profiles(*), test_result:test_results!inner(test_run_id, test_case:test_cases(id, code, title), test_run:test_runs(id, code, name))',
      )
      .eq('test_result.test_run_id', testRunId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data ?? []).map((row: any) => ({
      ...mapIssueRow(row),
      assignee: row.assignee ? mapProfileRow(row.assignee) : null,
      testCase: row.test_result?.test_case ?? null,
      testRun: row.test_result?.test_run ?? null,
    }));
  },

  async create(input: Omit<Issue, 'id' | 'code' | 'createdAt' | 'updatedAt'>): Promise<Issue> {
    const { data, error } = await supabase
      .from('issues')
      .insert({
        test_result_id: input.testResultId,
        title: input.title,
        description: input.description,
        actual_result: input.actualResult,
        expected_result: input.expectedResult,
        priority: input.priority,
        status: input.status,
        assigned_to: input.assignedTo,
      })
      .select('*')
      .single();

    if (error) throw error;
    return mapIssueRow(data);
  },

  async updateStatus(id: string, status: IssueStatus): Promise<Issue> {
    const { data, error } = await supabase.from('issues').update({ status }).eq('id', id).select('*').single();
    if (error) throw error;
    return mapIssueRow(data);
  },

  async assign(id: string, assignedTo: string | null): Promise<Issue> {
    const { data, error } = await supabase.from('issues').update({ assigned_to: assignedTo }).eq('id', id).select('*').single();
    if (error) throw error;
    return mapIssueRow(data);
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase.from('issues').delete().eq('id', id);
    if (error) throw error;
  },
};
