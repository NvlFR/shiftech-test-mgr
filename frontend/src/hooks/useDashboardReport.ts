import { useCallback, useEffect, useState } from 'react';
import { dashboardReportService } from '../services/dashboardReportService';
import type { DashboardReport, DashboardReportFilters } from '../types/domain';

export function useDashboardReport(filters: DashboardReportFilters) {
  const [report, setReport] = useState<DashboardReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try { setReport(await dashboardReportService.getReport(filters)); }
    catch (err) { setError(err instanceof Error ? err.message : 'Gagal memuat laporan dashboard'); }
    finally { setLoading(false); }
  }, [filters]);
  useEffect(() => { void reload(); }, [reload]);
  return { report, loading, error, reload };
}
