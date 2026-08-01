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
import { Checkbox } from 'primereact/checkbox';
import { TabView, TabPanel } from 'primereact/tabview';
import { Tag } from 'primereact/tag';
import { Message } from 'primereact/message';
import { Toast } from 'primereact/toast';
import { PageHeader } from '../../components/ui/PageHeader';
import { useAutomation } from '../../hooks/useAutomation';
import { useAutomationJobLogs } from '../../hooks/useAutomationJobLogs';
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
  const { canRunAutomation, canManageSettings, loading: roleLoading } = useProjectRole(projectId);
  const { runners, scripts, jobs, loading, error, reload, runLocally, sendStepCommand } = useAutomation(projectId ?? null);
  const { testPlans } = useTestPlans(projectId ?? null);
  const { environments } = useEnvironments(projectId ?? null);
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [logJob, setLogJob] = useState<AutomationJob | null>(null);
  const { logs: jobLogs, loading: jobLogsLoading, error: jobLogsError } = useAutomationJobLogs(logJob?.id ?? null);

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
  const [enqueuePauseOnFailure, setEnqueuePauseOnFailure] = useState(false);
  const [localScript, setLocalScript] = useState<AutomationScript | null>(null);
  const [localPlanId, setLocalPlanId] = useState<string | null>(null);
  const [localName, setLocalName] = useState('');
  const [localBrowser, setLocalBrowser] = useState<AutomationBrowser>('chromium');
  const [localDeviceProfile, setLocalDeviceProfile] = useState<string | null>(null);
  const [localPauseOnFailure, setLocalPauseOnFailure] = useState(false);
  const [localRunning, setLocalRunning] = useState(false);

  useEffect(() => {
    if (!projectId) { setTestCases([]); return; }
    void testCaseService.listByProject(projectId).then(setTestCases).catch(() => setTestCases([]));
  }, [projectId]);

  if (roleLoading) return <p>Memuat...</p>;
  if (!canRunAutomation) return <Navigate to={`/projects/${projectId}`} replace />;

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
      const res = await automationService.enqueue({ projectId, testPlanId: enqueuePlanId, name: enqueueName, environmentId: enqueueEnvId, maxAttempts: enqueueMaxAttempts, browser: enqueueBrowser, deviceProfile: enqueueDeviceProfile, pauseOnFailure: enqueuePauseOnFailure });
      setEnqueueDialog(false); setEnqueuePlanId(null); setEnqueueName(''); setEnqueueEnvId(null); setEnqueueMaxAttempts(1); setEnqueueBrowser('chromium'); setEnqueueDeviceProfile(null); setEnqueuePauseOnFailure(false); await reload();
      toast.current?.show({ severity: 'success', summary: `Test Run ${res.runCode} dibuat`, detail: `${res.jobCount} job automation di-antrekan` });
    } catch (err) { toast.current?.show({ severity: 'error', summary: err instanceof Error ? err.message : 'Gagal enqueue automation' }); }
  }
  async function cancelJob(row: AutomationJob) {
    try { await automationService.cancelJob(row.id); await reload(); }
    catch (err) { toast.current?.show({ severity: 'error', summary: err instanceof Error ? err.message : 'Gagal cancel job' }); }
  }
  async function controlJob(row: AutomationJob, command: 'next' | 'continue') {
    try {
      await sendStepCommand(row.id, command);
      toast.current?.show({ severity: 'info', summary: command === 'next' ? 'Perintah Next dikirim' : 'Perintah Continue dikirim', detail: 'Runner lokal akan mengambil perintah melalui koneksi outbound.' });
    } catch (err) { toast.current?.show({ severity: 'error', summary: err instanceof Error ? err.message : 'Gagal mengirim perintah step-through' }); }
  }
  async function startLocalRun() {
    if (!localScript || !localPlanId) return;
    setLocalRunning(true);
    try {
      const result = await runLocally({ testPlanId: localPlanId, testCaseId: localScript.testCaseId, name: localName, browser: localBrowser, deviceProfile: localDeviceProfile, pauseOnFailure: localPauseOnFailure });
      setLocalScript(null); setLocalPlanId(null); setLocalName(''); setLocalBrowser('chromium'); setLocalDeviceProfile(null); setLocalPauseOnFailure(false);
      toast.current?.show({ severity: 'success', summary: `Test Run ${result.runCode} dibuat`, detail: 'Satu Test Case siap diambil Local Runner' });
    } catch (err) { toast.current?.show({ severity: 'error', summary: err instanceof Error ? err.message : 'Gagal menjalankan Test Case' }); }
    finally { setLocalRunning(false); }
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
          <Column header="Aksi" body={(r: AutomationScript) => <div className="flex gap-1">
            <Button text size="small" icon="pi pi-play" label="Run locally" tooltip="Jalankan hanya Test Case ini di Local Runner" onClick={() => setLocalScript(r)} />
            <Button text size="small" severity="danger" icon="pi pi-trash" tooltip="Hapus mapping" onClick={() => deleteScript(r)} />
          </div>} />
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
          <Column header="Aksi" body={(r: AutomationJob) => <div className="flex gap-1">
            <Button text size="small" icon="pi pi-file" tooltip="Lihat live log" onClick={() => setLogJob(r)} />
            {r.status === 'running' && canRunAutomation && <>
              <Button text size="small" icon="pi pi-step-forward" label="Next" tooltip="Jalankan satu langkah berikutnya" onClick={() => controlJob(r, 'next')} />
              <Button text size="small" icon="pi pi-forward" label="Continue" tooltip="Lanjutkan tanpa berhenti di setiap langkah" onClick={() => controlJob(r, 'continue')} />
            </>}
            {r.status === 'queued' && canRunAutomation && <Button text size="small" icon="pi pi-times" tooltip="Cancel" onClick={() => cancelJob(r)} />}
          </div>} />
        </DataTable>
      </TabPanel>
    </TabView></Card>

    <Dialog header={`Log Job${logJob ? ` — ${caseLabel(logJob.testCaseId)}` : ''}`} visible={!!logJob} onHide={() => setLogJob(null)} style={{ width: 'min(70rem, 95vw)' }}>
      {jobLogsError && <Message severity="error" text={jobLogsError} className="mb-2" />}
      <div className="surface-900 text-100 p-3 border-round overflow-auto" style={{ minHeight: '18rem', maxHeight: '60vh', whiteSpace: 'pre-wrap', fontFamily: 'monospace' }} aria-live="polite">
        {jobLogsLoading && !jobLogs.length ? 'Memuat log...' : jobLogs.length ? jobLogs.map((entry) => <span key={entry.id} className={entry.stream === 'stderr' ? 'text-red-300' : entry.stream === 'system' ? 'text-blue-300' : undefined}>{entry.content}</span>) : 'Belum ada output dari runner.'}
      </div>
      {logJob?.status === 'running' && <small className="text-color-secondary">Log diperbarui otomatis selama job berjalan.</small>}
    </Dialog>

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
        <div className="flex align-items-center gap-2"><Checkbox inputId="enq-pause-failure" checked={enqueuePauseOnFailure} onChange={(e) => setEnqueuePauseOnFailure(e.checked ?? false)} /><label htmlFor="enq-pause-failure">Pause & inspect saat gagal</label></div>
        {enqueuePauseOnFailure && <small className="text-color-secondary">Browser lokal tetap terbuka sampai tester menekan Resume di Playwright Inspector.</small>}
        <small className="text-color-secondary">Hanya Test Case yang punya mapping script yang di-antrekan. Sisanya tetap <code>not_run</code> untuk tes manual.</small>
        <Button label="Enqueue" onClick={enqueue} disabled={!enqueuePlanId} />
      </div>
    </Dialog>

    <Dialog header={`Run locally${localScript ? ` — ${caseLabel(localScript.testCaseId)}` : ''}`} visible={!!localScript} onHide={() => !localRunning && setLocalScript(null)} style={{ width: '32rem' }} closable={!localRunning}>
      <div className="flex flex-column gap-3">
        <Message severity="info" text="Hanya Test Case ini yang dibuatkan job. Local Runner online dengan label yang sesuai akan mengambilnya." />
        <label htmlFor="local-plan">Test Plan<Dropdown id="local-plan" className="w-full" value={localPlanId} options={testPlans.map((p) => ({ label: `${p.code} — ${p.name}`, value: p.id }))} onChange={(e) => setLocalPlanId(e.value)} placeholder="Pilih Test Plan yang memuat Test Case" /></label>
        <label htmlFor="local-name">Nama Run (opsional)<InputText id="local-name" className="w-full" value={localName} onChange={(e) => setLocalName(e.target.value)} /></label>
        <label htmlFor="local-browser">Browser<Dropdown id="local-browser" className="w-full" value={localBrowser} options={['chromium', 'firefox', 'webkit']} onChange={(e) => setLocalBrowser(e.value as AutomationBrowser)} /></label>
        <label htmlFor="local-device">Device profile<Dropdown id="local-device" className="w-full" value={localDeviceProfile} options={[{ label: 'Desktop', value: null }, { label: 'Pixel 7', value: 'Pixel 7' }, { label: 'iPhone 13', value: 'iPhone 13' }, { label: 'iPad (gen 7)', value: 'iPad (gen 7)' }]} onChange={(e) => setLocalDeviceProfile(e.value)} /></label>
        <div className="flex align-items-center gap-2"><Checkbox inputId="local-pause-failure" checked={localPauseOnFailure} onChange={(e) => setLocalPauseOnFailure(e.checked ?? false)} /><label htmlFor="local-pause-failure">Pause & inspect saat gagal</label></div>
        {localPauseOnFailure && <small className="text-color-secondary">Browser lokal tetap terbuka sampai tester menekan Resume di Playwright Inspector.</small>}
        <Button label="Run locally" icon="pi pi-play" onClick={startLocalRun} disabled={!localPlanId} loading={localRunning} />
      </div>
    </Dialog>
  </div>;
}
