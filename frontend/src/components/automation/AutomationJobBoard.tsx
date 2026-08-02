import { useEffect, useMemo, useState } from 'react';
import { Button } from 'primereact/button';
import { Dropdown } from 'primereact/dropdown';
import { ProgressBar } from 'primereact/progressbar';
import { Tag } from 'primereact/tag';
import type { AutomationJob, AutomationJobStatus, AutomationRunner, Environment, TestPlan } from '../../types/domain';

interface Props {
  jobs: AutomationJob[];
  runners: AutomationRunner[];
  environments: Environment[];
  testPlans: TestPlan[];
  caseLabel: (id: string) => string;
  canRunAutomation: boolean;
  onCancel: (job: AutomationJob) => void;
  onRetry: (job: AutomationJob) => void;
  onOpenResult: (job: AutomationJob) => void;
  onOpenLog: (job: AutomationJob) => void;
  loading?: boolean;
}

const statusSeverity: Record<AutomationJobStatus, 'info' | 'warning' | 'success' | 'danger' | 'secondary'> = {
  queued: 'info', running: 'warning', passed: 'success', failed: 'danger', canceled: 'secondary',
};

function durationLabel(milliseconds: number) {
  const seconds = Math.max(0, Math.round(milliseconds / 1000));
  if (seconds < 60) return `${seconds} dtk`;
  return `${Math.floor(seconds / 60)} mnt ${seconds % 60} dtk`;
}

