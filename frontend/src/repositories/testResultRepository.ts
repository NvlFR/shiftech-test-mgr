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

  async getSummaryByRunIds(runIds: string[]): Promise<Record<string, { total: number; pass: number; fail: number }>> {
    if (runIds.length === 0) return {};
    const { data, error } = await supabase
      .from('test_results')
      .select('test_run_id, status')
      .in('test_run_id', runIds);

    if (error) throw error;
    const map: Record<string, { total: number; pass: number; fail: number }> = {};
    for (const runId of runIds) map[runId] = { total: 0, pass: 0, fail: 0 };
    for (const row of data ?? []) {
      const entry = map[row.test_run_id];
      if (!entry) continue;
      entry.total++;
      if (row.status === 'pass') entry.pass++;
      if (row.status === 'fail') entry.fail++;
    }
    return map;
  },

  async getDistinctTestersByRunIds(runIds: string[]): Promise<Record<string, { id: string; fullName: string | null }[]>> {
    if (runIds.length === 0) return {};
    const { data, error } = await supabase
      .from('test_results')
      .select('test_run_id, tester_id')
      .in('test_run_id', runIds)
      .not('tester_id', 'is', null);

    if (error) throw error;
    const profileIds = [...new Set((data ?? []).map((r: any) => r.tester_id).filter(Boolean))];
    const map: Record<string, { id: string; fullName: string | null }[]> = {};
    if (profileIds.length === 0) return map;

    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', profileIds);
    if (profileError) throw profileError;
    const profileMap = Object.fromEntries((profiles ?? []).map((p: any) => [p.id, { id: p.id, fullName: p.full_name }]));

    const seen = new Set<string>();
    for (const row of data ?? []) {
      const key = `${row.test_run_id}:${row.tester_id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const t = profileMap[row.tester_id];
      if (!t) continue;
      if (!map[row.test_run_id]) map[row.test_run_id] = [];
      map[row.test_run_id].push(t);
    }
    for (const runId of runIds) if (!map[runId]) map[runId] = [];
    return map;
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
