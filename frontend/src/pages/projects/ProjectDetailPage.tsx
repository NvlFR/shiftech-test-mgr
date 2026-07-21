import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card } from 'primereact/card';
import { Tag } from 'primereact/tag';
import { Button } from 'primereact/button';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { TabView, TabPanel } from 'primereact/tabview';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { Dropdown } from 'primereact/dropdown';
import { Chips } from 'primereact/chips';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { Toast } from 'primereact/toast';
import { projectService } from '../../services/projectService';
import { testPlanService } from '../../services/testPlanService';
import { testCaseService } from '../../services/testCaseService';
import { moduleService } from '../../services/moduleService';
import { tagService } from '../../services/tagService';
import type {
  Project,
  TestPlan,
  TestCase,
  TestCaseWithDetails,
  Module,
  Tag as TagEntity,
} from '../../types/domain';
import { formatDateTime } from '../../helpers/dateFormatter';
import {
  PROJECT_STATUS_LABEL,
  PROJECT_STATUS_SEVERITY,
  TEST_CASE_PRIORITY_LABEL,
  TEST_CASE_PRIORITY_SEVERITY,
  TEST_CASE_STATUS_LABEL,
  TEST_CASE_STATUS_SEVERITY,
  TEST_PLAN_STATUS_LABEL,
  TEST_PLAN_STATUS_SEVERITY,
} from '../../helpers/statusLabels';

const PRIORITY_OPTIONS: { label: string; value: TestCasePriority }[] = [
  { label: 'Rendah', value: 'low' },
  { label: 'Sedang', value: 'medium' },
  { label: 'Tinggi', value: 'high' },
  { label: 'Kritis', value: 'critical' },
];

