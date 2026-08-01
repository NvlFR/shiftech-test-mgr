import { beforeEach, describe, expect, it, vi } from 'vitest';
import { makeProfile, makeTestPlan, makeTestResult, makeTestRun } from '../test';

const repositories = vi.hoisted(() => ({
  testRun: {
    create: vi.fn(),
    update: vi.fn(),
    updateStatus: vi.fn(),
  },
  testResult: {
    seedForRun: vi.fn(),
    findAllByRun: vi.fn(),
    getSummaryByRunIds: vi.fn(),
    findExecutionContext: vi.fn(),
    recordResult: vi.fn(),
  },
  testCase: {
    findCasesForPlan: vi.fn(),
    update: vi.fn(),
    addCasesToPlan: vi.fn(),
  },
  testPlan: {
    findById: vi.fn(),
  },
  projectRepositoryLink: {
    findById: vi.fn(),
  },
  profile: {
    findById: vi.fn(),
  },
}));

vi.mock('../repositories/testRunRepository', () => ({
  testRunRepository: repositories.testRun,
}));
vi.mock('../repositories/testResultRepository', () => ({
  testResultRepository: repositories.testResult,
}));
vi.mock('../repositories/testCaseRepository', () => ({
  testCaseRepository: repositories.testCase,
}));
vi.mock('../repositories/testPlanRepository', () => ({
  testPlanRepository: repositories.testPlan,
}));
vi.mock('../repositories/projectRepositoryLinkRepository', () => ({
  projectRepositoryLinkRepository: repositories.projectRepositoryLink,
}));
vi.mock('../repositories/profileRepository', () => ({
  profileRepository: repositories.profile,
}));

import { testRunService } from './testRunService';

