import { useEffect, useMemo, useState } from 'react';
import { Button } from 'primereact/button';
import { Card } from 'primereact/card';
import { Checkbox } from 'primereact/checkbox';
import { Dialog } from 'primereact/dialog';
import { Dropdown } from 'primereact/dropdown';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { Message } from 'primereact/message';
import { MultiSelect } from 'primereact/multiselect';
import { Tag } from 'primereact/tag';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { useAiTestCaseGenerator } from '../../hooks/useAiTestCaseGenerator';
import { toAiTestCaseSource } from '../../helpers/aiTestCaseParser';
import type { AiTestCaseCsvPreviewRow, AiTestCaseDraft } from '../../types/aiTestCase';
import type { Module, Tag as TagEntity, TestCaseWithDetails } from '../../types/domain';
import { TEST_CASE_PRIORITY_LABEL } from '../../helpers/statusLabels';

interface ReviewDraft extends AiTestCaseDraft {
  moduleId: string | null;
}

interface Props {
  visible: boolean;
  projectId: string;
  modules: Module[];
  tags: TagEntity[];
  existingTestCases: TestCaseWithDetails[];
  onHide: () => void;
  onSaved: () => Promise<void> | void;
}

const priorityOptions = (['low', 'medium', 'high', 'critical'] as const).map((value) => ({ value, label: TEST_CASE_PRIORITY_LABEL[value] }));
const maxCaseOptions = [5, 10, 20, 50].map((value) => ({ value, label: `${value} test case` }));

