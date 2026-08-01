import { useEffect, useRef, useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { Button } from 'primereact/button';
import { Card } from 'primereact/card';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Dialog } from 'primereact/dialog';
import { Dropdown } from 'primereact/dropdown';
import { InputText } from 'primereact/inputtext';
import { InputNumber } from 'primereact/inputnumber';
import { Chips } from 'primereact/chips';
import { TabView, TabPanel } from 'primereact/tabview';
import { Tag } from 'primereact/tag';
import { Message } from 'primereact/message';
import { Toast } from 'primereact/toast';
import { PageHeader } from '../../components/ui/PageHeader';
import { useAutomation } from '../../hooks/useAutomation';
import { useTestPlans } from '../../hooks/useTestPlans';
import { useEnvironments } from '../../hooks/useEnvironments';
import { useProjectRole } from '../../hooks/useProjectRole';
import { useAuthContext } from '../../hooks/useAuth';
import { automationService } from '../../services/automationService';
import { testCaseService } from '../../services/testCaseService';
import type { AutomationBrowser, AutomationJob, AutomationJobStatus, AutomationRunner, AutomationRunnerSecret, AutomationScript, TestCase } from '../../types/domain';

const jobSeverity: Record<AutomationJobStatus, 'info' | 'warning' | 'success' | 'danger' | 'secondary'> = {
  queued: 'info', running: 'warning', passed: 'success', failed: 'danger', canceled: 'secondary',
};

function runnerOnline(runner: AutomationRunner): boolean {
  if (!runner.active || !runner.lastSeenAt) return false;
  return Date.now() - new Date(runner.lastSeenAt).getTime() < 60_000;
}

