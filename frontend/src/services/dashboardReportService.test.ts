import { beforeEach, describe, expect, it, vi } from 'vitest';

const repository = vi.hoisted(() => ({
  findRuns: vi.fn(),
  findResults: vi.fn(),
  findIssues: vi.fn(),
  findQaLoopAudits: vi.fn(),
}));

vi.mock('../repositories/dashboardReportRepository', () => ({ dashboardReportRepository: repository }));

import { dashboardReportService } from './dashboardReportService';

const run = {
  id: 'run-1', code: 'TR-1', name: 'Regression', projectId: 'project-1', projectName: 'Project',
  testPlanName: 'Custom regression', environmentName: null, release: null, status: 'completed' as const,
  startedAt: '2026-08-01T10:00:00Z', completedAt: '2026-08-01T11:00:00Z', total: 0,
  executed: 0, pass: 0, fail: 0, skip: 0, blocked: 0, notRun: 0, passRate: 0, failRate: 0, progressPercent: 0,
};

describe('dashboardReportService QA loop', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    repository.findRuns.mockResolvedValue([run]);
    repository.findResults.mockResolvedValue([{ id: 'result-1', testRunId: 'run-1', testerId: null, status: 'pass' }]);
    repository.findIssues.mockResolvedValue([]);
  });

  it('menghitung Issue unik yang masuk loop, verified, dan reopen rate terhadap Issue masuk loop', async () => {
    repository.findQaLoopAudits.mockResolvedValue([
      { issueId: 'issue-1', testRunId: 'run-1', action: 'entered', createdAt: '2026-08-01T10:00:00Z' },
      { issueId: 'issue-1', testRunId: 'run-1', action: 'reopened', createdAt: '2026-08-01T11:00:00Z' },
      { issueId: 'issue-1', testRunId: 'run-1', action: 'reopened', createdAt: '2026-08-01T12:00:00Z' },
      { issueId: 'issue-2', testRunId: 'run-1', action: 'entered', createdAt: '2026-08-01T10:00:00Z' },
      { issueId: 'issue-2', testRunId: 'run-1', action: 'verified', createdAt: '2026-08-01T12:00:00Z' },
      { issueId: 'issue-outside', testRunId: 'run-2', action: 'reopened', createdAt: '2026-08-01T12:00:00Z' },
    ]);

    const report = await dashboardReportService.getReport({ projectId: 'project-1' });

    expect(report.qaLoop).toEqual({ entered: 2, verified: 1, reopened: 1, reopenRate: 50 });
  });

  it('menghasilkan reopen rate nol ketika belum ada Issue masuk loop', async () => {
    repository.findQaLoopAudits.mockResolvedValue([]);
    const report = await dashboardReportService.getReport();
    expect(report.qaLoop).toEqual({ entered: 0, verified: 0, reopened: 0, reopenRate: 0 });
  });
});
