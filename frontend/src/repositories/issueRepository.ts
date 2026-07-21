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

export const issueRepository = {
  async findById(id: string): Promise<(IssueWithDetails & { projectId: string | null }) | null> {
    const { data, error } = await supabase
      .from('issues')
      .select(
        '*, assignee:profiles(*), test_result:test_results!inner(test_run_id, test_case:test_cases(id, code, title, priority, module:modules(*), test_case_tags(tag:tags(*))), test_run:test_runs(id, code, name, test_plan:test_plans(project_id)))',
      )
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    return {
      ...mapIssueRow(data),
      assignee: data.assignee ? mapProfileRow(data.assignee) : null,
      testCase: mapTestCaseSummary(data.test_result?.test_case),
      testRun: data.test_result?.test_run ?? null,
      projectId: data.test_result?.test_run?.test_plan?.project_id ?? null,
    };
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
      .select('*, assignee:profiles(*)')
      .eq('test_result_id', testResultId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data ?? []).map((row: any) => ({
      ...mapIssueRow(row),
      assignee: row.assignee ? mapProfileRow(row.assignee) : null,
      testCase: null,
      testRun: null,
    }));
  },

  // Issues across an entire test run (joined through test_results) — for a run-level issue list.
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
