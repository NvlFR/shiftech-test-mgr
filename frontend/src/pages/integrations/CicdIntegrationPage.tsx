import { useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from 'primereact/button';
import { Card } from 'primereact/card';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Dialog } from 'primereact/dialog';
import { Dropdown } from 'primereact/dropdown';
import { InputText } from 'primereact/inputtext';
import { Tag } from 'primereact/tag';
import { Toast } from 'primereact/toast';
import { PageHeader } from '../../components/ui/PageHeader';
import { useCicdPipelines } from '../../hooks/useCicdPipelines';
import { useTestPlans } from '../../hooks/useTestPlans';
import { useProjectRole } from '../../hooks/useProjectRole';
import { cicdService } from '../../services/cicdService';
import type { CicdPipeline, CicdPipelineSecret, CicdProvider } from '../../types/domain';

const providerOptions: { label: string; value: CicdProvider }[] = [
  { label: 'GitHub Actions', value: 'github_actions' }, { label: 'GitLab CI', value: 'gitlab_ci' },
  { label: 'Jenkins', value: 'jenkins' }, { label: 'Runner internal', value: 'runner_internal' }, { label: 'Generic', value: 'generic' },
];

export function CicdIntegrationPage() {
  const { id: projectId } = useParams<{ id: string }>();
  const toast = useRef<Toast>(null);
  const { canManageSettings } = useProjectRole(projectId);
  const { pipelines, loading, error, reload } = useCicdPipelines(projectId ?? null);
  const { testPlans } = useTestPlans(projectId ?? null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState('');
  const [testPlanId, setTestPlanId] = useState<string | null>(null);
  const [provider, setProvider] = useState<CicdProvider>('generic');
  const [secret, setSecret] = useState<CicdPipelineSecret | null>(null);

  async function createPipeline() {
    if (!projectId || !testPlanId) return;
    try {
      const created = await cicdService.create({ projectId, testPlanId, name, provider });
      setSecret(created); setDialogOpen(false); setName(''); setTestPlanId(null); await reload();
      toast.current?.show({ severity: 'success', summary: 'Pipeline dibuat' });
    } catch (err) { toast.current?.show({ severity: 'error', summary: err instanceof Error ? err.message : 'Gagal membuat pipeline' }); }
  }

  async function rotate(row: CicdPipeline) {
    try { setSecret(await cicdService.rotateToken(row.id)); await reload(); }
    catch (err) { toast.current?.show({ severity: 'error', summary: err instanceof Error ? err.message : 'Gagal rotate token' }); }
  }

  async function toggle(row: CicdPipeline) {
    try { await cicdService.setActive(row.id, !row.active); await reload(); }
    catch (err) { toast.current?.show({ severity: 'error', summary: err instanceof Error ? err.message : 'Gagal mengubah status' }); }
  }

  return <div>
    <Toast ref={toast} />
    <PageHeader title="Integrasi CI/CD" actions={canManageSettings && <Button label="Pipeline Baru" icon="pi pi-plus" onClick={() => setDialogOpen(true)} />} />
    <Card className="mb-3">
      <p className="mt-0">Pipeline membuat Test Run baru dan mengisi hasil pada <code>test_results</code>. Run tetap <code>in_progress</code> sampai diselesaikan manual.</p>
      <p className="mb-0 text-color-secondary">Endpoint aman tersedia sebagai Supabase RPC <code>ingest_cicd_test_run</code>. Token hanya dikirim saat ingest dan tidak pernah disimpan plaintext.</p>
    </Card>
    {error && <p className="p-error">{error}</p>}
    <DataTable value={pipelines} loading={loading} emptyMessage="Belum ada pipeline CI/CD" size="small">
      <Column field="name" header="Nama" />
      <Column field="provider" header="Provider" />
      <Column field="tokenPrefix" header="Token" />
      <Column field="active" header="Status" body={(row: CicdPipeline) => <Tag value={row.active ? 'Aktif' : 'Nonaktif'} severity={row.active ? 'success' : 'secondary'} />} />
      <Column header="Aksi" body={(row: CicdPipeline) => canManageSettings && <div className="flex gap-2"><Button text size="small" icon="pi pi-refresh" tooltip="Regenerate token" onClick={() => rotate(row)} /><Button text size="small" icon={row.active ? 'pi pi-ban' : 'pi pi-check'} tooltip={row.active ? 'Nonaktifkan' : 'Aktifkan'} onClick={() => toggle(row)} /></div>} />
    </DataTable>
    <Dialog header="Pipeline Baru" visible={dialogOpen} onHide={() => setDialogOpen(false)} style={{ width: '30rem' }}>
      <div className="flex flex-column gap-3">
        <label htmlFor="cicd-name">Nama<InputText id="cicd-name" className="w-full" value={name} onChange={(e) => setName(e.target.value)} /></label>
        <label htmlFor="cicd-plan">Test Plan<Dropdown id="cicd-plan" className="w-full" value={testPlanId} options={testPlans.map((p) => ({ label: `${p.code} — ${p.name}`, value: p.id }))} onChange={(e) => setTestPlanId(e.value)} placeholder="Pilih test plan" /></label>
        <label htmlFor="cicd-provider">Provider<Dropdown id="cicd-provider" className="w-full" value={provider} options={providerOptions} onChange={(e) => setProvider(e.value)} /></label>
        <Button label="Buat pipeline" onClick={createPipeline} disabled={!name.trim() || !testPlanId} />
      </div>
    </Dialog>
    <Dialog header="Simpan token sekarang" visible={!!secret} onHide={() => setSecret(null)} style={{ width: '36rem' }}>
      {secret && <div className="flex flex-column gap-3"><p className="p-message p-message-warn">Token hanya ditampilkan sekali. Simpan di secret manager CI/CD; jangan commit atau kirim ke log.</p><InputText readOnly value={secret.token} onFocus={(e) => e.currentTarget.select()} /><small>Gunakan sebagai <code>TM_PIPELINE_TOKEN</code>. Regenerate akan langsung mencabut token lama.</small><Button label="Salin token" icon="pi pi-copy" onClick={() => { void navigator.clipboard.writeText(secret.token); toast.current?.show({ severity: 'info', summary: 'Token disalin ke clipboard' }); }} /></div>}
    </Dialog>
  </div>;
}
