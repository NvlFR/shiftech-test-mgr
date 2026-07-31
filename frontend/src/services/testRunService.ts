import { testRunRepository } from '../repositories/testRunRepository';
import { testResultRepository } from '../repositories/testResultRepository';
import { testCaseRepository } from '../repositories/testCaseRepository';
import { calculateTestRunSummary } from '../helpers/testRunSummary';
import type { TestResultStatus } from '../types/domain';
import type { TestRunFilters } from '../repositories/testRunRepository';

export const testRunService = {
  listByPlan(testPlanId: string, filters?: TestRunFilters) {
    return testRunRepository.findAllByPlan(testPlanId, filters);
  },

  listByProject(projectId: string, filters?: TestRunFilters) {
    return Promise.all([testRunRepository.findAllByProject(projectId, filters), testRunRepository.findAllCustomByProject(projectId, filters)]).then(([planned, custom]) => [...planned, ...custom].sort((a, b) => b.startedAt.localeCompare(a.startedAt)));
  },

  async listByProjectWithSummary(projectId: string, filters?: TestRunFilters) {
    const runs = await testRunRepository.findAllByProject(projectId, filters);
    const runIds = runs.map((r) => r.id);
    const [summary, testers] = await Promise.all([
      testResultRepository.getSummaryByRunIds(runIds),
      testResultRepository.getDistinctTestersByRunIds(runIds),
    ]);
    return runs.map((r) => ({ ...r, ...summary[r.id] ?? { total: 0, pass: 0, fail: 0 }, testers: testers[r.id] ?? [] })).filter((run) => !filters?.testerId || run.testers.some((tester) => tester.id === filters.testerId));
  },

  async listByPlanWithSummary(testPlanId: string, filters?: TestRunFilters) {
    const runs = await testRunRepository.findAllByPlan(testPlanId, filters);
    const runIds = runs.map((r) => r.id);
    const [summary, testers] = await Promise.all([
      testResultRepository.getSummaryByRunIds(runIds),
      testResultRepository.getDistinctTestersByRunIds(runIds),
    ]);
    return runs.map((r) => ({ ...r, ...summary[r.id] ?? { total: 0, pass: 0, fail: 0 }, testers: testers[r.id] ?? [] })).filter((run) => !filters?.testerId || run.testers.some((tester) => tester.id === filters.testerId));
  },

  getById(id: string) {
    return testRunRepository.findById(id);
  },

  // Starting a run snapshots every test case currently in the plan's scope into
  // test_results as 'not_run' — later edits to the plan's case list don't retroactively
  // change what this run covers, matching how a real regression cycle has a fixed scope.
  async start(testPlanId: string, name: string, options: { code?: string; environmentId?: string | null; browser?: string; device?: string; buildVersion?: string; release?: string } = {}) {
    if (!name.trim()) throw new Error('Nama test run tidak boleh kosong');

    const planCases = await testCaseRepository.findCasesForPlan(testPlanId);
    if (planCases.length === 0) {
      throw new Error('Test plan ini belum punya test case — tambahkan test case dulu sebelum memulai run');
    }

    const run = await testRunRepository.create({
      testPlanId, name: name.trim(), code: options.code?.trim() || null,
      environmentId: options.environmentId || null, browser: options.browser?.trim() || null,
      device: options.device?.trim() || null, buildVersion: options.buildVersion?.trim() || null,
      release: options.release?.trim() || null,
    });
    await testResultRepository.seedForRun(
      run.id,
      planCases.map((pc) => pc.testCaseId),
    );
    return run;
  },

  async startCustom(projectId: string, testCaseIds: string[], name: string, options: { browser?: string; device?: string } = {}) {
    if (!name.trim()) throw new Error('Nama test run tidak boleh kosong');
    if (!testCaseIds.length) throw new Error('Pilih minimal satu test case');
    const run = await testRunRepository.createCustom({ projectId, name: name.trim(), browser: options.browser?.trim(), device: options.device?.trim() });
    try {
      await testRunRepository.attachCases(run.id, testCaseIds);
      await testResultRepository.seedForRun(run.id, testCaseIds);
      return run;
    } catch (error) {
      await testRunRepository.remove(run.id);
      throw error;
    }
  },

  rename(id: string, input: { name: string; code: string }) {
    if (!input.name.trim()) throw new Error('Nama test run tidak boleh kosong');
    if (!input.code.trim()) throw new Error('Kode test run tidak boleh kosong');
    return testRunRepository.update(id, { name: input.name.trim(), code: input.code.trim() });
  },

  // "Completed" is always a manual action (per product decision) — never inferred
  // automatically from every result being filled in.
  complete(id: string, notes?: string | null) {
    return testRunRepository.updateStatus(id, 'completed', notes);
  },

  reopen(id: string) {
    return testRunRepository.updateStatus(id, 'in_progress');
  },

  remove(id: string) {
    return testRunRepository.remove(id);
  },

  async getWithResults(testRunId: string) {
    const results = await testResultRepository.findAllByRun(testRunId);

    // Overall status is always derived, never stored — this is the "automatic" half
    // of the product decision (manual completion, automatic summary).
    return { results, summary: calculateTestRunSummary(results) };
  },

  async recordResult(id: string, testerId: string, status: TestResultStatus, notes: string | null) {
    // A completed run is frozen — results must not change silently. Reopen it first (manual action,
    // mirroring the manual-completion product decision) before recording again.
    const context = await testResultRepository.findExecutionContext(id);
    if (!context) throw new Error('Test result tidak ditemukan');
    if (context.runStatus === 'completed') {
      throw new Error('Test run sudah selesai — buka kembali (reopen) untuk mencatat hasil');
    }
    return testResultRepository.recordResult(id, { status, testerId, notes });
  },

  assign(testRunId: string, testCaseIds: string[], testerId: string) {
    if (!testRunId || !testCaseIds.length || !testerId) throw new Error('Run, test case, dan tester wajib dipilih');
    return testRunRepository.assign(testRunId, testCaseIds, testerId);
  },

  listAssignments(testRunId: string) {
    return testRunRepository.listAssignments(testRunId);
  },
};
