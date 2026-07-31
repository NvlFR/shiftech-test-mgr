import { useEffect, useRef, useState } from 'react';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { Dropdown } from 'primereact/dropdown';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import type { ExternalLink, IssuePriority, IssueStatus, IssueType, ProjectMemberWithProfile, TestRole } from '../../types/domain';
import { ISSUE_PRIORITY_LABEL, ISSUE_STATUS_LABEL, ISSUE_TYPE_LABEL } from '../../helpers/statusLabels';

export interface IssueFormData {
  title: string;
  type: IssueType;
  priority: IssuePriority;
  status: IssueStatus;
  assignedTo: string | null;
  targetRoleId: string | null;
  description: string;
  actualResult: string;
  expectedResult: string;
  externalLinks: ExternalLink[];
}

interface IssueEditorProps {
  visible: boolean;
  onHide: () => void;
  onSave: (data: IssueFormData) => Promise<void>;
  initialData: IssueFormData;
  testRoles: TestRole[];
  projectMembers: ProjectMemberWithProfile[];
}

const TYPE_OPTIONS = (['bug', 'feature', 'improvement', 'task'] as const).map((value) => ({ label: ISSUE_TYPE_LABEL[value], value }));
const PRIORITY_OPTIONS = (['low', 'medium', 'high', 'critical'] as const).map((value) => ({ label: ISSUE_PRIORITY_LABEL[value], value }));
const STATUS_OPTIONS = (['backlog', 'open', 'in_progress', 'resolved', 'verified', 'closed', 'rejected', 'duplicate'] as const).map((value) => ({ label: ISSUE_STATUS_LABEL[value], value }));

export function IssueEditor({ visible, onHide, onSave, initialData, testRoles, projectMembers }: IssueEditorProps) {
  const [form, setForm] = useState<IssueFormData>(initialData);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!visible) return;
    setForm(initialData);
    setError(null);
    setSaving(false);
  }, [initialData, visible]);

  function update<K extends keyof IssueFormData>(key: K, value: IssueFormData[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSave() {
    if (!form.title.trim()) {
      setError('Judul issue tidak boleh kosong');
      titleRef.current?.focus();
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave({
        ...form,
        title: form.title.trim(),
        description: form.description.trim(),
        actualResult: form.actualResult.trim(),
        expectedResult: form.expectedResult.trim(),
        externalLinks: form.externalLinks
          .map((link) => ({ label: link.label.trim(), url: link.url.trim() }))
          .filter((link) => link.url),
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Gagal menyimpan issue');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog header="Edit Issue" visible={visible} onHide={saving ? () => undefined : onHide} closable={!saving} style={{ width: '38rem' }} className="dialog-fullscreen-mobile">
      <div className="flex flex-column gap-3">
        {error && <small className="p-error">{error}</small>}
        <div className="flex flex-column gap-1">
          <label htmlFor="issue-title">Judul *</label>
          <InputText id="issue-title" ref={titleRef} value={form.title} onChange={(event) => update('title', event.target.value)} autoFocus />
        </div>
        <div className="grid">
          <div className="col-12 md:col-4 flex flex-column gap-1">
            <label htmlFor="issue-type">Tipe</label>
            <Dropdown id="issue-type" value={form.type} options={TYPE_OPTIONS} onChange={(event) => update('type', event.value)} />
          </div>
          <div className="col-12 md:col-4 flex flex-column gap-1">
            <label htmlFor="issue-priority">Prioritas</label>
            <Dropdown id="issue-priority" value={form.priority} options={PRIORITY_OPTIONS} onChange={(event) => update('priority', event.value)} />
          </div>
          <div className="col-12 md:col-4 flex flex-column gap-1">
            <label htmlFor="issue-status">Status</label>
            <Dropdown id="issue-status" value={form.status} options={STATUS_OPTIONS} onChange={(event) => update('status', event.value)} />
          </div>
        </div>
        <div className="grid">
          <div className="col-12 md:col-6 flex flex-column gap-1">
            <label htmlFor="issue-assignee">Ditugaskan ke</label>
            <Dropdown id="issue-assignee" value={form.assignedTo} options={projectMembers.filter((member) => member.status === 'accepted').map((member) => ({ label: member.profile.fullName ?? member.profile.email, value: member.userId }))} onChange={(event) => update('assignedTo', event.value ?? null)} showClear placeholder="Belum ditugaskan" />
          </div>
          <div className="col-12 md:col-6 flex flex-column gap-1">
            <label htmlFor="issue-target-role">Target role</label>
            <Dropdown id="issue-target-role" value={form.targetRoleId} options={testRoles.map((role) => ({ label: role.name, value: role.id }))} onChange={(event) => update('targetRoleId', event.value ?? null)} showClear placeholder="Tidak ditentukan" />
          </div>
        </div>
        <div className="flex flex-column gap-1">
          <label htmlFor="issue-description">Deskripsi</label>
          <InputTextarea id="issue-description" value={form.description} onChange={(event) => update('description', event.target.value)} rows={3} autoResize maxLength={1000} />
        </div>
        <div className="flex flex-column gap-1">
          <label htmlFor="issue-actual">Hasil aktual</label>
          <InputTextarea id="issue-actual" value={form.actualResult} onChange={(event) => update('actualResult', event.target.value)} rows={2} autoResize maxLength={1000} />
        </div>
        <div className="flex flex-column gap-1">
          <label htmlFor="issue-expected">Hasil yang diharapkan</label>
          <InputTextarea id="issue-expected" value={form.expectedResult} onChange={(event) => update('expectedResult', event.target.value)} rows={2} autoResize maxLength={1000} />
        </div>
        <div className="flex flex-column gap-2">
          <label>External links</label>
          {form.externalLinks.map((link, index) => (
            <div key={index} className="flex gap-2">
              <InputText value={link.url} placeholder="https://..." className="w-full" onChange={(event) => update('externalLinks', form.externalLinks.map((item, itemIndex) => itemIndex === index ? { ...item, url: event.target.value } : item))} />
              <InputText value={link.label} placeholder="Label" className="w-full" onChange={(event) => update('externalLinks', form.externalLinks.map((item, itemIndex) => itemIndex === index ? { ...item, label: event.target.value } : item))} />
              <Button icon="pi pi-times" text severity="danger" aria-label="Hapus link" onClick={() => update('externalLinks', form.externalLinks.filter((_, itemIndex) => itemIndex !== index))} />
            </div>
          ))}
          <Button label="Tambah Link" icon="pi pi-plus" text size="small" className="align-self-start" onClick={() => update('externalLinks', [...form.externalLinks, { label: '', url: '' }])} />
        </div>
        <div className="flex justify-content-end gap-2">
          <Button label="Batal" outlined onClick={onHide} disabled={saving} />
          <Button label="Simpan" onClick={handleSave} loading={saving} />
        </div>
      </div>
    </Dialog>
  );
}