export function AutomationPage() {
  const { id: projectId } = useParams<{ id: string }>();
  const toast = useRef<Toast>(null);
  const { session } = useAuthContext();
  const { canEditContent, canManageSettings, loading: roleLoading } = useProjectRole(projectId);
  const { runners, scripts, jobs, loading, error, reload } = useAutomation(projectId ?? null);
  const { testPlans } = useTestPlans(projectId ?? null);
  const { environments } = useEnvironments(projectId ?? null);
  const [testCases, setTestCases] = useState<TestCase[]>([]);

  const [runnerDialog, setRunnerDialog] = useState(false);
  const [runnerName, setRunnerName] = useState('');
  const [runnerLabels, setRunnerLabels] = useState<string[]>([]);
  const [secret, setSecret] = useState<AutomationRunnerSecret | null>(null);

  const [scriptCaseId, setScriptCaseId] = useState<string | null>(null);
  const [scriptRef, setScriptRef] = useState('');
  const [scriptLabels, setScriptLabels] = useState<string[]>([]);

  const [enqueueDialog, setEnqueueDialog] = useState(false);
  const [enqueuePlanId, setEnqueuePlanId] = useState<string | null>(null);
  const [enqueueName, setEnqueueName] = useState('');
  const [enqueueEnvId, setEnqueueEnvId] = useState<string | null>(null);
  const [enqueueMaxAttempts, setEnqueueMaxAttempts] = useState(1);
  const [enqueueBrowser, setEnqueueBrowser] = useState<AutomationBrowser>('chromium');
  const [enqueueDeviceProfile, setEnqueueDeviceProfile] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId) { setTestCases([]); return; }
    void testCaseService.listByProject(projectId).then(setTestCases).catch(() => setTestCases([]));
  }, [projectId]);

  if (roleLoading) return <p>Memuat...</p>;
  if (!canEditContent) return <Navigate to={`/projects/${projectId}`} replace />;

  const caseLabel = (id: string) => { const tc = testCases.find((c) => c.id === id); return tc ? `${tc.code} — ${tc.title}` : id; };

  async function createRunner() {
    if (!projectId) return;
    try {
      const created = await automationService.createRunner({ projectId, name: runnerName, labels: runnerLabels });
      setSecret(created); setRunnerDialog(false); setRunnerName(''); setRunnerLabels([]); await reload();
      toast.current?.show({ severity: 'success', summary: 'Runner dibuat' });
    } catch (err) { toast.current?.show({ severity: 'error', summary: err instanceof Error ? err.message : 'Gagal membuat runner' }); }
  }
  async function rotate(row: AutomationRunner) {
    try { setSecret(await automationService.rotateRunnerToken(row.id)); await reload(); }
    catch (err) { toast.current?.show({ severity: 'error', summary: err instanceof Error ? err.message : 'Gagal rotate token' }); }
  }
  async function toggleRunner(row: AutomationRunner) {
    try { await automationService.setRunnerActive(row.id, !row.active); await reload(); }
    catch (err) { toast.current?.show({ severity: 'error', summary: err instanceof Error ? err.message : 'Gagal mengubah status' }); }
  }
  async function createScript() {
    if (!projectId || !scriptCaseId || !session?.user) return;
    try {
      await automationService.createScript({ projectId, testCaseId: scriptCaseId, scriptRef, runnerLabels: scriptLabels, createdBy: session.user.id });
      setScriptCaseId(null); setScriptRef(''); setScriptLabels([]); await reload();
      toast.current?.show({ severity: 'success', summary: 'Script dipetakan' });
    } catch (err) { toast.current?.show({ severity: 'error', summary: err instanceof Error ? err.message : 'Gagal memetakan script' }); }
  }
  async function deleteScript(row: AutomationScript) {
    try { await automationService.deleteScript(row.id); await reload(); }
    catch (err) { toast.current?.show({ severity: 'error', summary: err instanceof Error ? err.message : 'Gagal menghapus script' }); }
  }
  async function enqueue() {
    if (!projectId || !enqueuePlanId) return;
    try {
      const res = await automationService.enqueue({ projectId, testPlanId: enqueuePlanId, name: enqueueName, environmentId: enqueueEnvId, maxAttempts: enqueueMaxAttempts, browser: enqueueBrowser, deviceProfile: enqueueDeviceProfile });
      setEnqueueDialog(false); setEnqueuePlanId(null); setEnqueueName(''); setEnqueueEnvId(null); setEnqueueMaxAttempts(1); setEnqueueBrowser('chromium'); setEnqueueDeviceProfile(null); await reload();
      toast.current?.show({ severity: 'success', summary: `Test Run ${res.runCode} dibuat`, detail: `${res.jobCount} job automation di-antrekan` });
    } catch (err) { toast.current?.show({ severity: 'error', summary: err instanceof Error ? err.message : 'Gagal enqueue automation' }); }
  }
  async function cancelJob(row: AutomationJob) {
    try { await automationService.cancelJob(row.id); await reload(); }
    catch (err) { toast.current?.show({ severity: 'error', summary: err instanceof Error ? err.message : 'Gagal cancel job' }); }
  }
  async function openArtifact(a: AutomationJob['artifacts'][number]) {
    // Uploaded artifacts are private in Storage: mint a signed URL on click.
    if (a.path && a.bucket) {
      try {
        const url = await automationService.getArtifactSignedUrl(a.bucket, a.path);
        window.open(url, '_blank', 'noopener');
      } catch (err) { toast.current?.show({ severity: 'error', summary: err instanceof Error ? err.message : 'Gagal membuka artifact' }); }
    } else if (/^https?:\/\//.test(a.url)) {
      window.open(a.url, '_blank', 'noopener');
    } else {
      toast.current?.show({ severity: 'info', summary: 'Artifact tersimpan lokal di runner', detail: a.url });
    }
  }

  const unmappedCases = testCases.filter((c) => !scripts.some((s) => s.testCaseId === c.id));

  return <div>
    <Toast ref={toast} />
    <PageHeader title="Automation (Playwright)" actions={<div className="flex gap-2 flex-wrap">
      <Button label="Refresh" icon="pi pi-refresh" outlined onClick={() => void reload()} loading={loading} />
      <Button label="Enqueue Automation" icon="pi pi-play" onClick={() => setEnqueueDialog(true)} />
      {canManageSettings && <Button label="Runner Baru" icon="pi pi-plus" outlined onClick={() => setRunnerDialog(true)} />}
    </div>} />
    <Card className="mb-3">
      <p className="mt-0">Playwright dijalankan oleh <b>Local Runner</b> di mesin lokal/on-prem yang bisa mengakses aplikasi under test, <b>bukan</b> di server pusat. Runner konek keluar memakai token, menarik job dari antrean, lalu melaporkan hasil + artifact.</p>
      <p className="mb-0 text-color-secondary">Enqueue membuat Test Run baru dan mengisi <code>test_results</code>; Run tetap <code>in_progress</code> sampai diselesaikan manual.</p>
    </Card>
    {error && <Message severity="error" text={error} className="mb-3" />}

    <Card><TabView>
      <TabPanel header={`Runner (${runners.length})`}>
        <DataTable value={runners} loading={loading} size="small" emptyMessage="Belum ada runner">
          <Column field="name" header="Nama" />
          <Column header="Labels" body={(r: AutomationRunner) => r.labels.length ? r.labels.map((l) => <Tag key={l} value={l} className="mr-1" />) : <span className="text-color-secondary">-</span>} />
          <Column field="tokenPrefix" header="Token" />
          <Column header="Koneksi" body={(r: AutomationRunner) => <Tag value={runnerOnline(r) ? 'Online' : 'Offline'} severity={runnerOnline(r) ? 'success' : 'secondary'} />} />
          <Column header="Status" body={(r: AutomationRunner) => <Tag value={r.active ? 'Aktif' : 'Nonaktif'} severity={r.active ? 'success' : 'secondary'} />} />
          {canManageSettings && <Column header="Aksi" body={(r: AutomationRunner) => <div className="flex gap-2">
            <Button text size="small" icon="pi pi-refresh" tooltip="Regenerate token" onClick={() => rotate(r)} />
            <Button text size="small" icon={r.active ? 'pi pi-ban' : 'pi pi-check'} tooltip={r.active ? 'Nonaktifkan' : 'Aktifkan'} onClick={() => toggleRunner(r)} />
          </div>} />}
        </DataTable>
      </TabPanel>

      <TabPanel header={`Mapping Script (${scripts.length})`}>
        <div className="flex gap-2 mb-3 flex-wrap align-items-end">
          <Dropdown value={scriptCaseId} options={unmappedCases.map((c) => ({ label: `${c.code} — ${c.title}`, value: c.id }))} onChange={(e) => setScriptCaseId(e.value)} placeholder="Test Case" filter className="w-20rem" />
          <InputText value={scriptRef} onChange={(e) => setScriptRef(e.target.value)} placeholder="Referensi script, mis. tests/login.sp.ts" className="flex-1" />
          <Chips value={scriptLabels} onChange={(e) => setScriptLabels(e.value ?? [])} placeholder="Label runner (opsional)" />
          <Button label="Petakan" icon="pi pi-link" onClick={createScript} disabled={!scriptCaseId || !scriptRef.trim()} />
        </div>
        <DataTable value={scripts} loading={loading} size="small" emptyMessage="Belum ada mapping script">
          <Column header="Test Case" body={(r: AutomationScript) => caseLabel(r.testCaseId)} />
          <Column field="scriptRef" header="Script" />
          <Column header="Label" body={(r: AutomationScript) => r.runnerLabels.length ? r.runnerLabels.map((l) => <Tag key={l} value={l} className="mr-1" />) : <span className="text-color-secondary">-</span>} />
          <Column header="Aksi" body={(r: AutomationScript) => <Button text size="small" severity="danger" icon="pi pi-trash" onClick={() => deleteScript(r)} />} />
        </DataTable>
      </TabPanel>

      <TabPanel header={`Job (${jobs.length})`}>
        <DataTable value={jobs} loading={loading} size="small" emptyMessage="Belum ada job automation" paginator rows={20}>
          <Column header="Test Case" body={(r: AutomationJob) => caseLabel(r.testCaseId)} />
          <Column field="scriptRef" header="Script" />
          <Column header="Status" body={(r: AutomationJob) => <Tag value={r.status} severity={jobSeverity[r.status]} />} />
          <Column header="Attempt" body={(r: AutomationJob) => `${r.attempt}/${r.maxAttempts}`} />
          <Column field="browser" header="Browser" />
          <Column field="deviceProfile" header="Device" body={(r: AutomationJob) => r.deviceProfile ?? 'Desktop'} />
          <Column header="Artifact" body={(r: AutomationJob) => r.artifacts.length ? r.artifacts.map((a, i) => <a key={i} role="button" tabIndex={0} onClick={() => openArtifact(a)} onKeyDown={(e) => { if (e.key === 'Enter') openArtifact(a); }} className="mr-2 cursor-pointer text-primary" title={a.name ?? a.type}>{a.type}</a>) : <span className="text-color-secondary">-</span>} />
          <Column field="errorMessage" header="Error" body={(r: AutomationJob) => r.errorMessage ?? '-'} />
          <Column header="Aksi" body={(r: AutomationJob) => r.status === 'queued' && canEditContent && <Button text size="small" icon="pi pi-times" tooltip="Cancel" onClick={() => cancelJob(r)} />} />
        </DataTable>
      </TabPanel>
    </TabView></Card>

    <Dialog header="Runner Baru" visible={runnerDialog} onHide={() => setRunnerDialog(false)} style={{ width: '32rem' }}>
      <div className="flex flex-column gap-3">
        <label htmlFor="runner-name">Nama<InputText id="runner-name" className="w-full" value={runnerName} onChange={(e) => setRunnerName(e.target.value)} /></label>
        <label htmlFor="runner-labels">Labels (kapabilitas, mis. chromium, staging)<Chips id="runner-labels" className="w-full" value={runnerLabels} onChange={(e) => setRunnerLabels(e.value ?? [])} /></label>
        <Button label="Buat runner" onClick={createRunner} disabled={!runnerName.trim()} />
      </div>
    </Dialog>

    <Dialog header="Simpan token runner sekarang" visible={!!secret} onHide={() => setSecret(null)} style={{ width: '36rem' }}>
      {secret && <div className="flex flex-column gap-3">
        <Message severity="warn" text="Token hanya ditampilkan sekali. Simpan di konfigurasi runner lokal; jangan commit atau kirim ke log." />
        <InputText readOnly value={secret.token} onFocus={(e) => e.currentTarget.select()} />
        <small>Set sebagai <code>TM_RUNNER_TOKEN</code> di mesin lokal. Regenerate akan langsung mencabut token lama.</small>
        <Button label="Salin token" icon="pi pi-copy" onClick={() => { void navigator.clipboard.writeText(secret.token); toast.current?.show({ severity: 'info', summary: 'Token disalin' }); }} />
      </div>}
    </Dialog>

    <Dialog header="Enqueue Automation" visible={enqueueDialog} onHide={() => setEnqueueDialog(false)} style={{ width: '32rem' }}>
      <div className="flex flex-column gap-3">
        <label htmlFor="enq-plan">Test Plan<Dropdown id="enq-plan" className="w-full" value={enqueuePlanId} options={testPlans.map((p) => ({ label: `${p.code} — ${p.name}`, value: p.id }))} onChange={(e) => setEnqueuePlanId(e.value)} placeholder="Pilih test plan" /></label>
        <label htmlFor="enq-name">Nama Run (opsional)<InputText id="enq-name" className="w-full" value={enqueueName} onChange={(e) => setEnqueueName(e.target.value)} /></label>
        <label htmlFor="enq-env">Environment (opsional)<Dropdown id="enq-env" className="w-full" value={enqueueEnvId} options={environments.map((e) => ({ label: e.name, value: e.id }))} onChange={(e) => setEnqueueEnvId(e.value)} showClear placeholder="Pilih environment" /></label>
        <label htmlFor="enq-browser">Browser<Dropdown id="enq-browser" className="w-full" value={enqueueBrowser} options={['chromium', 'firefox', 'webkit']} onChange={(e) => setEnqueueBrowser(e.value as AutomationBrowser)} /></label>
        <label htmlFor="enq-device">Device profile<Dropdown id="enq-device" className="w-full" value={enqueueDeviceProfile} options={[{ label: 'Desktop', value: null }, { label: 'Pixel 7', value: 'Pixel 7' }, { label: 'iPhone 13', value: 'iPhone 13' }, { label: 'iPad (gen 7)', value: 'iPad (gen 7)' }]} onChange={(e) => setEnqueueDeviceProfile(e.value)} /></label>
        <label htmlFor="enq-max">Max attempts per job<InputNumber id="enq-max" className="w-full" value={enqueueMaxAttempts} onValueChange={(e) => setEnqueueMaxAttempts(e.value ?? 1)} min={1} max={10} showButtons /></label>
        <small className="text-color-secondary">Hanya Test Case yang punya mapping script yang di-antrekan. Sisanya tetap <code>not_run</code> untuk tes manual.</small>
        <Button label="Enqueue" onClick={enqueue} disabled={!enqueuePlanId} />
      </div>
    </Dialog>
  </div>;
}