describe('testRunService invariants', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('stores execution state only in test_results, never in test_cases or test_plan_cases', async () => {
    const run = makeTestRun();
    repositories.testCase.findCasesForPlan.mockResolvedValue([
      { id: 'plan-case-1', testPlanId: 'test-plan-1', testCaseId: 'test-case-1', order: 0 },
      { id: 'plan-case-2', testPlanId: 'test-plan-1', testCaseId: 'test-case-2', order: 1 },
    ]);
    repositories.testPlan.findById.mockResolvedValue(makeTestPlan());
    repositories.testRun.create.mockResolvedValue(run);
    repositories.testResult.seedForRun.mockResolvedValue(undefined);

    await testRunService.start('test-plan-1', ' Regression ');

    expect(repositories.testRun.create).toHaveBeenCalledWith(expect.objectContaining({
      testPlanId: 'test-plan-1',
      name: 'Regression',
    }));
    expect(repositories.testResult.seedForRun).toHaveBeenCalledWith(
      run.id,
      ['test-case-1', 'test-case-2'],
    );
    expect(repositories.testCase.update).not.toHaveBeenCalled();
    expect(repositories.testCase.addCasesToPlan).not.toHaveBeenCalled();
    expect(repositories.testRun.update).not.toHaveBeenCalled();
    expect(repositories.testRun.updateStatus).not.toHaveBeenCalled();
  });

  it('recomputes summary and progress from test_results on every read without persisting them', async () => {
    repositories.testResult.findAllByRun
      .mockResolvedValueOnce([
        makeTestResult({ id: 'result-1', status: 'pass' }),
        makeTestResult({ id: 'result-2', testCaseId: 'test-case-2', status: 'not_run' }),
      ])
      .mockResolvedValueOnce([
        makeTestResult({ id: 'result-1', status: 'pass' }),
        makeTestResult({ id: 'result-2', testCaseId: 'test-case-2', status: 'fail' }),
      ]);

    const firstRead = await testRunService.getWithResults('test-run-1');
    const secondRead = await testRunService.getWithResults('test-run-1');

    expect(firstRead.summary).toEqual({
      total: 2,
      executed: 1,
      progressPercent: 50,
      pass: 1,
      fail: 0,
      skip: 0,
      blocked: 0,
      notRun: 1,
    });
    expect(secondRead.summary).toEqual({
      total: 2,
      executed: 2,
      progressPercent: 100,
      pass: 1,
      fail: 1,
      skip: 0,
      blocked: 0,
      notRun: 0,
    });
    expect(repositories.testResult.findAllByRun).toHaveBeenCalledTimes(2);
    expect(repositories.testResult.getSummaryByRunIds).not.toHaveBeenCalled();
    expect(repositories.testRun.update).not.toHaveBeenCalled();
    expect(repositories.testRun.updateStatus).not.toHaveBeenCalled();
  });

  it('creates a new test run for every re-run without overwriting the previous run', async () => {
    const firstRun = makeTestRun({ id: 'test-run-1', name: 'Regression attempt 1' });
    const secondRun = makeTestRun({ id: 'test-run-2', name: 'Regression attempt 2' });
    repositories.testCase.findCasesForPlan.mockResolvedValue([
      { id: 'plan-case-1', testPlanId: 'test-plan-1', testCaseId: 'test-case-1', order: 0 },
    ]);
    repositories.testPlan.findById.mockResolvedValue(makeTestPlan());
    repositories.testRun.create
      .mockResolvedValueOnce(firstRun)
      .mockResolvedValueOnce(secondRun);
    repositories.testResult.seedForRun.mockResolvedValue(undefined);

    const initialExecution = await testRunService.start('test-plan-1', 'Regression attempt 1');
    const reRun = await testRunService.start('test-plan-1', 'Regression attempt 2');

    expect(initialExecution.id).toBe('test-run-1');
    expect(reRun.id).toBe('test-run-2');
    expect(repositories.testRun.create).toHaveBeenCalledTimes(2);
    expect(repositories.testResult.seedForRun).toHaveBeenNthCalledWith(1, 'test-run-1', ['test-case-1']);
    expect(repositories.testResult.seedForRun).toHaveBeenNthCalledWith(2, 'test-run-2', ['test-case-1']);
    expect(repositories.testRun.update).not.toHaveBeenCalled();
    expect(repositories.testRun.updateStatus).not.toHaveBeenCalled();
  });

  it('marks a test run completed only through the explicit complete action', async () => {
    repositories.testResult.findAllByRun.mockResolvedValue([
      makeTestResult({ id: 'result-1', status: 'pass' }),
      makeTestResult({ id: 'result-2', testCaseId: 'test-case-2', status: 'fail' }),
    ]);
    repositories.testRun.updateStatus.mockResolvedValue(
      makeTestRun({ id: 'test-run-1', status: 'completed' }),
    );

    const runDetails = await testRunService.getWithResults('test-run-1');

    expect(runDetails.summary.progressPercent).toBe(100);
    expect(repositories.testRun.updateStatus).not.toHaveBeenCalled();

    await testRunService.complete('test-run-1', 'Execution reviewed');

    expect(repositories.testRun.updateStatus).toHaveBeenCalledOnce();
    expect(repositories.testRun.updateStatus).toHaveBeenCalledWith(
      'test-run-1',
      'completed',
      'Execution reviewed',
    );
  });

  it('records a tester only when the tester exists in profiles', async () => {
    repositories.testResult.findExecutionContext.mockResolvedValue({
      resultStatus: 'not_run',
      runStatus: 'in_progress',
    });
    repositories.profile.findById.mockResolvedValue(makeProfile({ id: 'profile-tester' }));
    repositories.testResult.recordResult.mockResolvedValue(
      makeTestResult({ testerId: 'profile-tester', status: 'pass' }),
    );

    await testRunService.recordResult('test-result-1', 'profile-tester', 'pass', null);

    expect(repositories.profile.findById).toHaveBeenCalledWith('profile-tester');
    expect(repositories.testResult.recordResult).toHaveBeenCalledWith('test-result-1', {
      status: 'pass',
      testerId: 'profile-tester',
      notes: null,
    });
  });

  it('rejects an unregistered tester instead of storing free text as tester identity', async () => {
    repositories.testResult.findExecutionContext.mockResolvedValue({
      resultStatus: 'not_run',
      runStatus: 'in_progress',
    });
    repositories.profile.findById.mockResolvedValue(null);

    await expect(
      testRunService.recordResult('test-result-1', 'Nama Tester Bebas', 'fail', null),
    ).rejects.toThrow('Tester harus user yang terdaftar');

    expect(repositories.profile.findById).toHaveBeenCalledWith('Nama Tester Bebas');
    expect(repositories.testResult.recordResult).not.toHaveBeenCalled();
  });
});

describe('testRunService validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects an empty run name before reading or writing repositories', async () => {
    await expect(testRunService.start('test-plan-1', '   '))
      .rejects.toThrow('Nama test run tidak boleh kosong');
    expect(repositories.testCase.findCasesForPlan).not.toHaveBeenCalled();
    expect(repositories.testRun.create).not.toHaveBeenCalled();
  });

  it('rejects a run name longer than 255 characters', async () => {
    await expect(testRunService.start('test-plan-1', 'a'.repeat(256)))
      .rejects.toThrow('Nama test run maksimal 255 karakter');
    expect(repositories.testCase.findCasesForPlan).not.toHaveBeenCalled();
    expect(repositories.testRun.create).not.toHaveBeenCalled();
  });

  it('rejects an unknown result status before reading execution context', async () => {
    await expect(testRunService.recordResult('result-1', 'tester-1', 'unknown' as never, null))
      .rejects.toThrow('Status hasil test tidak dikenal');
    expect(repositories.testResult.findExecutionContext).not.toHaveBeenCalled();
    expect(repositories.testResult.recordResult).not.toHaveBeenCalled();
  });

  it('rejects recording a result after the run was manually completed', async () => {
    repositories.testResult.findExecutionContext.mockResolvedValue({
      resultStatus: 'not_run',
      runStatus: 'completed',
    });

    await expect(testRunService.recordResult('result-1', 'tester-1', 'pass', null))
      .rejects.toThrow('Test run sudah selesai — buka kembali (reopen) untuk mencatat hasil');
    expect(repositories.profile.findById).not.toHaveBeenCalled();
    expect(repositories.testResult.recordResult).not.toHaveBeenCalled();
  });
});
