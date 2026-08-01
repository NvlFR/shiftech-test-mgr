import { useEffect, useMemo, useState } from 'react';
import { Button } from 'primereact/button';
import { Column } from 'primereact/column';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { DataTable } from 'primereact/datatable';
import { Dialog } from 'primereact/dialog';
import { Dropdown } from 'primereact/dropdown';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { Message } from 'primereact/message';
import { MultiSelect } from 'primereact/multiselect';
import { Tag } from 'primereact/tag';
import { BulkActionsBar } from '../../components/ui/BulkActionsBar';
import { PageHeader } from '../../components/ui/PageHeader';
import { TEST_CASE_PRIORITY_LABEL } from '../../helpers/statusLabels';
import { useAiTestCaseReview } from '../../hooks/useAiTestCaseReview';
import { useProjectContext } from '../../hooks/useProjectContext';
import type { TestCasePriority, TestCaseWithDetails } from '../../types/domain';

const priorities = (['low', 'medium', 'high', 'critical'] as const).map((value) => ({ value, label: TEST_CASE_PRIORITY_LABEL[value] }));

export function AiTestCaseReviewPage() {
  const { projects, projectId, setProjectId } = useProjectContext();
  const queue = useAiTestCaseReview(projectId);
  const [selected, setSelected] = useState<TestCaseWithDetails[]>([]);
  const [batchId, setBatchId] = useState<string | null>(null);
  const [editing, setEditing] = useState<TestCaseWithDetails | null>(null);
  const [form, setForm] = useState({ title: '', objective: '', preconditions: '', steps: '', expectedResult: '', priority: 'medium' as TestCasePriority, moduleId: null as string | null, tags: [] as string[], notes: '' });
  const batches = useMemo(() => {
    const grouped = new Map<string, TestCaseWithDetails[]>();
    queue.drafts.forEach((draft) => { const key = draft.aiBatchId ?? 'legacy'; grouped.set(key, [...(grouped.get(key) ?? []), draft]); });
    return [...grouped.entries()].map(([value, rows]) => ({ value, label: `${new Date(rows[0].createdAt).toLocaleString('id-ID')} · ${rows.length} draf` })).reverse();
  }, [queue.drafts]);
  useEffect(() => { setBatchId((current) => current && batches.some((batch) => batch.value === current) ? current : batches[0]?.value ?? null); setSelected([]); }, [batches]);
  const rows = useMemo(() => queue.drafts.filter((draft) => (draft.aiBatchId ?? 'legacy') === batchId), [batchId, queue.drafts]);
  function openEdit(draft: TestCaseWithDetails) { setEditing(draft); setForm({ title: draft.title, objective: draft.objective ?? '', preconditions: draft.preconditions ?? '', steps: draft.steps, expectedResult: draft.expectedResult, priority: draft.priority, moduleId: draft.moduleId, tags: draft.tags.map((tag) => tag.name), notes: draft.notes ?? '' }); }
  async function saveEdit() { if (!editing) return; await queue.update(editing, { title: form.title, objective: form.objective, preconditions: form.preconditions, steps: form.steps, expectedResult: form.expectedResult, priority: form.priority, moduleId: form.moduleId, notes: form.notes }, form.tags); setEditing(null); }
  function confirmReview(decision: 'approved' | 'rejected', targets: TestCaseWithDetails[]) {
    confirmDialog({ header: decision === 'approved' ? 'Setujui test case' : 'Tolak test case', message: `${decision === 'approved' ? 'Aktifkan' : 'Arsipkan'} ${targets.length} draf? Keputusan dan approver dicatat di audit log.`, acceptLabel: decision === 'approved' ? 'Setujui' : 'Tolak', rejectLabel: 'Batal', acceptClassName: decision === 'rejected' ? 'p-button-danger' : undefined, accept: () => { void queue.review(targets.map((item) => item.id), decision).then(() => setSelected([])); } });
  }
  return <div>
    <ConfirmDialog />
    <PageHeader title="Review Test Case AI" actions={<Dropdown value={projectId} options={projects.map((project) => ({ label: project.name, value: project.id }))} onChange={(event) => setProjectId(event.value)} placeholder="Pilih project" className="w-15rem" showClear />} />
    <Message severity="info" text="Gate manusia wajib: edit bila perlu, lalu approve atau reject. Draf baru aktif hanya setelah di-approve." className="mb-3" />
    {queue.error && <Message severity="error" text={queue.error} className="mb-3" />}
    {projectId && batches.length > 0 && <div className="flex align-items-center gap-2 mb-3"><label htmlFor="ai-review-batch" className="font-medium">Batch</label><Dropdown inputId="ai-review-batch" value={batchId} options={batches} onChange={(event) => setBatchId(event.value)} className="w-full md:w-25rem" /></div>}
    <BulkActionsBar selectedCount={selected.length} onClear={() => setSelected([])} actions={<><Button label="Approve" icon="pi pi-check" size="small" severity="success" loading={queue.saving} onClick={() => confirmReview('approved', selected)} /><Button label="Reject" icon="pi pi-times" size="small" severity="danger" outlined loading={queue.saving} onClick={() => confirmReview('rejected', selected)} /></>} />
    <DataTable value={rows} loading={queue.loading} selectionMode="multiple" selection={selected} onSelectionChange={(event) => setSelected(event.value)} dataKey="id" paginator rows={10} rowsPerPageOptions={[10, 25, 50]} size="small" emptyMessage={projectId ? 'Tidak ada draf AI yang menunggu review.' : 'Pilih project terlebih dahulu.'}>
      <Column selectionMode="multiple" headerStyle={{ width: '3rem' }} /><Column field="code" header="Kode" style={{ width: '7rem' }} /><Column field="title" header="Judul" /><Column header="Module" body={(row: TestCaseWithDetails) => row.module?.name ?? '-'} /><Column header="Prioritas" body={(row: TestCaseWithDetails) => <Tag value={TEST_CASE_PRIORITY_LABEL[row.priority]} />} /><Column header="Aksi" style={{ width: '7rem' }} body={(row: TestCaseWithDetails) => <Button label="Edit" icon="pi pi-pencil" size="small" text onClick={() => openEdit(row)} />} />
    </DataTable>
    <div className="flex justify-content-end gap-2 mt-3"><Button label="Approve semua batch" icon="pi pi-check-circle" severity="success" disabled={!rows.length} loading={queue.saving} onClick={() => confirmReview('approved', rows)} /><Button label="Reject semua batch" icon="pi pi-times-circle" severity="danger" outlined disabled={!rows.length} loading={queue.saving} onClick={() => confirmReview('rejected', rows)} /></div>
    <Dialog header="Edit Draf AI" visible={Boolean(editing)} onHide={() => setEditing(null)} style={{ width: 'min(48rem, 96vw)' }}><div className="flex flex-column gap-3">
      <div className="flex flex-column gap-1"><label htmlFor="review-title">Judul</label><InputText id="review-title" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></div>
      <div className="grid"><div className="col-12 md:col-6 flex flex-column gap-1"><label htmlFor="review-module">Module</label><Dropdown inputId="review-module" value={form.moduleId} options={queue.modules.map((module) => ({ label: module.name, value: module.id }))} onChange={(event) => setForm({ ...form, moduleId: event.value })} showClear /></div><div className="col-12 md:col-6 flex flex-column gap-1"><label htmlFor="review-priority">Prioritas</label><Dropdown inputId="review-priority" value={form.priority} options={priorities} onChange={(event) => setForm({ ...form, priority: event.value })} /></div></div>
      <div className="flex flex-column gap-1"><label htmlFor="review-tags">Tags</label><MultiSelect inputId="review-tags" value={form.tags} options={queue.tags.map((tag) => ({ label: tag.name, value: tag.name }))} onChange={(event) => setForm({ ...form, tags: event.value ?? [] })} display="chip" filter /></div>
      <div className="grid"><div className="col-12 md:col-6 flex flex-column gap-1"><label htmlFor="review-objective">Tujuan</label><InputTextarea id="review-objective" value={form.objective} onChange={(event) => setForm({ ...form, objective: event.target.value })} rows={3} /></div><div className="col-12 md:col-6 flex flex-column gap-1"><label htmlFor="review-preconditions">Prasyarat</label><InputTextarea id="review-preconditions" value={form.preconditions} onChange={(event) => setForm({ ...form, preconditions: event.target.value })} rows={3} /></div></div>
      <div className="grid"><div className="col-12 md:col-6 flex flex-column gap-1"><label htmlFor="review-steps">Langkah</label><InputTextarea id="review-steps" value={form.steps} onChange={(event) => setForm({ ...form, steps: event.target.value })} rows={6} /></div><div className="col-12 md:col-6 flex flex-column gap-1"><label htmlFor="review-expected">Hasil yang Diharapkan</label><InputTextarea id="review-expected" value={form.expectedResult} onChange={(event) => setForm({ ...form, expectedResult: event.target.value })} rows={6} /></div></div>
      <div className="flex flex-column gap-1"><label htmlFor="review-notes">Catatan</label><InputTextarea id="review-notes" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} rows={2} /></div>
      <div className="flex justify-content-end gap-2"><Button label="Batal" text onClick={() => setEditing(null)} /><Button label="Simpan Perubahan" icon="pi pi-save" loading={queue.saving} disabled={!form.title.trim() || !form.steps.trim() || !form.expectedResult.trim()} onClick={() => { void saveEdit(); }} /></div>
    </div></Dialog>
  </div>;
}
