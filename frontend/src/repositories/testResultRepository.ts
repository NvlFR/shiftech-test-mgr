import { supabase } from '../config/supabaseClient';
import { mapProfileRow, mapTestCaseRow, mapTestResultRow } from '../helpers/mappers';
import type { TestResult, TestResultStatus, TestResultWithDetails } from '../types/domain';

export const testResultRepository = {
  // One row per test case in the plan, seeded as 'not_run' the moment a run starts —
  // this is what lets the run screen show every case up front, not just the ones touched so far.
  async seedForRun(testRunId: string, testCaseIds: string[]): Promise<void> {
    if (testCaseIds.length === 0) return;
    const { error } = await supabase
      .from('test_results')
      .insert(testCaseIds.map((testCaseId) => ({ test_run_id: testRunId, test_case_id: testCaseId })));
    if (error) throw error;
  },

  async findAllByRun(testRunId: string): Promise<TestResultWithDetails[]> {
    const { data, error } = await supabase
      .from('test_results')
      .select('*, test_case:test_cases(*), tester:profiles(*)')
      .eq('test_run_id', testRunId);

    if (error) throw error;
    return (data ?? []).map((row: any) => ({
      ...mapTestResultRow(row),
      testCase: mapTestCaseRow(row.test_case),
      tester: row.tester ? mapProfileRow(row.tester) : null,
    }));
  },

  async recordResult(
    id: string,
    input: { status: TestResultStatus; testerId: string; notes: string | null },
  ): Promise<TestResult> {
    const { data, error } = await supabase
      .from('test_results')
      .update({
        status: input.status,
        tester_id: input.testerId,
        notes: input.notes,
        executed_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw error;
    return mapTestResultRow(data);
  },
};
