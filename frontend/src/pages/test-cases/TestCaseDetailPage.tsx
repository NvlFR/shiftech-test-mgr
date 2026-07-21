import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Card } from 'primereact/card';
import { Tag } from 'primereact/tag';
import { Button } from 'primereact/button';
import { Chip } from 'primereact/chip';
import { Chips } from 'primereact/chips';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { Dropdown } from 'primereact/dropdown';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { Toast } from 'primereact/toast';
import { Breadcrumb } from '../../components/ui/Breadcrumb';
import { testCaseService } from '../../services/testCaseService';
import { moduleService } from '../../services/moduleService';
import { useProjectRole } from '../../hooks/useProjectRole';
import type { Module, TestCasePriority, TestCaseWithDetails } from '../../types/domain';
import { formatDateTime } from '../../helpers/dateFormatter';
import {
  TEST_CASE_PRIORITY_LABEL,
  TEST_CASE_PRIORITY_SEVERITY,
  TEST_CASE_STATUS_LABEL,
  TEST_CASE_STATUS_SEVERITY,
} from '../../helpers/statusLabels';

const PRIORITY_OPTIONS: { label: string; value: TestCasePriority }[] = (
  ['low', 'medium', 'high', 'critical'] as const
).map((v) => ({ label: TEST_CASE_PRIORITY_LABEL[v], value: v }));

interface TestCaseDetail extends TestCaseWithDetails {
  project: { id: string; name: string };
}

