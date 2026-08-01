import { supabase } from '../config/supabaseClient';
import { mapDashboardQaLoopAuditRow, mapDashboardReportRunRow } from '../helpers/mappers';
import { fetchAllRows } from './paginate';
import type { DashboardQaLoopAudit, DashboardReportFilters, DashboardReportRun, IssueStatus, TestResultStatus } from '../types/domain';

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
    const rows = await fetchAllRows<any>((from, to) => {
      let query = supabase
        .from('test_runs')
        .select('*, test_plan:test_plans(project_id, name, project:projects(id, name)), custom_project:projects!custom_project_id(id, name), environment:environments(id, name)')
        .order('started_at', { ascending: false });
      if (filters.environmentId) query = query.eq('environment_id', filters.environmentId);
      if (filters.release?.trim()) query = query.ilike('release', `%${filters.release.trim()}%`);
      if (filters.dateFrom) query = query.gte('started_at', `${filters.dateFrom}T00:00:00.000Z`);
      if (filters.dateTo) query = query.lte('started_at', `${filters.dateTo}T23:59:59.999Z`);
      return query.range(from, to);
    });
    return rows.map(mapDashboardReportRunRow);
  },

  async findResults(runIds: string[], testerId?: string | null): Promise<DashboardReportResultRow[]> {
    if (!runIds.length) return [];
    const rows = await fetchAllRows<any>((from, to) => {
      let query = supabase.from('test_results').select('id, test_run_id, tester_id, status').in('test_run_id', runIds);
      if (testerId) query = query.eq('tester_id', testerId);
      return query.range(from, to);
    });
    return rows.map((row) => ({ id: row.id, testRunId: row.test_run_id, testerId: row.tester_id ?? null, status: row.status }));
  },

  async findIssues(resultIds: string[]): Promise<DashboardReportIssueRow[]> {
    if (!resultIds.length) return [];
    const rows = await fetchAllRows<any>((from, to) =>
      supabase.from('issues').select('id, test_result_id, status, created_at, updated_at').in('test_result_id', resultIds).range(from, to),
    );
    return rows.map((row) => ({ id: row.id, testResultId: row.test_result_id, status: row.status, createdAt: row.created_at, updatedAt: row.updated_at }));
  },

  async findQaLoopAudits(filters: DashboardReportFilters = {}): Promise<DashboardQaLoopAudit[]> {
    const rows = await fetchAllRows<any>((from, to) => {
      let query = supabase
        .from('audit_logs')
        .select('table_name, record_id, new_data, created_at')
        .in('table_name', ['mcp.automation.rerun_failed', 'mcp.automation.verify_regression'])
        .order('created_at', { ascending: false });
      if (filters.projectId) query = query.eq('project_id', filters.projectId);
      if (filters.dateFrom) query = query.gte('created_at', `${filters.dateFrom}T00:00:00.000Z`);
      if (filters.dateTo) query = query.lte('created_at', `${filters.dateTo}T23:59:59.999Z`);
      return query.range(from, to);
    });
    return rows.map(mapDashboardQaLoopAuditRow);
  },
};