export function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useRef<Toast>(null);

  const [project, setProject] = useState<Project | null>(null);
  const [testPlans, setTestPlans] = useState<TestPlan[]>([]);
  const [testCases, setTestCases] = useState<TestCaseWithDetails[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [tags, setTags] = useState<TagEntity[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadAll(showLoading = true) {
    if (!id) return;
    if (showLoading) setLoading(true);
    const [projectResult, plansResult, casesResult, modulesResult, tagsResult] = await Promise.all([
      projectService.getById(id),
      testPlanService.listByProject(id),
      testCaseService.listByProjectWithDetails(id),
      moduleService.listByProject(id),
      tagService.listByProject(id),
    ]);
    setProject(projectResult);
    setTestPlans(plansResult);
    setTestCases(casesResult);
    setModules(modulesResult);
    setTags(tagsResult);
    if (showLoading) setLoading(false);
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // --- Test Plan dialog ---
  const [planDialogOpen, setPlanDialogOpen] = useState(false);
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [planCode, setPlanCode] = useState('');
  const [planName, setPlanName] = useState('');
  const [planDescription, setPlanDescription] = useState('');
  const [planError, setPlanError] = useState<string | null>(null);

  function openCreatePlanDialog() {
    setEditingPlanId(null);
    setPlanCode('');
    setPlanName('');
    setPlanDescription('');
    setPlanError(null);
    setPlanDialogOpen(true);
  }

  function openEditPlanDialog(row: TestPlan) {
    setEditingPlanId(row.id);
    setPlanCode(row.code);
    setPlanName(row.name);
    setPlanDescription(row.description ?? '');
    setPlanError(null);
    setPlanDialogOpen(true);
  }

  async function handleSavePlan() {
    if (!id) return;
    setPlanError(null);
    try {
      if (editingPlanId) {
        await testPlanService.update(editingPlanId, { name: planName, description: planDescription, code: planCode });
      } else {
        await testPlanService.create({ projectId: id, name: planName, description: planDescription, code: planCode });
      }
      setPlanDialogOpen(false);
      await loadAll(false);
      toast.current?.show({ severity: 'success', summary: editingPlanId ? 'Test plan diperbarui' : 'Test plan dibuat' });
    } catch (err) {
      setPlanError(err instanceof Error ? err.message : 'Gagal menyimpan test plan');
    }
  }

  // --- Module dialog ---
  const [moduleDialogOpen, setModuleDialogOpen] = useState(false);
  const [editingModuleId, setEditingModuleId] = useState<string | null>(null);
  const [moduleCode, setModuleCode] = useState('');
  const [moduleName, setModuleName] = useState('');
  const [moduleError, setModuleError] = useState<string | null>(null);
  const moduleNameRef = useRef<HTMLInputElement>(null);
  const [moduleDialogSource, setModuleDialogSource] = useState<'modules' | 'case'>('modules');

  function openCreateModuleDialog() {
    setModuleDialogSource('modules');
    setEditingModuleId(null);
    setModuleCode('');
    setModuleName('');
    setModuleError(null);
    setModuleDialogOpen(true);
  }

  function openCreateModuleDialogFromCase() {
    setModuleDialogSource('case');
    setEditingModuleId(null);
    setModuleCode('');
    setModuleName('');
    setModuleError(null);
    setModuleDialogOpen(true);
  }

  function openEditModuleDialog(row: Module) {
    setModuleDialogSource('modules');
    setEditingModuleId(row.id);
    setModuleCode(row.code);
    setModuleName(row.name);
    setModuleError(null);
    setModuleDialogOpen(true);
  }

  async function handleSaveModule() {
    if (!id) return;
    setModuleError(null);
    try {
      if (editingModuleId) {
        await moduleService.update(editingModuleId, { name: moduleName, code: moduleCode });
      } else {
        const created = await moduleService.create({ projectId: id, name: moduleName, code: moduleCode });
        if (moduleDialogSource === 'case') {
          setCaseModuleId(created.id);
        }
      }
      setModuleDialogOpen(false);
      await loadAll(false);
      toast.current?.show({ severity: 'success', summary: editingModuleId ? 'Module diperbarui' : 'Module dibuat' });
    } catch (err) {
      setModuleError(err instanceof Error ? err.message : 'Gagal menyimpan module');
    }
  }

  function handleDeleteModule(row: Module) {
    confirmDialog({
      header: 'Hapus Module',
      message: `Module "${row.name}" akan dihapus. Test case yang memakai module ini akan menjadi tanpa module. Lanjutkan?`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Hapus',
      rejectLabel: 'Batal',
      acceptClassName: 'p-button-danger',
      accept: async () => {
        await moduleService.remove(row.id);
        await loadAll(false);
        toast.current?.show({ severity: 'success', summary: 'Module dihapus' });
      },
    });
  }

  // --- Tag dialog ---
  const [tagDialogOpen, setTagDialogOpen] = useState(false);
  const [editingTagId, setEditingTagId] = useState<string | null>(null);
  const [tagName, setTagName] = useState('');
  const [tagError, setTagError] = useState<string | null>(null);

  function openEditTagDialog(row: TagEntity) {
    setEditingTagId(row.id);
    setTagName(row.name);
    setTagError(null);
    setTagDialogOpen(true);
  }

  async function handleSaveTag() {
    if (!editingTagId) return;
    setTagError(null);
    try {
      await tagService.rename(editingTagId, tagName);
      setTagDialogOpen(false);
      await loadAll(false);
      toast.current?.show({ severity: 'success', summary: 'Tag diperbarui' });
    } catch (err) {
      setTagError(err instanceof Error ? err.message : 'Gagal menyimpan tag');
    }
  }

  function handleDeleteTag(row: TagEntity) {
    confirmDialog({
      header: 'Hapus Tag',
      message: `Tag "${row.name}" akan dihapus dan dilepas dari seluruh test case yang memakainya. Lanjutkan?`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Hapus',
      rejectLabel: 'Batal',
      acceptClassName: 'p-button-danger',
      accept: async () => {
        await tagService.remove(row.id);
        await loadAll(false);
        toast.current?.show({ severity: 'success', summary: 'Tag dihapus' });
      },
    });
  }

  // --- Test Case dialog ---
  const [caseDialogOpen, setCaseDialogOpen] = useState(false);
  const [editingCaseId, setEditingCaseId] = useState<string | null>(null);
  const [caseCode, setCaseCode] = useState('');
  const [caseModuleId, setCaseModuleId] = useState<string | null>(null);
  const [caseTitle, setCaseTitle] = useState('');
  const [caseObjective, setCaseObjective] = useState('');
  const [casePreconditions, setCasePreconditions] = useState('');
  const [caseSteps, setCaseSteps] = useState('');
  const [caseExpectedResult, setCaseExpectedResult] = useState('');
  const [casePriority, setCasePriority] = useState<TestCasePriority>('medium');
  const [caseNotes, setCaseNotes] = useState('');
  const [caseTags, setCaseTags] = useState<string[]>([]);
  const [caseError, setCaseError] = useState<string | null>(null);

  function openCreateCaseDialog() {
    setEditingCaseId(null);
    setCaseCode('');
    setCaseModuleId(null);
    setCaseTitle('');
    setCaseObjective('');
    setCasePreconditions('');
    setCaseSteps('');
    setCaseExpectedResult('');
    setCasePriority('medium');
    setCaseNotes('');
    setCaseTags([]);
    setCaseError(null);
    setCaseDialogOpen(true);
  }

  function openEditCaseDialog(row: TestCaseWithDetails) {
    setEditingCaseId(row.id);
    setCaseCode(row.code);
    setCaseModuleId(row.moduleId);
    setCaseTitle(row.title);
    setCaseObjective(row.objective ?? '');
    setCasePreconditions(row.preconditions ?? '');
    setCaseSteps(row.steps);
    setCaseExpectedResult(row.expectedResult);
    setCasePriority(row.priority);
    setCaseNotes(row.notes ?? '');
    setCaseTags(row.tags.map((t) => t.name));
    setCaseError(null);
    setCaseDialogOpen(true);
  }

  async function handleSaveCase() {
    if (!id) return;
    setCaseError(null);
    try {
      if (editingCaseId) {
        await testCaseService.update(
          editingCaseId,
          id,
          {
            code: caseCode,
            moduleId: caseModuleId,
            title: caseTitle,
            objective: caseObjective.trim() || null,
            preconditions: casePreconditions.trim() || null,
            steps: caseSteps,
            expectedResult: caseExpectedResult,
            priority: casePriority,
            notes: caseNotes.trim() || null,
          },
          caseTags,
        );
      } else {
        await testCaseService.create({
          projectId: id,
          moduleId: caseModuleId,
          code: caseCode,
          title: caseTitle,
          objective: caseObjective,
          preconditions: casePreconditions,
          steps: caseSteps,
          expectedResult: caseExpectedResult,
          priority: casePriority,
          notes: caseNotes,
          tagNames: caseTags,
        });
      }
      setCaseDialogOpen(false);
      await loadAll(false);
      toast.current?.show({ severity: 'success', summary: editingCaseId ? 'Test case diperbarui' : 'Test case dibuat' });
    } catch (err) {
      setCaseError(err instanceof Error ? err.message : 'Gagal menyimpan test case');
    }
  }

  function handleArchiveCase(row: TestCase) {
    confirmDialog({
      header: row.status === 'active' ? 'Arsipkan Test Case' : 'Aktifkan Kembali',
      message:
        row.status === 'active'
          ? `Test case "${row.title}" akan diarsipkan dan tidak muncul di pemilihan test plan baru. Lanjutkan?`
          : `Test case "${row.title}" akan diaktifkan kembali. Lanjutkan?`,
      icon: 'pi pi-info-circle',
      acceptLabel: row.status === 'active' ? 'Arsipkan' : 'Aktifkan',
      rejectLabel: 'Batal',
      accept: async () => {
        if (row.status === 'active') {
          await testCaseService.archive(row.id);
        } else {
          await testCaseService.reactivate(row.id);
        }
        await loadAll(false);
      },
    });
  }

  function handleDeleteCase(row: TestCase) {
    confirmDialog({
      header: 'Hapus Test Case',
      message: `Test case "${row.title}" akan dihapus permanen, termasuk seluruh riwayat hasil eksekusinya. Lanjutkan?`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Hapus',
      rejectLabel: 'Batal',
      acceptClassName: 'p-button-danger',
      accept: async () => {
        await testCaseService.remove(row.id);
        await loadAll(false);
        toast.current?.show({ severity: 'success', summary: 'Test case dihapus' });
      },
    });
  }

  function handleDeletePermanently() {
    if (!project) return;
    confirmDialog({
      header: 'Hapus Permanen',
      message: (
        <span>
          Project <strong>"{project.name}"</strong> beserta seluruh test plan dan test case di dalamnya akan{' '}
          <strong>dihapus permanen dan tidak bisa dikembalikan</strong>. Lanjutkan?
        </span>
      ),
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Hapus Permanen',
      rejectLabel: 'Batal',
      acceptClassName: 'p-button-danger',
      accept: async () => {
        await projectService.deletePermanently(project.id);
        toast.current?.show({ severity: 'success', summary: 'Project dihapus permanen' });
        navigate('/');
      },
    });
  }

  if (loading) return <p>Memuat...</p>;
  if (!project) return <p>Project tidak ditemukan.</p>;

  const moduleOptions = modules.map((m) => ({ label: m.name, value: m.id }));

  return (
    <div>
      <Toast ref={toast} />
      <ConfirmDialog />

      <Button label="Kembali" icon="pi pi-arrow-left" text onClick={() => navigate('/')} className="mb-3" />

      <Card className="mb-3">
        <div className="flex align-items-start justify-content-between">
          <div>
            <div className="flex align-items-center gap-2 mb-1">
              <h2 className="m-0">{project.name}</h2>
              <Tag value={PROJECT_STATUS_LABEL[project.status]} severity={PROJECT_STATUS_SEVERITY[project.status]} />
            </div>
            <p className="text-color-secondary m-0">{project.description || 'Tidak ada deskripsi'}</p>
          </div>
          <Button icon="pi pi-trash" label="Hapus Permanen" severity="danger" outlined size="small" onClick={handleDeletePermanently} />
        </div>

        <div className="grid mt-3">
          <div className="col-6 md:col-3">
            <label className="block text-color-secondary text-sm mb-1">Dibuat</label>
            <p className="mt-0">{formatDateTime(project.createdAt)}</p>
          </div>
          <div className="col-6 md:col-3">
            <label className="block text-color-secondary text-sm mb-1">Update Terakhir</label>
            <p className="mt-0">{formatDateTime(project.updatedAt)}</p>
          </div>
          <div className="col-6 md:col-3">
            <label className="block text-color-secondary text-sm mb-1">Jumlah Test Plan</label>
            <p className="mt-0">{testPlans.length}</p>
          </div>
          <div className="col-6 md:col-3">
            <label className="block text-color-secondary text-sm mb-1">Jumlah Test Case</label>
            <p className="mt-0">{testCases.length}</p>
          </div>
        </div>
      </Card>

      <Card>
        <TabView>
          <TabPanel header="Test Plans">
            <div className="flex justify-content-end mb-3">
              <Button label="Test Plan Baru" icon="pi pi-plus" size="small" onClick={openCreatePlanDialog} />
            </div>
            <DataTable value={testPlans} size="small" emptyMessage="Belum ada test plan" onRowClick={(e) => navigate(`/test-plans/${(e.data as TestPlan).id}`)} rowHover className="cursor-pointer">
              <Column field="code" header="Kode" style={{ width: '7rem' }} />
              <Column field="name" header="Nama" />
              <Column
                field="status"
                header="Status"
                body={(row: TestPlan) => <Tag value={TEST_PLAN_STATUS_LABEL[row.status]} severity={TEST_PLAN_STATUS_SEVERITY[row.status]} />}
              />
              <Column field="updatedAt" header="Update Terakhir" body={(row: TestPlan) => formatDateTime(row.updatedAt)} />
              <Column
                header="Aksi"
                style={{ width: '4rem' }}
                body={(row: TestPlan) => (
                  <Button
                    icon="pi pi-pencil"
                    text
                    rounded
                    size="small"
                    aria-label="Edit"
                    onClick={(e) => {
                      e.stopPropagation();
                      openEditPlanDialog(row);
                    }}
                  />
                )}
              />
            </DataTable>
          </TabPanel>

          <TabPanel header="Test Cases">
            <div className="flex justify-content-end mb-3">
              <Button label="Test Case Baru" icon="pi pi-plus" size="small" onClick={openCreateCaseDialog} />
            </div>
            <DataTable value={testCases} size="small" emptyMessage="Belum ada test case">
              <Column field="code" header="Kode" style={{ width: '7rem' }} />
              <Column field="title" header="Judul" />
              <Column field="module.name" header="Module" body={(row: TestCaseWithDetails) => row.module?.name ?? '-'} />
              <Column
                field="priority"
                header="Prioritas"
                body={(row: TestCaseWithDetails) => <Tag value={TEST_CASE_PRIORITY_LABEL[row.priority]} severity={TEST_CASE_PRIORITY_SEVERITY[row.priority]} />}
              />
              <Column
                field="status"
                header="Status"
                body={(row: TestCaseWithDetails) => (
                  <Tag value={TEST_CASE_STATUS_LABEL[row.status]} severity={TEST_CASE_STATUS_SEVERITY[row.status]} />
                )}
              />
              <Column
                field="tags"
                header="Tag"
                body={(row: TestCaseWithDetails) => (
                  <div className="flex flex-wrap gap-1">
                    {row.tags.map((t) => (
                      <Tag key={t.id} value={t.name} severity="info" />
                    ))}
                  </div>
                )}
              />
              <Column
                header="Aksi"
                style={{ width: '9rem' }}
                body={(row: TestCaseWithDetails) => (
                  <div className="flex gap-1">
                    <Button icon="pi pi-pencil" text rounded size="small" aria-label="Edit" onClick={() => openEditCaseDialog(row)} />
                    <Button
                      icon={row.status === 'active' ? 'pi pi-inbox' : 'pi pi-refresh'}
                      text
                      rounded
                      size="small"
                      aria-label={row.status === 'active' ? 'Arsipkan' : 'Aktifkan'}
                      onClick={() => handleArchiveCase(row)}
                    />
                    <Button icon="pi pi-trash" text rounded size="small" severity="danger" aria-label="Hapus" onClick={() => handleDeleteCase(row)} />
                  </div>
                )}
              />
            </DataTable>
          </TabPanel>

          <TabPanel header="Modules">
            <div className="flex justify-content-end mb-3">
              <Button label="Module Baru" icon="pi pi-plus" size="small" onClick={openCreateModuleDialog} />
            </div>
            <DataTable value={modules} size="small" emptyMessage="Belum ada module">
              <Column field="code" header="Kode" style={{ width: '7rem' }} />
              <Column field="name" header="Nama" />
              <Column
                header="Aksi"
                style={{ width: '6rem' }}
                body={(row: Module) => (
                  <div className="flex gap-1">
                    <Button icon="pi pi-pencil" text rounded size="small" aria-label="Edit" onClick={() => openEditModuleDialog(row)} />
                    <Button icon="pi pi-trash" text rounded size="small" severity="danger" aria-label="Hapus" onClick={() => handleDeleteModule(row)} />
                  </div>
                )}
              />
            </DataTable>
          </TabPanel>

          <TabPanel header="Tags">
            <p className="text-color-secondary text-sm mb-3">
              Tag baru otomatis dibuat saat diketik di form Test Case. Kelola tag yang sudah ada di sini.
            </p>
            <DataTable value={tags} size="small" emptyMessage="Belum ada tag">
              <Column field="name" header="Nama" />
              <Column
                header="Aksi"
                style={{ width: '6rem' }}
                body={(row: TagEntity) => (
                  <div className="flex gap-1">
                    <Button icon="pi pi-pencil" text rounded size="small" aria-label="Edit" onClick={() => openEditTagDialog(row)} />
                    <Button icon="pi pi-trash" text rounded size="small" severity="danger" aria-label="Hapus" onClick={() => handleDeleteTag(row)} />
                  </div>
                )}
              />
            </DataTable>
          </TabPanel>
        </TabView>
      </Card>

      {/* --- Test Plan Dialog --- */}
      <Dialog
        header={editingPlanId ? 'Edit Test Plan' : 'Test Plan Baru'}
        visible={planDialogOpen}
        onHide={() => setPlanDialogOpen(false)}
        style={{ width: '30rem' }}
      >
        <div className="flex flex-column gap-3">
          {planError && <small className="p-error">{planError}</small>}
          <div className="flex flex-column gap-1">
            <label htmlFor="plan-code">Kode</label>
            <InputText id="plan-code" value={planCode} onChange={(e) => setPlanCode(e.target.value)} placeholder="Otomatis jika dikosongkan" />
          </div>
          <div className="flex flex-column gap-1">
            <label htmlFor="plan-name">Nama</label>
            <InputText id="plan-name" value={planName} onChange={(e) => setPlanName(e.target.value)} autoFocus />
          </div>
          <div className="flex flex-column gap-1">
            <label htmlFor="plan-description">Deskripsi</label>
            <InputTextarea id="plan-description" value={planDescription} onChange={(e) => setPlanDescription(e.target.value)} rows={3} />
          </div>
          <Button label="Simpan" size="small" onClick={handleSavePlan} />
        </div>
      </Dialog>

      {/* --- Module Dialog --- */}
      <Dialog
        header={editingModuleId ? 'Edit Module' : 'Module Baru'}
        visible={moduleDialogOpen}
        onHide={() => setModuleDialogOpen(false)}
        onShow={() => moduleNameRef.current?.focus()}
        style={{ width: '25rem' }}
      >
        <div className="flex flex-column gap-3">
          {moduleError && <small className="p-error">{moduleError}</small>}
          <div className="flex flex-column gap-1">
            <label htmlFor="module-code">Kode</label>
            <InputText id="module-code" value={moduleCode} onChange={(e) => setModuleCode(e.target.value)} placeholder="Otomatis jika dikosongkan" />
          </div>
          <div className="flex flex-column gap-1">
            <label htmlFor="module-name">Nama Module</label>
            <InputText
              id="module-name"
              ref={moduleNameRef}
              value={moduleName}
              onChange={(e) => setModuleName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveModule();
              }}
              placeholder="mis. Autentikasi, Dashboard, Pembelian"
            />
          </div>
          <Button label="Simpan" size="small" onClick={handleSaveModule} />
        </div>
      </Dialog>

      {/* --- Test Case Dialog --- */}
      <Dialog
        header={editingCaseId ? 'Edit Test Case' : 'Test Case Baru'}
        visible={caseDialogOpen}
        onHide={() => setCaseDialogOpen(false)}
        style={{ width: '40rem' }}
      >
        <div className="flex flex-column gap-3">
          {caseError && <small className="p-error">{caseError}</small>}

          <div className="flex flex-column gap-1">
            <label htmlFor="case-code">Kode</label>
            <InputText id="case-code" value={caseCode} onChange={(e) => setCaseCode(e.target.value)} placeholder="Otomatis jika dikosongkan" className="w-10rem" />
          </div>

          <div className="grid">
            <div className="col-12 md:col-6 flex flex-column gap-1">
              <label htmlFor="case-module">Module</label>
              <div className="flex gap-1">
                <Dropdown
                  id="case-module"
                  value={caseModuleId}
                  options={moduleOptions}
                  onChange={(e) => setCaseModuleId(e.value)}
                  editable
                  placeholder="Pilih atau ketik module"
                  showClear
                  className="w-full"
                />
                <Button
                  icon="pi pi-plus"
                  type="button"
                  text
                  aria-label="Module Baru"
                  onClick={openCreateModuleDialogFromCase}
                />
              </div>
            </div>
            <div className="col-12 md:col-6 flex flex-column gap-1">
              <label htmlFor="case-priority">Prioritas</label>
              <Dropdown
                id="case-priority"
                value={casePriority}
                options={PRIORITY_OPTIONS}
                onChange={(e) => setCasePriority(e.value)}
                className="w-full"
              />
            </div>
          </div>

          <div className="flex flex-column gap-1">
            <label htmlFor="case-title">Judul</label>
            <InputText id="case-title" value={caseTitle} onChange={(e) => setCaseTitle(e.target.value)} autoFocus />
          </div>

          <div className="flex flex-column gap-1">
            <label htmlFor="case-objective">Tujuan (opsional)</label>
            <InputText id="case-objective" value={caseObjective} onChange={(e) => setCaseObjective(e.target.value)} />
          </div>

          <div className="flex flex-column gap-1">
            <label htmlFor="case-preconditions">Prasyarat</label>
            <InputTextarea id="case-preconditions" value={casePreconditions} onChange={(e) => setCasePreconditions(e.target.value)} rows={2} />
          </div>

          <div className="flex flex-column gap-1">
            <label htmlFor="case-steps">Langkah Pengujian</label>
            <InputTextarea id="case-steps" value={caseSteps} onChange={(e) => setCaseSteps(e.target.value)} rows={4} />
          </div>

          <div className="flex flex-column gap-1">
            <label htmlFor="case-expected">Hasil yang Diharapkan</label>
            <InputTextarea id="case-expected" value={caseExpectedResult} onChange={(e) => setCaseExpectedResult(e.target.value)} rows={3} />
          </div>

          <div className="flex flex-column gap-1">
            <label htmlFor="case-tags">Tag</label>
            <Chips id="case-tags" value={caseTags} onChange={(e) => setCaseTags(e.value ?? [])} placeholder="Ketik lalu Enter" />
          </div>

          <div className="flex flex-column gap-1">
            <label htmlFor="case-notes">Catatan (opsional)</label>
            <InputTextarea id="case-notes" value={caseNotes} onChange={(e) => setCaseNotes(e.target.value)} rows={2} />
          </div>

          <Button label="Simpan" size="small" onClick={handleSaveCase} />
        </div>
      </Dialog>

      {/* --- Tag Dialog --- */}
      <Dialog header="Edit Tag" visible={tagDialogOpen} onHide={() => setTagDialogOpen(false)} style={{ width: '25rem' }}>
        <div className="flex flex-column gap-3">
          {tagError && <small className="p-error">{tagError}</small>}
          <div className="flex flex-column gap-1">
            <label htmlFor="tag-name">Nama Tag</label>
            <InputText id="tag-name" value={tagName} onChange={(e) => setTagName(e.target.value)} autoFocus />
          </div>
          <Button label="Simpan" size="small" onClick={handleSaveTag} />
        </div>
      </Dialog>
    </div>
  );
}