export function TestCaseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const projectId = searchParams.get('projectId');
  const toast = useRef<Toast>(null);

  const [testCase, setTestCase] = useState<TestCaseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [modules, setModules] = useState<Module[]>([]);
  const { canEditContent, canDeleteContent } = useProjectRole(testCase?.project.id);

  async function reload() {
    if (!id) return;
    const result = await testCaseService.getByIdWithDetails(id);
    setTestCase(result as TestCaseDetail | null);
  }

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    testCaseService.getByIdWithDetails(id).then((result) => {
      setTestCase(result as TestCaseDetail | null);
      setLoading(false);
    });
  }, [id]);

  useEffect(() => {
    if (testCase?.project.id) moduleService.listByProject(testCase.project.id).then(setModules);
  }, [testCase?.project.id]);

  function handleBack() {
    if (projectId) {
      navigate(`/projects/${projectId}`);
    } else {
      navigate('/test-cases');
    }
  }

  // --- Edit dialog ---
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editCode, setEditCode] = useState('');
  const [editModuleId, setEditModuleId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editObjective, setEditObjective] = useState('');
  const [editPreconditions, setEditPreconditions] = useState('');
  const [editSteps, setEditSteps] = useState('');
  const [editExpectedResult, setEditExpectedResult] = useState('');
  const [editPriority, setEditPriority] = useState<TestCasePriority>('medium');
  const [editNotes, setEditNotes] = useState('');
  const [editTags, setEditTags] = useState<string[]>([]);
  const [editError, setEditError] = useState<string | null>(null);

  function openEditDialog() {
    if (!testCase) return;
    setEditCode(testCase.code);
    setEditModuleId(testCase.moduleId);
    setEditTitle(testCase.title);
    setEditObjective(testCase.objective ?? '');
    setEditPreconditions(testCase.preconditions ?? '');
    setEditSteps(testCase.steps);
    setEditExpectedResult(testCase.expectedResult);
    setEditPriority(testCase.priority);
    setEditNotes(testCase.notes ?? '');
    setEditTags(testCase.tags.map((t) => t.name));
    setEditError(null);
    setEditDialogOpen(true);
  }

  async function handleSaveEdit() {
    if (!testCase) return;
    setEditError(null);
    try {
      await testCaseService.update(
        testCase.id,
        testCase.project.id,
        {
          code: editCode,
          moduleId: editModuleId,
          title: editTitle,
          objective: editObjective.trim() || null,
          preconditions: editPreconditions.trim() || null,
          steps: editSteps,
          expectedResult: editExpectedResult,
          priority: editPriority,
          notes: editNotes.trim() || null,
        },
        editTags,
      );
      setEditDialogOpen(false);
      await reload();
      toast.current?.show({ severity: 'success', summary: 'Test case diperbarui' });
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Gagal menyimpan test case');
    }
  }

  function handleDelete() {
    if (!testCase) return;
    confirmDialog({
      header: 'Hapus Test Case',
      message: `Test case "${testCase.title}" akan dihapus permanen, termasuk seluruh riwayat hasil eksekusinya. Lanjutkan?`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Hapus',
      rejectLabel: 'Batal',
      acceptClassName: 'p-button-danger',
      accept: async () => {
        await testCaseService.remove(testCase.id);
        toast.current?.show({ severity: 'success', summary: 'Test case dihapus' });
        handleBack();
      },
    });
  }

  if (loading) return <p>Memuat...</p>;
  if (!testCase) return <p>Test case tidak ditemukan.</p>;

  const moduleOptions = modules.map((m) => ({ label: m.name, value: m.id }));

  return (
    <div>
      <Toast ref={toast} />
      <ConfirmDialog />

      <Breadcrumb
        items={[
          { label: 'Projects', path: '/' },
          { label: testCase.project.name, path: `/projects/${testCase.project.id}` },
          { label: `${testCase.code} — ${testCase.title}` },
        ]}
      />

      <div className="flex justify-content-between align-items-center mb-3">
        <div>
          <h2>Test Case Detail</h2>
        </div>
        <div className="flex gap-2">
          {canEditContent && <Button label="Edit" icon="pi pi-pencil" size="small" outlined onClick={openEditDialog} />}
          {canDeleteContent && <Button label="Hapus" icon="pi pi-trash" size="small" severity="danger" outlined onClick={handleDelete} />}
        </div>
      </div>

      <Card className="mb-3">
        <div className="flex align-items-start justify-content-between">
          <div className="flex align-items-center gap-2 mb-1">
            <h2 className="m-0">{testCase.code} — {testCase.title}</h2>
            <Tag value={TEST_CASE_PRIORITY_LABEL[testCase.priority]} severity={TEST_CASE_PRIORITY_SEVERITY[testCase.priority]} />
            <Tag value={TEST_CASE_STATUS_LABEL[testCase.status]} severity={TEST_CASE_STATUS_SEVERITY[testCase.status]} />
          </div>
        </div>

        <div className="grid mt-3">
          <div className="col-6 md:col-3">
            <label className="block text-color-secondary text-sm mb-1">Project</label>
            <p className="mt-0">{testCase.project.name}</p>
          </div>
          <div className="col-6 md:col-3">
            <label className="block text-color-secondary text-sm mb-1">Module</label>
            <p className="mt-0">{testCase.module?.name ?? '-'}</p>
          </div>
          <div className="col-6 md:col-3">
            <label className="block text-color-secondary text-sm mb-1">Dibuat</label>
            <p className="mt-0">{formatDateTime(testCase.createdAt)}</p>
          </div>
          <div className="col-6 md:col-3">
            <label className="block text-color-secondary text-sm mb-1">Update Terakhir</label>
            <p className="mt-0">{formatDateTime(testCase.updatedAt)}</p>
          </div>
        </div>

        {testCase.tags.length > 0 && (
          <div className="flex align-items-center gap-2 mt-2">
            {testCase.tags.map((t) => (
              <Chip key={t.id} label={t.name} />
            ))}
          </div>
        )}
      </Card>

      {testCase.objective && (
        <Card title="Tujuan" className="mb-3">
          <p className="m-0">{testCase.objective}</p>
        </Card>
      )}

      {testCase.preconditions && (
        <Card title="Prasyarat" className="mb-3">
          <p className="m-0" style={{ whiteSpace: 'pre-wrap' }}>{testCase.preconditions}</p>
        </Card>
      )}

      <Card title="Langkah Pengujian" className="mb-3">
        <p className="m-0" style={{ whiteSpace: 'pre-wrap' }}>{testCase.steps}</p>
      </Card>

      <Card title="Hasil yang Diharapkan" className="mb-3">
        <p className="m-0" style={{ whiteSpace: 'pre-wrap' }}>{testCase.expectedResult}</p>
      </Card>

      {testCase.notes && (
        <Card title="Catatan" className="mb-3">
          <p className="m-0" style={{ whiteSpace: 'pre-wrap' }}>{testCase.notes}</p>
        </Card>
      )}

      {/* --- Edit Dialog --- */}
      <Dialog header="Edit Test Case" visible={editDialogOpen} onHide={() => setEditDialogOpen(false)} style={{ width: '40rem' }}>
        <div className="flex flex-column gap-3">
          {editError && <small className="p-error">{editError}</small>}

          <div className="flex flex-column gap-1">
            <label htmlFor="edit-case-code">Kode</label>
            <InputText id="edit-case-code" value={editCode} onChange={(e) => setEditCode(e.target.value)} className="w-10rem" />
          </div>

          <div className="grid">
            <div className="col-12 md:col-6 flex flex-column gap-1">
              <label htmlFor="edit-case-module">Module</label>
              <Dropdown
                id="edit-case-module"
                value={editModuleId}
                options={moduleOptions}
                onChange={(e) => setEditModuleId(e.value)}
                showClear
                placeholder="Pilih module"
                className="w-full"
              />
            </div>
            <div className="col-12 md:col-6 flex flex-column gap-1">
              <label htmlFor="edit-case-priority">Prioritas</label>
              <Dropdown
                id="edit-case-priority"
                value={editPriority}
                options={PRIORITY_OPTIONS}
                onChange={(e) => setEditPriority(e.value)}
                className="w-full"
              />
            </div>
          </div>

          <div className="flex flex-column gap-1">
            <label htmlFor="edit-case-title">Judul</label>
            <InputText id="edit-case-title" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} autoFocus />
          </div>

          <div className="flex flex-column gap-1">
            <label htmlFor="edit-case-objective">Tujuan (opsional)</label>
            <InputText id="edit-case-objective" value={editObjective} onChange={(e) => setEditObjective(e.target.value)} />
          </div>

          <div className="flex flex-column gap-1">
            <label htmlFor="edit-case-preconditions">Prasyarat</label>
            <InputTextarea id="edit-case-preconditions" value={editPreconditions} onChange={(e) => setEditPreconditions(e.target.value)} rows={2} />
          </div>

          <div className="flex flex-column gap-1">
            <label htmlFor="edit-case-steps">Langkah Pengujian</label>
            <InputTextarea id="edit-case-steps" value={editSteps} onChange={(e) => setEditSteps(e.target.value)} rows={4} />
          </div>

          <div className="flex flex-column gap-1">
            <label htmlFor="edit-case-expected">Hasil yang Diharapkan</label>
            <InputTextarea id="edit-case-expected" value={editExpectedResult} onChange={(e) => setEditExpectedResult(e.target.value)} rows={3} />
          </div>

          <div className="flex flex-column gap-1">
            <label htmlFor="edit-case-tags">Tag</label>
            <Chips id="edit-case-tags" value={editTags} onChange={(e) => setEditTags(e.value ?? [])} placeholder="Ketik lalu Enter" />
          </div>

          <div className="flex flex-column gap-1">
            <label htmlFor="edit-case-notes">Catatan (opsional)</label>
            <InputTextarea id="edit-case-notes" value={editNotes} onChange={(e) => setEditNotes(e.target.value)} rows={2} />
          </div>

          <Button label="Simpan" size="small" onClick={handleSaveEdit} />
        </div>
      </Dialog>
    </div>
  );
}
