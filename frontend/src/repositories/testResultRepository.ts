import { supabase } from '../config/supabaseClient';
import { mapProfileRow, mapTestCaseRow, mapTestResultRow, mapTestResultStepRow } from '../helpers/mappers';
import { fetchAllRows } from './paginate';
import type { AutomationArtifact, TestResult, TestResultStatus, TestResultWithDetails, TestRunStatus } from '../types/domain';

export const testResultRepository = {
  async findById(id: string): Promise<TestResultWithDetails | null> {
    const { data, error } = await supabase
      .from('test_results')
      .select('*, test_case:test_cases(*), tester:profiles(*)')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return {
      ...mapTestResultRow(data),
      testCase: mapTestCaseRow(data.test_case),
      tester: data.tester ? mapProfileRow(data.tester) : null,
    };
  },

  async getArtifactSignedUrl(bucket: string, path: string): Promise<string> {
    const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 300);
    if (error) throw error;
    return data.signedUrl;
  },

  async getArtifactText(artifact: AutomationArtifact): Promise<string> {
    if (artifact.bucket && artifact.path) {
      const { data, error } = await supabase.storage.from(artifact.bucket).download(artifact.path);
      if (error) throw error;
      return data.text();
    }
    if (/^https?:\/\//.test(artifact.url)) {
      const response = await fetch(artifact.url);
      if (!response.ok) throw new Error(`Artifact tidak dapat dibaca (${response.status})`);
      return response.text();
    }
    throw new Error('Artifact hanya tersedia lokal di runner');
  },

  // One row per test case in the plan, seeded as 'not_run' the moment a run starts —
  // this is what lets the run screen show every case up front, not just the ones touched so far.
  async seedForRun(testRunId: string, testCaseIds: string[]): Promise<void> {
    if (testCaseIds.length === 0) return;

    const { data: testCases, error: testCasesError } = await supabase
      .from('test_cases')
      .select('id, code, title, objective, preconditions, steps, expected_result, priority')
      .in('id', testCaseIds);
    if (testCasesError) throw testCasesError;

    const testCasesById = new Map((testCases ?? []).map((testCase: any) => [testCase.id, testCase]));
    const missingTestCaseIds = testCaseIds.filter((testCaseId) => !testCasesById.has(testCaseId));
    if (missingTestCaseIds.length > 0) {
      throw new Error(`Test case tidak ditemukan: ${missingTestCaseIds.join(', ')}`);
    }

    const { error } = await supabase
      .from('test_results')
      .insert(testCaseIds.map((testCaseId) => {
        const testCase = testCasesById.get(testCaseId);
        return {
          test_run_id: testRunId,
          test_case_id: testCaseId,
          test_case_code: testCase.code,
          test_case_title: testCase.title,
          test_case_objective: testCase.objective,
          test_case_preconditions: testCase.preconditions,
          test_case_steps: testCase.steps,
          test_case_expected_result: testCase.expected_result,
          test_case_priority: testCase.priority,
        };
      }));
    if (error) throw error;

    const { data: steps, error: stepsError } = await supabase
      .from('test_case_steps')
      .select('id, test_case_id, step_number, action, expected_result')
      .in('test_case_id', testCaseIds);
    if (stepsError) throw stepsError;
    if (steps?.length) {
      const resultRows = await supabase.from('test_results').select('id, test_case_id').eq('test_run_id', testRunId).in('test_case_id', testCaseIds);
      if (resultRows.error) throw resultRows.error;
      const resultByCase = new Map((resultRows.data ?? []).map((row: any) => [row.test_case_id, row.id]));
      const stepRows = steps.flatMap((step: any) => {
        const resultId = resultByCase.get(step.test_case_id);
        return resultId ? [{ test_result_id: resultId, test_case_step_id: step.id, step_number: step.step_number, action: step.action, expected_result: step.expected_result }] : [];
      });
      if (stepRows.length) {
        const { error: stepInsertError } = await supabase.from('test_result_steps').insert(stepRows);
        if (stepInsertError) throw stepInsertError;
      }
    }
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

  async syncWithTestCase(id: string): Promise<TestResult> {
    const { data: result, error: resultError } = await supabase.from('test_results').select('test_case_id').eq('id', id).single();
    if (resultError) throw resultError;
    const { data: testCase, error: testCaseError } = await supabase.from('test_cases').select('*').eq('id', result.test_case_id).single();
    if (testCaseError) throw testCaseError;
    const { data, error } = await supabase.from('test_results').update({
      test_case_code: testCase.code,
      test_case_title: testCase.title,
      test_case_objective: testCase.objective,
      test_case_preconditions: testCase.preconditions,
      test_case_steps: testCase.steps,
      test_case_expected_result: testCase.expected_result,
      test_case_priority: testCase.priority,
    }).eq('id', id).select('*').single();
    if (error) throw error;
    return mapTestResultRow(data);
  },

  async getSummaryByRunIds(runIds: string[]): Promise<Record<string, { total: number; pass: number; fail: number; skip: number; blocked: number; notRun: number }>> {
    if (runIds.length === 0) return {};
    const data = await fetchAllRows<any>((from, to) =>
      supabase.from('test_results').select('test_run_id, status').in('test_run_id', runIds).range(from, to),
    );

    const map: Record<string, { total: number; pass: number; fail: number; skip: number; blocked: number; notRun: number }> = {};
    for (const runId of runIds) map[runId] = { total: 0, pass: 0, fail: 0, skip: 0, blocked: 0, notRun: 0 };
    for (const row of data) {
      const entry = map[row.test_run_id];
      if (!entry) continue;
      entry.total++;
      if (row.status === 'pass') entry.pass++;
      if (row.status === 'fail') entry.fail++;
      if (row.status === 'skip') entry.skip++;
      if (row.status === 'blocked') entry.blocked++;
      if (row.status === 'not_run') entry.notRun++;
    }
    return map;
  },

  async getDistinctTestersByRunIds(runIds: string[]): Promise<Record<string, { id: string; fullName: string | null }[]>> {
    if (runIds.length === 0) return {};
    const data = await fetchAllRows<any>((from, to) =>
      supabase.from('test_results').select('test_run_id, tester_id').in('test_run_id', runIds).not('tester_id', 'is', null).range(from, to),
    );

    const profileIds = [...new Set(data.map((r: any) => r.tester_id).filter(Boolean))];
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
        // Reverting a result to 'not_run' must clear executed_at — otherwise the row shows an
        // execution timestamp while the summary counts it as not-yet-executed.
        executed_at: input.status === 'not_run' ? null : new Date().toISOString(),
      })
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw error;
    return mapTestResultRow(data);
  },

  async recordStepResult(testResultStepId: string, input: { status: 'pass' | 'fail'; actualResult: string | null }) {
    const { data, error } = await supabase.from('test_result_steps').update({ status: input.status, actual_result: input.actualResult }).eq('id', testResultStepId).select('*').single();
    if (error) throw error;
    return mapTestResultStepRow(data);
  },

  // Lightweight lookup for business-rule guards: a result's own status plus its run's status,
  // in one round trip. Used to enforce "issue only for FAIL" and "no recording on a completed run".
  async findExecutionContext(
    resultId: string,
  ): Promise<{ resultStatus: TestResultStatus; runStatus: TestRunStatus } | null> {
    const { data, error } = await supabase
      .from('test_results')
      .select('status, test_run:test_runs(status)')
      .eq('id', resultId)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    const run = (data as any).test_run;
    return { resultStatus: (data as any).status, runStatus: run?.status };
  },
};
