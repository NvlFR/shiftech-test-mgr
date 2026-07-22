import { supabase } from '../config/supabaseClient';
import type { DashboardStats, IssueStatus, TestResultStatus } from '../types/domain';

async function countRows(table: string, column?: string, value?: string): Promise<number> {
  let query = supabase.from(table).select('id', { count: 'exact', head: true });
  if (column && value) query = query.eq(column, value);
  const { count, error } = await query;
  if (error) throw error;
  return count ?? 0;
}

async function countStatuses<T extends string>(table: string, column: string, statuses: readonly T[]) {
  const values = await Promise.all(statuses.map((status) => countRows(table, column, status)));
  return Object.fromEntries(statuses.map((status, index) => [status, values[index]])) as Record<T, number>;
}

export const dashboardRepository = {
  async getStats(): Promise<DashboardStats> {
    const [projects, activeProjects, testCases, activeTestCases, testPlans, activeTestPlans, testRuns, inProgressRuns, completedRuns, results, issues] =
      await Promise.all([
        countRows('projects'),
        countRows('projects', 'status', 'active'),
        countRows('test_cases'),
        countRows('test_cases', 'status', 'active'),
        countRows('test_plans'),
        countRows('test_plans', 'status', 'active'),
        countRows('test_runs'),
        countRows('test_runs', 'status', 'in_progress'),
        countRows('test_runs', 'status', 'completed'),
        countStatuses<TestResultStatus>('test_results', 'status', ['pass', 'fail', 'skip', 'blocked', 'not_run']),
        countStatuses<IssueStatus>('issues', 'status', ['open', 'in_progress', 'resolved', 'verified', 'closed']),
      ]);

    return {
      projects,
      activeProjects,
      testCases,
      activeTestCases,
      testPlans,
      activeTestPlans,
      testRuns,
      inProgressRuns,
      completedRuns,
      results,
      issues,
    };
  },
};
