import { supabase } from '../config/supabaseClient';
import { mapIssueRow, mapProfileRow } from '../helpers/mappers';
import type { Issue, IssueStatus, IssueWithDetails } from '../types/domain';

export const issueRepository = {
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
    }));
  },

  // Issues across an entire test run (joined through test_results) — for a run-level issue list.
  async findAllByTestRun(testRunId: string): Promise<IssueWithDetails[]> {
    const { data, error } = await supabase
      .from('issues')
      .select('*, assignee:profiles(*), test_result:test_results!inner(test_run_id)')
      .eq('test_result.test_run_id', testRunId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data ?? []).map((row: any) => ({
      ...mapIssueRow(row),
      assignee: row.assignee ? mapProfileRow(row.assignee) : null,
    }));
  },

  async create(input: Omit<Issue, 'id' | 'createdAt' | 'updatedAt'>): Promise<Issue> {
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
