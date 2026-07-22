import { supabase } from '../config/supabaseClient';
import { mapDashboardReportRunRow } from '../helpers/mappers';
import type { DashboardReportFilters, DashboardReportRun, IssueStatus, TestResultStatus } from '../types/domain';

export interface DashboardReportResultRow {
  id: string;
  testRunId: string;
  testerId: string | null;
  status: TestResultStatus;
}

export interface DashboardReportIssueRow {
  id: string;
  testResultId: string;
  status: IssueStatus;
  createdAt: string;
  updatedAt: string;
}

export const dashboardReportRepository = {
  async findRuns(filters: DashboardReportFilters = {}): Promise<DashboardReportRun[]> {
    let query = supabase
      .from('test_runs')
      .select('*, test_plan:test_plans!inner(project_id, name, project:projects!inner(id, name)), environment:environments(id, name)')
      .order('started_at', { ascending: false });
    if (filters.projectId) query = query.eq('test_plan.project_id', filters.projectId);
    if (filters.environmentId) query = query.eq('environment_id', filters.environmentId);
    if (filters.release?.trim()) query = query.ilike('release', `%${filters.release.trim()}%`);
    if (filters.dateFrom) query = query.gte('started_at', `${filters.dateFrom}T00:00:00.000Z`);
    if (filters.dateTo) query = query.lte('started_at', `${filters.dateTo}T23:59:59.999Z`);
    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []).map(mapDashboardReportRunRow);
  },

  async findResults(runIds: string[], testerId?: string | null): Promise<DashboardReportResultRow[]> {
    if (!runIds.length) return [];
    let query = supabase.from('test_results').select('id, test_run_id, tester_id, status').in('test_run_id', runIds);
    if (testerId) query = query.eq('tester_id', testerId);
    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []).map((row) => ({ id: row.id, testRunId: row.test_run_id, testerId: row.tester_id ?? null, status: row.status }));
  },

  async findIssues(resultIds: string[]): Promise<DashboardReportIssueRow[]> {
    if (!resultIds.length) return [];
    const { data, error } = await supabase.from('issues').select('id, test_result_id, status, created_at, updated_at').in('test_result_id', resultIds);
    if (error) throw error;
    return (data ?? []).map((row) => ({ id: row.id, testResultId: row.test_result_id, status: row.status, createdAt: row.created_at, updatedAt: row.updated_at }));
  },
};