export function AutomationJobBoard(props: Props) {
  const [runnerId, setRunnerId] = useState<string | null>(null);
  const [environmentId, setEnvironmentId] = useState<string | null>(null);
  const [testPlanId, setTestPlanId] = useState<string | null>(null);
  const [status, setStatus] = useState<AutomationJobStatus | null>(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(timer);
  }, []);

  const filteredJobs = useMemo(() => props.jobs.filter((job) =>
    (!runnerId || job.runnerId === runnerId)
    && (!environmentId || job.environmentId === environmentId)
    && (!testPlanId || job.testPlanId === testPlanId)
    && (!status || job.status === status)
  ), [props.jobs, runnerId, environmentId, testPlanId, status]);

  const hasFilters = Boolean(runnerId || environmentId || testPlanId || status);

  const columns: { title: string; statuses: AutomationJobStatus[]; tone: string }[] = [
    { title: 'Queued', statuses: ['queued'], tone: 'border-blue-400' },
    { title: 'Running', statuses: ['running'], tone: 'border-yellow-400' },
    { title: 'Passed', statuses: ['passed'], tone: 'border-green-400' },
    { title: 'Failed', statuses: ['failed', 'canceled'], tone: 'border-red-400' },
  ];

  return <div>
    <div className="flex gap-2 flex-wrap mb-3">
      <Dropdown value={runnerId} options={props.runners.map((runner) => ({ label: runner.name, value: runner.id }))} onChange={(event) => setRunnerId(event.value)} showClear placeholder="Semua runner" className="w-12rem" />
      <Dropdown value={environmentId} options={props.environments.map((environment) => ({ label: environment.name, value: environment.id }))} onChange={(event) => setEnvironmentId(event.value)} showClear placeholder="Semua environment" className="w-14rem" />
      <Dropdown value={testPlanId} options={props.testPlans.map((plan) => ({ label: `${plan.code} — ${plan.name}`, value: plan.id }))} onChange={(event) => setTestPlanId(event.value)} showClear filter placeholder="Semua test plan" className="w-16rem" />
      <Dropdown value={status} options={['queued', 'running', 'passed', 'failed', 'canceled'].map((value) => ({ label: value, value }))} onChange={(event) => setStatus(event.value)} showClear placeholder="Semua status" className="w-12rem" />
    </div>
    {props.loading && !props.jobs.length && <div className="surface-ground border-round p-5 text-center" role="status">
      <i className="pi pi-clock text-primary text-3xl" aria-hidden="true" />
      <h3 className="mb-2">Memuat papan job</h3>
      <p className="text-color-secondary mt-0 mb-0">Mengambil antrean, progres, dan hasil automation terbaru.</p>
    </div>}
    {!props.loading && !props.jobs.length && <div className="surface-ground border-round p-5 text-center">
      <i className="pi pi-inbox text-primary text-3xl" aria-hidden="true" />
      <h3 className="mb-2">Belum ada job automation</h3>
      <p className="text-color-secondary mt-0 mb-0">Enqueue Test Plan untuk membuat job pertama.</p>
    </div>}
    {!props.loading && props.jobs.length > 0 && !filteredJobs.length && <div className="surface-ground border-round p-4 text-center">
      <h3 className="mt-0 mb-2">Tidak ada job yang cocok</h3>
      <p className="text-color-secondary mt-0 mb-3">Ubah atau hapus filter untuk melihat job lainnya.</p>
      {hasFilters && <Button label="Reset filter" icon="pi pi-filter-slash" outlined onClick={() => { setRunnerId(null); setEnvironmentId(null); setTestPlanId(null); setStatus(null); }} />}
    </div>}
    {!props.loading && filteredJobs.length > 0 &&
    <div className="grid">
      {columns.map((column) => {
        const columnJobs = filteredJobs.filter((job) => column.statuses.includes(job.status));
        return <section key={column.title} className="col-12 md:col-6 xl:col-3" aria-label={`Job ${column.title}`}>
          <div className={`surface-ground border-top-3 ${column.tone} border-round p-2 h-full`}>
            <div className="flex justify-content-between align-items-center mb-2"><b>{column.title}</b><Tag value={columnJobs.length} severity="secondary" /></div>
            <div className="flex flex-column gap-2">
              {columnJobs.map((job) => {
                const elapsed = job.startedAt ? now - new Date(job.startedAt).getTime() : 0;
                const progress = job.status === 'passed' ? 100 : job.status === 'failed' || job.status === 'canceled' ? 100 : job.status === 'running' && job.estimatedDurationMs ? Math.min(95, Math.round(elapsed / job.estimatedDurationMs * 100)) : 0;
                return <article key={job.id} className="surface-card border-1 surface-border border-round p-3 shadow-1">
                  <div className="flex justify-content-between gap-2 align-items-start">
                    <b className="text-sm">{props.caseLabel(job.testCaseId)}</b>
                    <Tag value={job.status} severity={statusSeverity[job.status]} />
                  </div>
                  <small className="block text-color-secondary mt-2 text-overflow-ellipsis overflow-hidden">{job.scriptRef}</small>
                  <div className="mt-3">
                    <ProgressBar value={progress} showValue={job.status !== 'queued'} style={{ height: '0.6rem' }} mode={job.status === 'running' && !job.estimatedDurationMs ? 'indeterminate' : 'determinate'} />
                    <small className="block mt-2 text-color-secondary">
                      {job.status === 'queued' ? 'Menunggu runner' : job.status === 'running' ? `${job.currentStep ?? 'Runner sedang menjalankan job'} · ${durationLabel(elapsed)}${job.estimatedDurationMs ? ` / estimasi ${durationLabel(job.estimatedDurationMs)}` : ''}` : `Selesai dalam ${job.startedAt && job.finishedAt ? durationLabel(new Date(job.finishedAt).getTime() - new Date(job.startedAt).getTime()) : '-'}`}
                    </small>
                  </div>
                  <small className="block mt-2">Runner: {props.runners.find((runner) => runner.id === job.runnerId)?.name ?? '-'}</small>
                  <div className="flex gap-1 mt-2 flex-wrap">
                    <Button text size="small" icon="pi pi-file" tooltip="Buka live log" aria-label="Buka live log" onClick={() => props.onOpenLog(job)} />
                    {job.status === 'queued' && props.canRunAutomation && <Button text size="small" severity="danger" icon="pi pi-times" label="Batalkan" onClick={() => props.onCancel(job)} />}
                    {job.status === 'failed' && props.canRunAutomation && <Button text size="small" icon="pi pi-refresh" label="Ulangi" disabled={!job.testResultId} onClick={() => props.onRetry(job)} />}
                    {job.testResultId && <Button text size="small" icon="pi pi-external-link" label="Test Result" onClick={() => props.onOpenResult(job)} />}
                  </div>
                </article>;
              })}
              {!columnJobs.length && <small className="text-color-secondary text-center p-3">Tidak ada job</small>}
            </div>
          </div>
        </section>;
      })}
    </div>}
  </div>;
}
