import { useState } from 'react';
import { Button } from 'primereact/button';
import { Card } from 'primereact/card';
import { Message } from 'primereact/message';
import { ProgressSpinner } from 'primereact/progressspinner';
import { Tag } from 'primereact/tag';
import { useDashboard } from '../../hooks/useDashboard';
import { useProjectContext } from '../../hooks/useProjectContext';
import { testRunService } from '../../services/testRunService';
import { formatDateTime } from '../../helpers/dateFormatter';
import { exportTestRunsToExcel, exportTestRunsToPdf, type TestRunExportRow } from '../../helpers/testRunExporter';

function StatCard({ icon, label, value, detail }: { icon: string; label: string; value: number; detail: string }) {
  return (
    <Card className="h-full">
      <div className="flex align-items-start justify-content-between gap-3">
        <div>
          <span className="block text-color-secondary text-sm mb-2">{label}</span>
          <span className="block text-3xl font-bold">{value}</span>
          <span className="block text-color-secondary text-sm mt-2">{detail}</span>
        </div>
        <i className={`${icon} text-primary text-2xl`} />
      </div>
    </Card>
  );
}

function downloadCsv(stats: NonNullable<ReturnType<typeof useDashboard>['stats']>) {
  const rows = [
    ['Metric', 'Value'],
    ['Total Projects', stats.projects],
    ['Active Projects', stats.activeProjects],
    ['Total Test Cases', stats.testCases],
    ['Active Test Cases', stats.activeTestCases],
    ['Total Test Plans', stats.testPlans],
    ['Active Test Plans', stats.activeTestPlans],
    ['Total Test Runs', stats.testRuns],
    ['Runs In Progress', stats.inProgressRuns],
    ['Runs Completed', stats.completedRuns],
    ['Results Pass', stats.results.pass],
    ['Results Fail', stats.results.fail],
    ['Results Skip', stats.results.skip],
    ['Results Blocked', stats.results.blocked],
    ['Results Not Run', stats.results.not_run],
    ['Issues Open', stats.issues.open],
    ['Issues In Progress', stats.issues.in_progress],
    ['Issues Resolved', stats.issues.resolved],
    ['Issues Verified', stats.issues.verified],
    ['Issues Closed', stats.issues.closed],
  ];
  const csv = rows.map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(',')).join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `testmanager-dashboard-${new Date().toISOString().slice(0, 10)}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function HomePage() {
  const { stats, loading, error, reload } = useDashboard();
  const { activeProject } = useProjectContext();
  const [exportingRuns, setExportingRuns] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  async function exportRuns(format: 'excel' | 'pdf') {
    if (!activeProject) return;
    setExportingRuns(true);
    setExportError(null);
    try {
      const runs = await testRunService.listByProjectWithSummary(activeProject.id);
      const rows: TestRunExportRow[] = runs.map((run) => ({
        code: run.code,
        name: run.name,
        testPlanName: run.testPlanName,
        status: run.status,
        total: run.total,
        pass: run.pass,
        fail: run.fail,
        skip: run.skip,
        blocked: run.blocked,
        notRun: run.notRun,
        startedAt: formatDateTime(run.startedAt),
        completedAt: run.completedAt ? formatDateTime(run.completedAt) : '-',
      }));
      if (format === 'excel') exportTestRunsToExcel(activeProject, rows);
      else exportTestRunsToPdf(activeProject, rows);
    } catch (err) {
      setExportError(err instanceof Error ? err.message : 'Gagal export laporan Test Run');
    } finally {
      setExportingRuns(false);
    }
  }

  if (loading && !stats) {
    return <ProgressSpinner />;
  }

  if (error && !stats) {
    return <Message severity="error" text={error} />;
  }

  if (!stats) return null;

  return (
    <div className="flex flex-column gap-4">
      <div className="flex justify-content-between align-items-center gap-3 flex-wrap">
        <div>
          <h1 className="mt-0 mb-2">Dashboard QA</h1>
          <p className="text-color-secondary m-0">Ringkasan aktivitas testing seluruh project.</p>
        </div>
        <div className="flex gap-2">
          <Button label="Refresh" icon="pi pi-refresh" outlined onClick={() => void reload()} loading={loading} />
          <Button label="Export CSV" icon="pi pi-download" onClick={() => downloadCsv(stats)} />
        </div>
      </div>

      {error && <Message severity="warn" text={error} />}
      {exportError && <Message severity="error" text={exportError} />}

      <div className="grid">
        <div className="col-12 md:col-6 xl:col-3"><StatCard icon="pi pi-folder" label="Projects" value={stats.projects} detail={`${stats.activeProjects} project aktif`} /></div>
        <div className="col-12 md:col-6 xl:col-3"><StatCard icon="pi pi-list" label="Test Cases" value={stats.testCases} detail={`${stats.activeTestCases} case aktif`} /></div>
        <div className="col-12 md:col-6 xl:col-3"><StatCard icon="pi pi-calendar" label="Test Plans" value={stats.testPlans} detail={`${stats.activeTestPlans} plan aktif`} /></div>
        <div className="col-12 md:col-6 xl:col-3"><StatCard icon="pi pi-play" label="Test Runs" value={stats.testRuns} detail={`${stats.inProgressRuns} run sedang berjalan`} /></div>
      </div>

      <div className="grid">
        <div className="col-12 xl:col-6">
          <Card title="Hasil Testing">
            <div className="flex flex-wrap gap-2">
              <Tag value={`PASS ${stats.results.pass}`} severity="success" />
              <Tag value={`FAIL ${stats.results.fail}`} severity="danger" />
              <Tag value={`SKIP ${stats.results.skip}`} severity="warning" />
              <Tag value={`BLOCKED ${stats.results.blocked}`} severity="warning" />
              <Tag value={`BELUM DITES ${stats.results.not_run}`} />
            </div>
          </Card>
        </div>
        <div className="col-12 xl:col-6">
          <Card title="Issue">
            <div className="flex flex-wrap gap-2">
              <Tag value={`OPEN ${stats.issues.open}`} severity="danger" />
              <Tag value={`IN PROGRESS ${stats.issues.in_progress}`} severity="warning" />
              <Tag value={`RESOLVED ${stats.issues.resolved}`} severity="success" />
              <Tag value={`VERIFIED ${stats.issues.verified}`} severity="info" />
              <Tag value={`CLOSED ${stats.issues.closed}`} />
            </div>
          </Card>
        </div>
      </div>

      <Card title="Export Laporan Test Run">
        <div className="flex align-items-center justify-content-between gap-3 flex-wrap">
          <span className="text-color-secondary">
            {activeProject ? `Project aktif: ${activeProject.name}` : 'Pilih project aktif dari topbar terlebih dahulu.'}
          </span>
          <div className="flex gap-2">
            <Button label="Export Excel" icon="pi pi-file-excel" outlined onClick={() => void exportRuns('excel')} disabled={!activeProject} loading={exportingRuns} />
            <Button label="Export PDF" icon="pi pi-file-pdf" outlined onClick={() => void exportRuns('pdf')} disabled={!activeProject} loading={exportingRuns} />
          </div>
        </div>
      </Card>
    </div>
  );
}