export function AiTestCaseGeneratorDialog({ visible, projectId, modules, tags, existingTestCases, onHide, onSaved }: Props) {
  const generator = useAiTestCaseGenerator();
  const { buildCsvPreview } = generator;
  const [requirement, setRequirement] = useState('');
  const [includeScenarios, setIncludeScenarios] = useState(true);
  const [includeEdgeCases, setIncludeEdgeCases] = useState(true);
  const [maxCases, setMaxCases] = useState(10);
  const [fileName, setFileName] = useState<string | null>(null);
  const [reviewDrafts, setReviewDrafts] = useState<ReviewDraft[]>([]);
  const [saveError, setSaveError] = useState<string | null>(null);
  const csvPreview = useMemo(() => buildCsvPreview(
    reviewDrafts.map((draft) => ({
      ...draft,
      moduleName: modules.find((module) => module.id === draft.moduleId)?.name ?? draft.module,
    })),
    existingTestCases,
  ), [buildCsvPreview, existingTestCases, modules, reviewDrafts]);

  useEffect(() => {
    if (generator.result) setReviewDrafts(generator.result.drafts.map((draft) => ({ ...draft, moduleId: null })));
  }, [generator.result]);

  function updateDraft(index: number, changes: Partial<ReviewDraft>) {
    setReviewDrafts((current) => current.map((draft, draftIndex) => draftIndex === index ? { ...draft, ...changes } : draft));
  }

  async function handleFileChange(file: File | undefined) {
    if (!file) return;
    try {
      await generator.setFileSource(file);
      setRequirement('');
      setFileName(file.name);
      setSaveError(null);
    } catch (reason) {
      setSaveError(reason instanceof Error ? reason.message : 'Dokumen tidak dapat dibaca.');
    }
  }

  async function handleGenerate() {
    try {
      const sourceOverride = requirement.trim() ? toAiTestCaseSource(requirement) : undefined;
      if (sourceOverride) generator.setTextSource(requirement);
      await generator.generate(projectId, { includeScenarios, includeEdgeCases, maxCases }, sourceOverride);
      setSaveError(null);
    } catch (reason) {
      setSaveError(reason instanceof Error ? reason.message : 'Gagal menghasilkan test case.');
    }
  }

  async function persistDrafts(acknowledgedDraftIndexes: Set<number>) {
    setSaveError(null);
    try {
      const batchId = crypto.randomUUID();
      for (const [index, draft] of reviewDrafts.entries()) {
        await generator.saveDraft(projectId, draft, draft.moduleId, batchId, acknowledgedDraftIndexes.has(index));
      }
      await onSaved();
      onHide();
    } catch (reason) {
      setSaveError(reason instanceof Error ? reason.message : 'Gagal menyimpan test case.');
    }
  }

  async function handleApprove() {
    if (csvPreview.invalidCount > 0) {
      setSaveError(`Perbaiki ${csvPreview.invalidCount} baris bermasalah sebelum mengimpor.`);
      return;
    }
    let duplicateResults;
    try {
      duplicateResults = await Promise.all(reviewDrafts.map((draft) => generator.detectDuplicates(projectId, draft)));
    } catch (reason) {
      setSaveError(reason instanceof Error ? reason.message : 'Gagal memeriksa duplikat test case.');
      return;
    }
    const warnings = duplicateResults.flat();
    if (warnings.length) {
      const acknowledgedDraftIndexes = new Set(duplicateResults.flatMap((duplicates, index) => duplicates.length ? [index] : []));
      confirmDialog({
        header: 'Kemungkinan duplikat',
        message: `${warnings.length} kemungkinan test case duplikat ditemukan. Tetap simpan sebagai test case baru?`,
        acceptLabel: 'Tetap Simpan',
        rejectLabel: 'Kembali Review',
        accept: () => { void persistDrafts(acknowledgedDraftIndexes); },
      });
      return;
    }
    void persistDrafts(new Set());
  }

  function downloadCsv() {
    const blob = new Blob([csvPreview.csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ai-test-case-draft-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function handleClose() {
    generator.reset();
    setReviewDrafts([]);
    setRequirement('');
    setFileName(null);
    setSaveError(null);
    onHide();
  }

  return (
    <>
      <ConfirmDialog />
      <Dialog header="Generate Test Case dengan AI" visible={visible} onHide={handleClose} style={{ width: 'min(72rem, 96vw)' }} modal>
        <div className="flex flex-column gap-3">
          <Message severity="info" text="Hasil AI selalu berupa draf. Review semua field sebelum menyetujui penyimpanan." />
          <div className="grid">
            <div className="col-12 md:col-8 flex flex-column gap-2">
              <label htmlFor="ai-requirement">Requirement atau deskripsi fitur</label>
              <InputTextarea id="ai-requirement" value={requirement} onChange={(event) => { setRequirement(event.target.value); setFileName(null); }} rows={7} placeholder="Contoh: pengguna dapat reset password melalui email..." />
              <div className="flex align-items-center gap-2 flex-wrap">
                <label htmlFor="ai-document" className="p-button p-button-outlined p-button-sm cursor-pointer">
                  <i className="pi pi-upload mr-2" />Upload Excel / Dokumen
                </label>
                <input id="ai-document" type="file" accept=".xlsx,.xls,.csv,.txt,.md,.json" className="hidden" onChange={(event) => { void handleFileChange(event.target.files?.[0]); }} />
                {fileName && <small className="text-color-secondary">{fileName}</small>}
              </div>
            </div>
            <div className="col-12 md:col-4 flex flex-column gap-3">
              <span className="font-medium">Opsi generasi</span>
              <div className="flex align-items-center gap-2"><Checkbox inputId="ai-scenarios" checked={includeScenarios} onChange={(event) => setIncludeScenarios(Boolean(event.checked))} /><label htmlFor="ai-scenarios">Skenario tambahan</label></div>
              <div className="flex align-items-center gap-2"><Checkbox inputId="ai-edge-cases" checked={includeEdgeCases} onChange={(event) => setIncludeEdgeCases(Boolean(event.checked))} /><label htmlFor="ai-edge-cases">Edge case</label></div>
              <Dropdown value={maxCases} options={maxCaseOptions} optionLabel="label" optionValue="value" onChange={(event) => setMaxCases(event.value)} aria-label="Jumlah maksimum test case" />
              <Button label="Generate Draf" icon="pi pi-sparkles" loading={generator.loading} onClick={() => { void handleGenerate(); }} disabled={!requirement.trim() && !generator.source} />
            </div>
          </div>

          {(generator.error || saveError) && <Message severity="error" text={generator.error ?? saveError ?? ''} />}
          {generator.result && <small className="text-color-secondary">Provider: {generator.result.provider}{generator.result.model ? ` · Model: ${generator.result.model}` : ''}</small>}

          {reviewDrafts.length > 0 && <div className="flex flex-column gap-2">
            <div className="flex align-items-center justify-content-between gap-2 flex-wrap">
              <div><h3 className="m-0">Preview CSV</h3><small className="text-color-secondary">Periksa seluruh baris sebelum mengunduh atau mengimpor.</small></div>
              <div className="flex gap-2">
                {csvPreview.invalidCount > 0 && <Tag value={`${csvPreview.invalidCount} error`} severity="danger" />}
                {csvPreview.warningCount > 0 && <Tag value={`${csvPreview.warningCount} peringatan`} severity="warning" />}
                {!csvPreview.invalidCount && !csvPreview.warningCount && <Tag value="Semua baris siap" severity="success" />}
              </div>
            </div>
            <DataTable value={csvPreview.rows} size="small" paginator rows={5} dataKey="rowNumber" scrollable scrollHeight="22rem" emptyMessage="Belum ada hasil AI" rowClassName={(row: AiTestCaseCsvPreviewRow) => row.status === 'invalid' ? 'surface-100 text-red-700' : row.status === 'warning' ? 'surface-100 text-yellow-700' : ''}>
              <Column field="rowNumber" header="Baris" style={{ width: '5rem' }} />
              <Column header="Status" style={{ width: '8rem' }} body={(row: AiTestCaseCsvPreviewRow) => <Tag value={row.status === 'invalid' ? 'Error' : row.status === 'warning' ? 'Peringatan' : 'Siap'} severity={row.status === 'invalid' ? 'danger' : row.status === 'warning' ? 'warning' : 'success'} />} />
              <Column field="moduleName" header="Module" />
              <Column header="Title" body={(row: AiTestCaseCsvPreviewRow) => row.draft.title || <span className="p-error">Kosong</span>} />
              <Column header="Priority" body={(row: AiTestCaseCsvPreviewRow) => TEST_CASE_PRIORITY_LABEL[row.draft.priority]} />
              <Column header="Tags" body={(row: AiTestCaseCsvPreviewRow) => row.draft.tags.join(', ') || '-'} />
              <Column header="requirement_ref" body={(row: AiTestCaseCsvPreviewRow) => row.draft.requirementRef || <span className="p-error">Kosong</span>} />
              <Column header="Masalah" body={(row: AiTestCaseCsvPreviewRow) => row.problems.length ? row.problems.join(' ') : '-'} style={{ minWidth: '18rem' }} />
            </DataTable>
          </div>}

          {reviewDrafts.map((draft, index) => {
            const duplicates = generator.findDuplicates(draft, existingTestCases);
            return (
              <Card key={`${index}-${draft.title}`} title={`Draf ${index + 1}`} className="surface-50">
                <div className="flex flex-column gap-3">
                  {duplicates.length > 0 && <Message severity="warn" text={`Kemungkinan duplikat: ${duplicates.map((item) => `${item.testCase.code} (${Math.round(item.confidence * 100)}%) — ${item.reason}`).join(' ')}`} />}
                  <div className="grid">
                    <div className="col-12 md:col-8 flex flex-column gap-1"><label htmlFor={`ai-title-${index}`}>Judul</label><InputText id={`ai-title-${index}`} value={draft.title} onChange={(event) => updateDraft(index, { title: event.target.value })} /></div>
                    <div className="col-12 md:col-4 flex flex-column gap-1"><label htmlFor={`ai-priority-${index}`}>Prioritas</label><Dropdown id={`ai-priority-${index}`} value={draft.priority} options={priorityOptions} optionLabel="label" optionValue="value" onChange={(event) => updateDraft(index, { priority: event.value })} /></div>
                    <div className="col-12 md:col-6 flex flex-column gap-1"><label htmlFor={`ai-module-${index}`}>Module</label><Dropdown id={`ai-module-${index}`} value={draft.moduleId} options={modules.map((module) => ({ label: module.name, value: module.id }))} onChange={(event) => updateDraft(index, { moduleId: event.value })} placeholder="Pilih module (opsional)" showClear /></div>
                    <div className="col-12 md:col-6 flex flex-column gap-1"><label htmlFor={`ai-tags-${index}`}>Tag</label><MultiSelect id={`ai-tags-${index}`} value={draft.tags} options={tags.map((tag) => ({ label: tag.name, value: tag.name }))} onChange={(event) => updateDraft(index, { tags: event.value ?? [] })} display="chip" filter placeholder="Pilih tag" /></div>
                  </div>
                  <div className="grid">
                    <div className="col-12 md:col-6 flex flex-column gap-1"><label htmlFor={`ai-objective-${index}`}>Tujuan</label><InputTextarea id={`ai-objective-${index}`} value={draft.objective} onChange={(event) => updateDraft(index, { objective: event.target.value })} rows={3} /></div>
                    <div className="col-12 md:col-6 flex flex-column gap-1"><label htmlFor={`ai-preconditions-${index}`}>Prasyarat</label><InputTextarea id={`ai-preconditions-${index}`} value={draft.preconditions} onChange={(event) => updateDraft(index, { preconditions: event.target.value })} rows={3} /></div>
                    <div className="col-12 md:col-6 flex flex-column gap-1"><label htmlFor={`ai-steps-${index}`}>Langkah Pengujian</label><InputTextarea id={`ai-steps-${index}`} value={draft.steps} onChange={(event) => updateDraft(index, { steps: event.target.value })} rows={5} /></div>
                    <div className="col-12 md:col-6 flex flex-column gap-1"><label htmlFor={`ai-expected-${index}`}>Hasil yang Diharapkan</label><InputTextarea id={`ai-expected-${index}`} value={draft.expectedResult} onChange={(event) => updateDraft(index, { expectedResult: event.target.value })} rows={5} /></div>
                  </div>
                  <div className="grid">
                    <div className="col-12 md:col-6"><span className="font-medium block mb-2">Skenario</span><div className="flex flex-wrap gap-2">{draft.scenarios.length ? draft.scenarios.map((item) => <Tag key={item} value={item} severity="info" />) : <small className="text-color-secondary">Tidak ada skenario tambahan.</small>}</div></div>
                    <div className="col-12 md:col-6"><span className="font-medium block mb-2">Edge case</span><div className="flex flex-wrap gap-2">{draft.edgeCases.length ? draft.edgeCases.map((item) => <Tag key={item} value={item} severity="warning" />) : <small className="text-color-secondary">Tidak ada edge case tambahan.</small>}</div></div>
                  </div>
                  <div className="flex flex-column gap-1"><label htmlFor={`ai-notes-${index}`}>Catatan</label><InputTextarea id={`ai-notes-${index}`} value={draft.notes} onChange={(event) => updateDraft(index, { notes: event.target.value })} rows={2} /></div>
                </div>
              </Card>
            );
          })}

          <div className="flex justify-content-end gap-2">
            <Button label="Batal" text onClick={handleClose} />
            <Button label="Unduh CSV" icon="pi pi-download" outlined disabled={!reviewDrafts.length} onClick={downloadCsv} />
            <Button label="Simpan sebagai Draf" icon="pi pi-upload" loading={generator.saving} disabled={!reviewDrafts.length || csvPreview.invalidCount > 0} onClick={() => { void handleApprove(); }} />
          </div>
        </div>
      </Dialog>
    </>
  );
}
