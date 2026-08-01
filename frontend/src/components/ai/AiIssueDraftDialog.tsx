import { useEffect, useState } from 'react';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { Dropdown } from 'primereact/dropdown';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { Message } from 'primereact/message';
import { Tag } from 'primereact/tag';
import { useAiIssueWorkflow } from '../../hooks/useAiIssueWorkflow';
import type { AiIssueDraft, DuplicateIssueCandidate } from '../../types/ai';
import type { TestResultWithDetails } from '../../types/domain';

interface Props {
  visible: boolean;
  projectId: string;
  result: TestResultWithDetails | null;
  onHide: () => void;
  onSaved: () => void | Promise<void>;
}

const priorities = (['low', 'medium', 'high', 'critical'] as const).map((value) => ({ label: value.toUpperCase(), value }));

export function AiIssueDraftDialog({ visible, projectId, result, onHide, onSaved }: Props) {
  const workflow = useAiIssueWorkflow(projectId);
  const { projectId: activeProjectId, draftFromFailedResult, detectDuplicates } = workflow;
  const [draft, setDraft] = useState<AiIssueDraft | null>(null);
  const [duplicates, setDuplicates] = useState<DuplicateIssueCandidate[]>([]);
  const [acknowledged, setAcknowledged] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!visible || !result || result.status !== 'fail' || projectId !== activeProjectId) return;
    setDraft(null); setDuplicates([]); setAcknowledged(false); setMessage(null);
    void draftFromFailedResult(result).then((next) => {
      if (!next) return;
      setDraft(next);
      void detectDuplicates(next).then(setDuplicates);
    });
  }, [activeProjectId, detectDuplicates, draftFromFailedResult, projectId, result, visible]);

  function update(changes: Partial<AiIssueDraft>) {
    setDraft((current) => current ? { ...current, ...changes } : current);
  }

  async function save() {
    if (!draft) return;
    const saved = await workflow.saveReviewedDraft(draft, acknowledged || duplicates.length === 0);
    if (saved) { await onSaved(); onHide(); }
  }

  return (
    <Dialog header="Draft Issue dengan AI" visible={visible} onHide={onHide} modal style={{ width: 'min(52rem, 96vw)' }}>
      <div className="flex flex-column gap-3">
        <Message severity="info" text="Draft wajib direview. Issue baru tetap berstatus Draft sampai manusia memverifikasinya melalui perubahan status. Jika duplicate terdeteksi, kegagalan baru akan ditambahkan sebagai komentar pada Issue lama." />
        {(workflow.error || message) && <Message severity="error" text={workflow.error ?? message ?? ''} />}
        {workflow.loading && <p className="m-0 text-color-secondary">Menyusun draft dan memeriksa kemungkinan duplicate…</p>}
        {draft && <>
          <div className="grid">
            <div className="col-12 md:col-8 flex flex-column gap-1"><label htmlFor="ai-issue-title">Judul</label><InputText id="ai-issue-title" value={draft.title} onChange={(event) => update({ title: event.target.value })} /></div>
            <div className="col-12 md:col-4 flex flex-column gap-1"><label htmlFor="ai-issue-priority">Prioritas</label><Dropdown id="ai-issue-priority" value={draft.priority} options={priorities} optionLabel="label" optionValue="value" onChange={(event) => update({ priority: event.value })} /></div>
            <div className="col-12 md:col-4 flex flex-column gap-1"><label htmlFor="ai-issue-severity">Severity</label><Dropdown id="ai-issue-severity" value={draft.severity} options={priorities} optionLabel="label" optionValue="value" onChange={(event) => update({ severity: event.value })} /></div>
          </div>
          {(['description', 'actualResult', 'expectedResult', 'reproductionSteps'] as const).map((field) => (
            <div className="flex flex-column gap-1" key={field}>
              <label htmlFor={`ai-issue-${field}`}>{field === 'actualResult' ? 'Hasil Aktual' : field === 'expectedResult' ? 'Hasil yang Diharapkan' : field === 'reproductionSteps' ? 'Langkah Reproduksi' : 'Deskripsi'}</label>
              <InputTextarea id={`ai-issue-${field}`} value={draft[field]} onChange={(event) => update({ [field]: event.target.value })} rows={field === 'description' ? 4 : 3} />
            </div>
          ))}
          {duplicates.length > 0 && <div className="surface-100 border-round p-3 flex flex-column gap-2"><span className="font-medium">Kemungkinan duplicate</span><small className="text-color-secondary">Kandidat dengan confidence tertinggi akan menerima komentar baru setelah review.</small>{duplicates.map((candidate, index) => <div className="flex align-items-center gap-2" key={candidate.issueId}><Tag value={`${Math.round(candidate.confidence * 100)}%`} severity={candidate.confidence >= 0.85 ? 'danger' : 'warning'} /><span className="text-sm"><strong>{candidate.issueCode}</strong> — {candidate.issueTitle}. {candidate.reason}{index === 0 ? ' (target komentar)' : ''}</span></div>)}<div className="flex align-items-center gap-2"><input id="ai-duplicate-ack" type="checkbox" checked={acknowledged} onChange={(event) => setAcknowledged(event.target.checked)} /><label htmlFor="ai-duplicate-ack">Saya sudah meninjau kandidat duplicate.</label></div></div>}
          <div className="flex justify-content-end gap-2"><Button label="Batal" text onClick={onHide} /><Button label={duplicates.length > 0 ? 'Review & Tambah Komentar' : 'Review & Simpan Draft'} icon="pi pi-check" loading={workflow.loading} disabled={duplicates.length > 0 && !acknowledged} onClick={() => { void save(); }} /></div>
        </>}
      </div>
    </Dialog>
  );
}
