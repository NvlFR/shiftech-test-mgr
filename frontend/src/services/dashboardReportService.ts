import { dashboardReportRepository } from '../repositories/dashboardReportRepository';
import type { DashboardIssueAging, DashboardReport, DashboardReportFilters, DashboardReportRun, TestResultStatus } from '../types/domain';

const RESULT_STATUSES: TestResultStatus[] = ['pass', 'fail', 'skip', 'blocked', 'not_run'];
const ACTIVE_ISSUE_STATUSES = new Set(['open', 'in_progress']);

function percent(value: number, denominator: number) {
  return denominator === 0 ? 0 : Math.round((value / denominator) * 100);
}

function withSummary(run: DashboardReportRun, statuses: TestResultStatus[]): DashboardReportRun {
  const counts = Object.fromEntries(RESULT_STATUSES.map((status) => [status, statuses.filter((value) => value === status).length])) as Record<TestResultStatus, number>;
  const executed = counts.pass + counts.fail + counts.skip + counts.blocked;
  return {
    ...run,
    total: statuses.length,
    executed,
    pass: counts.pass,
    fail: counts.fail,
    skip: counts.skip,
    blocked: counts.blocked,
    notRun: counts.not_run,
    passRate: percent(counts.pass, executed),
    failRate: percent(counts.fail, executed),
    progressPercent: percent(executed, statuses.length),
  };
}

function calculateIssueAging(issues: Awaited<ReturnType<typeof dashboardReportRepository.findIssues>>): DashboardIssueAging {
  const now = Date.now();
  const ages = issues.map((issue) => Math.max(0, Math.floor((now - new Date(issue.createdAt).getTime()) / 86_400_000)));
  const activeAges = issues.filter((issue) => ACTIVE_ISSUE_STATUSES.has(issue.status)).map((issue) => Math.max(0, Math.floor((now - new Date(issue.createdAt).getTime()) / 86_400_000)));
  const statusCount = (status: string) => issues.filter((issue) => issue.status === status).length;
  return {
    total: issues.length,
    open: statusCount('open'),
    inProgress: statusCount('in_progress'),
    resolved: statusCount('resolved') + statusCount('verified'),
    closed: statusCount('closed'),
    averageDays: activeAges.length ? Math.round(activeAges.reduce((sum, age) => sum + age, 0) / activeAges.length) : 0,
    oldestDays: ages.length ? Math.max(...ages) : 0,
  };
}

export const dashboardReportService = {
  async getReport(filters: DashboardReportFilters = {}): Promise<DashboardReport> {
    const runs = await dashboardReportRepository.findRuns(filters);
    const runIds = runs.map((run) => run.id);
    const results = await dashboardReportRepository.findResults(runIds, filters.testerId);
    const issues = await dashboardReportRepository.findIssues(results.map((result) => result.id));
    const summarizedRuns = runs
      .map((run) => withSummary(run, results.filter((result) => result.testRunId === run.id).map((result) => result.status)))
      .filter((run) => !filters.testerId || run.total > 0);
    const totals = summarizedRuns.reduce((sum, run) => ({
      totalRuns: sum.totalRuns + 1,
      totalResults: sum.totalResults + run.total,
      executed: sum.executed + run.executed,
      pass: sum.pass + run.pass,
      fail: sum.fail + run.fail,
      skip: sum.skip + run.skip,
      blocked: sum.blocked + run.blocked,
      notRun: sum.notRun + run.notRun,
      passRate: 0,
      failRate: 0,
      progressPercent: 0,
    }), { totalRuns: 0, totalResults: 0, executed: 0, pass: 0, fail: 0, skip: 0, blocked: 0, notRun: 0, passRate: 0, failRate: 0, progressPercent: 0 });
    totals.passRate = percent(totals.pass, totals.executed);
    totals.failRate = percent(totals.fail, totals.executed);
    totals.progressPercent = percent(totals.executed, totals.totalResults);
    return { generatedAt: new Date().toISOString(), filters, runs: summarizedRuns, totals, issueAging: calculateIssueAging(issues) };
  },
};
