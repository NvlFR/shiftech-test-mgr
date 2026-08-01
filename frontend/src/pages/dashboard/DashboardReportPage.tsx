import { useMemo, useState } from 'react';
import { Button } from 'primereact/button';
import { Card } from 'primereact/card';
import { Column } from 'primereact/column';
import { DataTable } from 'primereact/datatable';
import { Dropdown } from 'primereact/dropdown';
import { InputText } from 'primereact/inputtext';
import { Message } from 'primereact/message';
import { ProgressBar } from 'primereact/progressbar';
import { Tag } from 'primereact/tag';
import { PageHeader } from '../../components/ui/PageHeader';
import { useDashboardReport } from '../../hooks/useDashboardReport';
import { useEnvironments } from '../../hooks/useEnvironments';
import { useProfiles } from '../../hooks/useProfiles';
import { useProjects } from '../../hooks/useProjects';
import { exportDashboardReportToExcel, exportDashboardReportToPdf } from '../../helpers/dashboardReportExporter';
import type { DashboardReportFilters, DashboardReportRun } from '../../types/domain';

const ALL = { label: 'Semua', value: null };

export function DashboardReportPage() {
  const { projects } = useProjects({ status: 'active', sortField: 'name', sortDirection: 'asc' });
  const { profiles } = useProfiles();
  const [projectId, setProjectId] = useState<string | null>(null);
  const [environmentId, setEnvironmentId] = useState<string | null>(null);
  const [release, setRelease] = useState('');
  const [testerId, setTesterId] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const filters = useMemo<DashboardReportFilters>(() => ({ projectId, environmentId, release: release || null, testerId, dateFrom: dateFrom || null, dateTo: dateTo || null }), [projectId, environmentId, release, testerId, dateFrom, dateTo]);
  const { environments } = useEnvironments(projectId);
  const { report, loading, error, reload } = useDashboardReport(filters);

  function changeProject(value: string | null) { setProjectId(value); setEnvironmentId(null); }
  const projectOptions = [ALL, ...projects.map((project) => ({ label: project.name, value: project.id }))];
  const environmentOptions = [ALL, ...environments.map((environment) => ({ label: environment.name, value: environment.id }))];
  const testerOptions = [ALL, ...profiles.map((profile) => ({ label: profile.fullName || profile.email, value: profile.id }))];
  const statusBody = (row: DashboardReportRun) => <Tag value={row.status === 'completed' ? 'Selesai' : 'Berjalan'} severity={row.status === 'completed' ? 'success' : 'warning'} />;
  const progressBody = (row: DashboardReportRun) => <div className="flex align-items-center gap-2"><ProgressBar value={row.progressPercent} showValue={false} style={{ width: '7rem', height: '0.65rem' }} /><span>{row.progressPercent}%</span></div>;

  return <div>
    <PageHeader title="Dashboard Trend & Reporting" actions={<div className="flex gap-2"><Button label="Refresh" icon="pi pi-refresh" outlined onClick={() => void reload()} loading={loading} /><Button label="Excel" icon="pi pi-file-excel" outlined disabled={!report} onClick={() => report && exportDashboardReportToExcel(report)} /><Button label="PDF" icon="pi pi-file-pdf" outlined disabled={!report} onClick={() => report && exportDashboardReportToPdf(report)} /></div>} />
    <Card className="mb-3">
      <div className="grid formgrid">
        <div className="field col-12 md:col-4 lg:col-2"><label htmlFor="report-project">Project</label><Dropdown id="report-project" className="w-full" value={projectId} options={projectOptions} onChange={(event) => changeProject(event.value)} /></div>
        <div className="field col-12 md:col-4 lg:col-2"><label htmlFor="report-release">Release</label><InputText id="report-release" className="w-full" value={release} onChange={(event) => setRelease(event.target.value)} placeholder="Semua release" /></div>
        <div className="field col-12 md:col-4 lg:col-2"><label htmlFor="report-environment">Environment</label><Dropdown id="report-environment" className="w-full" value={environmentId} options={environmentOptions} onChange={(event) => setEnvironmentId(event.value)} disabled={!projectId} /></div>
        <div className="field col-12 md:col-4 lg:col-2"><label htmlFor="report-tester">Tester</label><Dropdown id="report-tester" className="w-full" value={testerId} options={testerOptions} onChange={(event) => setTesterId(event.value)} /></div>
        <div className="field col-12 md:col-4 lg:col-2"><label htmlFor="report-from">Dari tanggal</label><InputText id="report-from" type="date" className="w-full" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} /></div>
        <div className="field col-12 md:col-4 lg:col-2"><label htmlFor="report-to">Sampai tanggal</label><InputText id="report-to" type="date" className="w-full" value={dateTo} onChange={(event) => setDateTo(event.target.value)} /></div>
      </div>
    </Card>
    {error && <Message severity="error" text={error} className="mb-3" />}
    {report && <>
      <div className="grid">
        <div className="col-12 md:col-6 xl:col-3"><Card><span className="text-color-secondary">Pass rate</span><div className="text-3xl font-bold text-green-500 mt-2">{report.totals.passRate}%</div><small>{report.totals.pass} dari {report.totals.executed} hasil dieksekusi</small></Card></div>
        <div className="col-12 md:col-6 xl:col-3"><Card><span className="text-color-secondary">Fail rate</span><div className="text-3xl font-bold text-red-500 mt-2">{report.totals.failRate}%</div><small>{report.totals.fail} hasil gagal</small></Card></div>
        <div className="col-12 md:col-6 xl:col-3"><Card><span className="text-color-secondary">Execution progress</span><div className="text-3xl font-bold mt-2">{report.totals.progressPercent}%</div><small>{report.totals.executed} dari {report.totals.totalResults} hasil</small></Card></div>
        <div className="col-12 md:col-6 xl:col-3"><Card><span className="text-color-secondary">Issue aging aktif</span><div className="text-3xl font-bold mt-2">{report.issueAging.averageDays} hari</div><small>{report.issueAging.open + report.issueAging.inProgress} issue aktif; terlama {report.issueAging.oldestDays} hari</small></Card></div>
      </div>
      <Card title="Siklus QA loop" className="mb-3">
        <div className="grid">
          <div className="col-12 md:col-4"><span className="text-color-secondary">Issue masuk loop</span><div className="text-3xl font-bold mt-2">{report.qaLoop.entered}</div><small>Issue unik yang masuk regression selektif</small></div>
          <div className="col-12 md:col-4"><span className="text-color-secondary">Verified</span><div className="text-3xl font-bold text-green-500 mt-2">{report.qaLoop.verified}</div><small>Issue unik yang lolos verifikasi regression</small></div>
          <div className="col-12 md:col-4"><span className="text-color-secondary">Reopen rate</span><div className="text-3xl font-bold text-orange-500 mt-2">{report.qaLoop.reopenRate}%</div><small>{report.qaLoop.reopened} Issue unik kembali dibuka</small></div>
        </div>
      </Card>
      <Card title="Perbandingan antar Test Run" className="mb-3"><DataTable value={report.runs} loading={loading} paginator rows={10} emptyMessage="Tidak ada data sesuai filter" responsiveLayout="scroll"><Column field="projectName" header="Project" /><Column field="testPlanName" header="Test Plan" /><Column field="code" header="Kode" /><Column field="name" header="Run" /><Column field="environmentName" header="Environment" body={(row: DashboardReportRun) => row.environmentName ?? '-'} /><Column field="release" header="Release" body={(row: DashboardReportRun) => row.release ?? '-'} /><Column header="Status" body={statusBody} /><Column field="total" header="Total" /><Column field="pass" header="PASS" /><Column field="fail" header="FAIL" /><Column header="Progress" body={progressBody} /><Column field="passRate" header="Pass rate" body={(row: DashboardReportRun) => `${row.passRate}%`} /><Column field="failRate" header="Fail rate" body={(row: DashboardReportRun) => `${row.failRate}%`} /></DataTable></Card>
      <Card title="Issue aging"><div className="flex flex-wrap gap-2"><Tag value={`OPEN ${report.issueAging.open}`} severity="danger" /><Tag value={`IN PROGRESS ${report.issueAging.inProgress}`} severity="warning" /><Tag value={`RESOLVED/VERIFIED ${report.issueAging.resolved}`} severity="success" /><Tag value={`CLOSED ${report.issueAging.closed}`} /></div></Card>
    </>}
  </div>;
}
