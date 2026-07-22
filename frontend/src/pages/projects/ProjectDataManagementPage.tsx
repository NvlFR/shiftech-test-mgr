import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card } from 'primereact/card';
import { Button } from 'primereact/button';
import { InputNumber } from 'primereact/inputnumber';
import { InputSwitch } from 'primereact/inputswitch';
import { TabView, TabPanel } from 'primereact/tabview';
import { Toast } from 'primereact/toast';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { useAuthContext } from '../../hooks/useAuth';
import { useProjectRole } from '../../hooks/useProjectRole';
import { useBackupRetention } from '../../hooks/useBackupRetention';
import { backupRetentionService } from '../../services/backupRetentionService';
import type { RestorePreview } from '../../types/domain';

export function ProjectDataManagementPage() {
  const { id } = useParams<{ id: string }>();
  const isGlobal = !id;
  const navigate = useNavigate();
  const toast = useRef<Toast>(null);
  const { profile, isAdmin } = useAuthContext();
  const { canManageSettings, loading: roleLoading } = useProjectRole(id);
  const { policy, preview, loading, reload } = useBackupRetention(id ?? null);
  const [days, setDays] = useState(365);
  const [attachmentDays, setAttachmentDays] = useState<number | null>(null);
  const [enabled, setEnabled] = useState(true);
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [restoreData, setRestoreData] = useState<Record<string, unknown> | null>(null);
  const [restorePreview, setRestorePreview] = useState<RestorePreview | null>(null);
  const [saving, setSaving] = useState(false);

  const canManage = isGlobal ? isAdmin : canManageSettings;
  useEffect(() => {
    if (policy) { setDays(policy.retentionDays); setAttachmentDays(policy.attachmentRetentionDays); setEnabled(policy.enabled); }
  }, [policy]);

  async function savePolicy() {
    if (!profile) return;
    setSaving(true);
    try {
      await backupRetentionService.savePolicy({ projectId: id ?? null, retentionDays: days, attachmentRetentionDays: attachmentDays, enabled, createdBy: profile.id });
      await reload();
      toast.current?.show({ severity: 'success', summary: 'Kebijakan retensi disimpan' });
    } catch (error) { toast.current?.show({ severity: 'error', summary: 'Gagal menyimpan', detail: error instanceof Error ? error.message : 'Error' }); }
    finally { setSaving(false); }
  }

  async function downloadBackup() {
    if (!id) return;
    try {
      const data = await backupRetentionService.backup(id);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a'); link.href = url; link.download = `testmanager-backup-${id}.json`; link.click(); URL.revokeObjectURL(url);
      toast.current?.show({ severity: 'success', summary: 'Backup berhasil diekspor' });
    } catch (error) { toast.current?.show({ severity: 'error', summary: 'Backup gagal', detail: error instanceof Error ? error.message : 'Error' }); }
  }

  async function inspectRestore(file: File | null) {
    setRestoreFile(file); setRestoreData(null); setRestorePreview(null);
    if (!file) return;
    try {
      const data = JSON.parse(await file.text()) as Record<string, unknown>;
      setRestoreData(data); setRestorePreview(await backupRetentionService.restorePreview(data));
    } catch (error) { toast.current?.show({ severity: 'error', summary: 'Backup tidak valid', detail: error instanceof Error ? error.message : 'Format JSON tidak valid' }); }
  }

  function restore() {
    if (!id || !restoreData || !restorePreview) return;
    confirmDialog({ header: 'Konfirmasi Restore', message: `Restore ${restorePreview.testCases} test case dan histori terkait ke project ini? Data existing akan dilewati (mode aman).`, icon: 'pi pi-exclamation-triangle', acceptLabel: 'Restore', rejectLabel: 'Batal', acceptClassName: 'p-button-warning', accept: async () => {
      try { const result = await backupRetentionService.restore(id, restoreData); toast.current?.show({ severity: 'success', summary: 'Restore selesai', detail: `${result.inserted} data masuk, ${result.skipped} dilewati.` }); setRestoreData(null); setRestorePreview(null); setRestoreFile(null); }
      catch (error) { toast.current?.show({ severity: 'error', summary: 'Restore gagal', detail: error instanceof Error ? error.message : 'Error' }); }
    } });
  }

  function cleanup() {
    if (!preview) return;
    confirmDialog({ header: 'Konfirmasi Cleanup Permanen', message: `Hapus ${preview.testAttachmentCount + preview.issueAttachmentCount} metadata attachment dan object Storage yang melewati retensi? Histori test run tidak dihapus.`, icon: 'pi pi-exclamation-triangle', acceptLabel: 'Hapus Permanen', rejectLabel: 'Batal', acceptClassName: 'p-button-danger', accept: async () => {
      try { const result = await backupRetentionService.cleanup(id ?? null); toast.current?.show({ severity: 'success', summary: 'Cleanup selesai', detail: `${result.testAttachments + result.issueAttachments} attachment dihapus.` }); await reload(); }
      catch (error) { toast.current?.show({ severity: 'error', summary: 'Cleanup gagal', detail: error instanceof Error ? error.message : 'Error' }); }
    } });
  }

  if (!canManage || roleLoading || loading) return <p>Memuat...</p>;
  return <div className="p-3">
    <Toast ref={toast} /><ConfirmDialog />
    <Card className="mb-3"><div className="flex align-items-center gap-2"><Button icon="pi pi-arrow-left" text rounded aria-label="Kembali" onClick={() => navigate(id ? `/projects/${id}/settings` : '/')} /><h2 className="m-0">{isGlobal ? 'Retensi Data Global' : 'Backup & Retensi Project'}</h2></div></Card>
    <Card><TabView>
      {!isGlobal && <TabPanel header="Backup / Restore">
        <div className="flex flex-column gap-3">
          <p className="text-color-secondary">Backup berisi konfigurasi, test run/result/issue, dan metadata attachment. File Storage tidak diunduh; password, token, dan secret tidak pernah diekspor.</p>
          <Button label="Ekspor Backup JSON" icon="pi pi-download" onClick={downloadBackup} className="align-self-start" />
          <div className="flex flex-column gap-2"><label htmlFor="restore-file">File backup JSON untuk preview/restore</label><input id="restore-file" type="file" accept="application/json,.json" onChange={(e) => void inspectRestore(e.target.files?.[0] ?? null)} /></div>
          {restoreFile && restorePreview && <div className="surface-100 p-3 border-round"><p className="mt-0">Backup <strong>{restorePreview.projectName}</strong> valid. {restorePreview.testCases} test case, {restorePreview.testRuns} run, {restorePreview.testResults} result, {restorePreview.issues} issue, {restorePreview.attachments} metadata attachment.</p><Button label="Restore ke Project Ini" icon="pi pi-upload" severity="warning" onClick={restore} /></div>}
        </div>
      </TabPanel>}
      <TabPanel header="Retensi & Cleanup">
        <div className="flex flex-column gap-3" style={{ maxWidth: '42rem' }}>
          <p className="text-color-secondary">Cleanup hanya menyentuh attachment lama dalam scope {isGlobal ? 'global' : 'project'} dan selalu memerlukan konfirmasi. Histori test run, result, dan issue tidak dihapus.</p>
          <div className="flex flex-column gap-1"><label htmlFor="retention-days">Retensi histori (hari)</label><InputNumber id="retention-days" value={policy?.retentionDays ?? days} onValueChange={(e) => setDays(e.value ?? 365)} min={1} max={3650} /></div>
          <div className="flex flex-column gap-1"><label htmlFor="attachment-retention-days">Retensi attachment (hari, kosong = histori)</label><InputNumber id="attachment-retention-days" value={policy?.attachmentRetentionDays ?? attachmentDays} onValueChange={(e) => setAttachmentDays(e.value ?? null)} min={1} max={3650} /></div>
          <div className="flex align-items-center gap-2"><InputSwitch inputId="retention-enabled" checked={policy?.enabled ?? enabled} onChange={(e) => setEnabled(Boolean(e.value))} /><label htmlFor="retention-enabled">Aktif</label></div>
          <Button label="Simpan Kebijakan" icon="pi pi-save" loading={saving} onClick={() => void savePolicy()} className="align-self-start" />
          {preview && <div className="surface-100 p-3 border-round"><strong>Preview dry-run</strong><p className="mb-2">Cutoff: {new Date(preview.attachmentCutoff).toLocaleString('id-ID')}</p><p className="mt-0">Test attachment: {preview.testAttachmentCount} · Issue attachment: {preview.issueAttachmentCount}</p><Button label="Jalankan Cleanup" icon="pi pi-trash" severity="danger" outlined onClick={cleanup} disabled={preview.testAttachmentCount + preview.issueAttachmentCount === 0} /></div>}
        </div>
      </TabPanel>
    </TabView></Card>
  </div>;
}
