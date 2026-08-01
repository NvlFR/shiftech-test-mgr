import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Tag } from 'primereact/tag';
import { Button } from 'primereact/button';
import { TabView, TabPanel } from 'primereact/tabview';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { IconField } from 'primereact/iconfield';
import { InputIcon } from 'primereact/inputicon';
import { Dropdown } from 'primereact/dropdown';
import { MultiSelect } from 'primereact/multiselect';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { Toast } from 'primereact/toast';
import { Message } from 'primereact/message';
import { BulkActionsBar } from '../../components/ui/BulkActionsBar';
import { ActivityPanel } from '../../components/ui/ActivityPanel';
import { TestPlanDialog } from '../../components/dialogs/TestPlanDialog';
import { useTestPlanDetail } from '../../hooks/useTestPlanDetail';
import { useTestRuns } from '../../hooks/useTestRuns';
import { testPlanService } from '../../services/testPlanService';
import { testCaseService } from '../../services/testCaseService';
import { testRunService } from '../../services/testRunService';
import { tagService } from '../../services/tagService';
import type { Tag as TagEntity, TestCase, TestCasePriority, TestPlan, TestPlanCaseWithDetails, TestPlanStatus, TestRun, TestRunStatus } from '../../types/domain';
import { PageHeader } from '../../components/ui/PageHeader';
import { Breadcrumb } from '../../components/ui/Breadcrumb';
import { projectService } from '../../services/projectService';
import { useProjectRole } from '../../hooks/useProjectRole';
import { useEnvironments } from '../../hooks/useEnvironments';
import { useModules } from '../../hooks/useModules';
import { formatDateTime } from '../../helpers/dateFormatter';
import {
  TEST_PLAN_STATUS_LABEL,
  TEST_PLAN_STATUS_SEVERITY,
  TEST_RUN_STATUS_LABEL,
  TEST_RUN_STATUS_SEVERITY,
  TEST_RESULT_STATUS_SEVERITY,
  TEST_CASE_PRIORITY_LABEL,
  TEST_CASE_PRIORITY_SEVERITY,
} from '../../helpers/statusLabels';
import type { TestRunWithSummary } from '../../hooks/useTestRuns';

const PRIORITY_OPTIONS: { label: string; value: TestCasePriority }[] = [
  { label: TEST_CASE_PRIORITY_LABEL.low, value: 'low' },
  { label: TEST_CASE_PRIORITY_LABEL.medium, value: 'medium' },
  { label: TEST_CASE_PRIORITY_LABEL.high, value: 'high' },
  { label: TEST_CASE_PRIORITY_LABEL.critical, value: 'critical' },
];

const TEST_RUN_STATUS_OPTIONS: { label: string; value: TestRunStatus }[] = (
  ['in_progress', 'completed'] as const
).map((v) => ({ label: TEST_RUN_STATUS_LABEL[v], value: v }));

const TEST_PLAN_STATUS_OPTIONS: { label: string; value: TestPlanStatus }[] = (
  ['draft', 'active', 'completed', 'archived'] as const
).map((v) => ({ label: TEST_PLAN_STATUS_LABEL[v], value: v }));

export function TestPlanDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useRef<Toast>(null);

  const [testPlan, setTestPlan] = useState<TestPlan | null>(null);
  const [projectName, setProjectName] = useState<string | null>(null);
  const { cases, loading: casesLoading, reload: reloadCases } = useTestPlanDetail(id ?? null);
  const { testRuns, loading: runsLoading, reload: reloadRuns } = useTestRuns(id ?? null);
  const { canEditContent, canDeleteContent, canRunTests } = useProjectRole(testPlan?.projectId);
  const { environments } = useEnvironments(testPlan?.projectId ?? null);
  const { modules } = useModules(testPlan?.projectId ?? null);

  // Source-new exposes plan metadata editing from the detail header. Keep the
  // existing local status action and add the same additive edit flow here.
  const [planDialogOpen, setPlanDialogOpen] = useState(false);
  const [planCode, setPlanCode] = useState('');
  const [planName, setPlanName] = useState('');
  const [planDescription, setPlanDescription] = useState('');
  const [planStatus, setPlanStatus] = useState<TestPlanStatus>('draft');
  const [planError, setPlanError] = useState<string | null>(null);
  const [planSaving, setPlanSaving] = useState(false);

  function openEditPlanDialog() {
    if (!testPlan) return;
    setPlanCode(testPlan.code);
    setPlanName(testPlan.name);
    setPlanDescription(testPlan.description ?? '');
    setPlanStatus(testPlan.status);
    setPlanError(null);
    setPlanDialogOpen(true);
  }

  async function handleSavePlanEdit() {
    if (!testPlan) return;
    setPlanError(null);
    setPlanSaving(true);
    try {
      const updated = await testPlanService.update(testPlan.id, {
        code: planCode,
        name: planName,
        description: planDescription,
      });
      setTestPlan({ ...updated, status: planStatus });
      if (planStatus !== updated.status) {
        const statusUpdated = planStatus === 'active'
          ? await testPlanService.approve(updated.id, true)
          : await testPlanService.changeStatus(updated.id, planStatus);
        setTestPlan(statusUpdated);
      }
      setPlanDialogOpen(false);
      toast.current?.show({ severity: 'success', summary: 'Test plan diperbarui' });
    } catch (err) {
      setPlanError(err instanceof Error ? err.message : 'Gagal menyimpan test plan');
    } finally {
      setPlanSaving(false);
    }
  }

  // --- Test Cases: search/filter ---
  const [caseSearch, setCaseSearch] = useState('');
  const [casePriorityFilter, setCasePriorityFilter] = useState<TestCasePriority | null>(null);
  const [caseModuleFilter, setCaseModuleFilter] = useState<string | null>(null);
  const [caseTagFilter, setCaseTagFilter] = useState<string | null>(null);
  const [selectedCases, setSelectedCases] = useState<TestPlanCaseWithDetails[]>([]);
  const [tags, setTags] = useState<TagEntity[]>([]);

  const filteredCases = useMemo(() => {
    const q = caseSearch.trim().toLowerCase();
    return cases.filter((c) => {
      if (casePriorityFilter && c.testCase.priority !== casePriorityFilter) return false;
      if (caseModuleFilter && c.testCase.module?.id !== caseModuleFilter) return false;
      if (caseTagFilter && !c.testCase.tags.some((t) => t.id === caseTagFilter)) return false;
      if (q && !c.testCase.title.toLowerCase().includes(q) && !c.testCase.code.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [cases, caseSearch, casePriorityFilter, caseModuleFilter, caseTagFilter]);

  // --- Test Runs: search/filter ---
  const [runSearch, setRunSearch] = useState('');
  const [runStatusFilter, setRunStatusFilter] = useState<TestRunStatus | null>(null);
  const [runTesterFilter, setRunTesterFilter] = useState<string | null>(null);
  const [runEnvironmentFilter, setRunEnvironmentFilter] = useState<string | null>(null);
  const [runBrowserFilter, setRunBrowserFilter] = useState('');
  const [runDeviceFilter, setRunDeviceFilter] = useState('');
  const [runBuildFilter, setRunBuildFilter] = useState('');
  const [runReleaseFilter, setRunReleaseFilter] = useState('');

  const filteredRuns = useMemo(() => {
    const q = runSearch.trim().toLowerCase();
    return testRuns.filter((r) => {
      if (runStatusFilter && r.status !== runStatusFilter) return false;
      if (runTesterFilter && !r.testers.some((tester) => tester.id === runTesterFilter)) return false;
      if (runEnvironmentFilter && r.environmentId !== runEnvironmentFilter) return false;
      if (runBrowserFilter.trim() && !(r.browser ?? '').toLowerCase().includes(runBrowserFilter.trim().toLowerCase())) return false;
      if (runDeviceFilter.trim() && !(r.device ?? '').toLowerCase().includes(runDeviceFilter.trim().toLowerCase())) return false;
      if (runBuildFilter.trim() && !(r.buildVersion ?? '').toLowerCase().includes(runBuildFilter.trim().toLowerCase())) return false;
      if (runReleaseFilter.trim() && !(r.release ?? '').toLowerCase().includes(runReleaseFilter.trim().toLowerCase())) return false;
      if (q && !r.name.toLowerCase().includes(q) && !r.code.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [testRuns, runSearch, runStatusFilter, runTesterFilter, runEnvironmentFilter, runBrowserFilter, runDeviceFilter, runBuildFilter, runReleaseFilter]);

  useEffect(() => {
    if (id) testPlanService.getById(id).then(setTestPlan);
  }, [id]);

  useEffect(() => {
    if (testPlan) projectService.getById(testPlan.projectId).then((p) => setProjectName(p?.name ?? null));
  }, [testPlan]);

  useEffect(() => {
    if (testPlan) {
      tagService.listByProject(testPlan.projectId).then(setTags);
    }
  }, [testPlan]);

  // --- Add test case to plan ---
  const [addCaseDialogOpen, setAddCaseDialogOpen] = useState(false);
  const [availableCases, setAvailableCases] = useState<TestCase[]>([]);
  const [selectedCaseIds, setSelectedCaseIds] = useState<string[]>([]);

  async function openAddCaseDialog() {
    if (!testPlan) return;
    const allCases = await testCaseService.listByProject(testPlan.projectId);
    const alreadyInPlan = new Set(cases.map((c) => c.testCaseId));
    setAvailableCases(allCases.filter((c) => c.status === 'active' && !alreadyInPlan.has(c.id)));
    setSelectedCaseIds([]);
    setAddCaseDialogOpen(true);
  }

  async function handleAddCases() {
    if (!id) return;
    await Promise.all(selectedCaseIds.map((testCaseId, index) => testPlanService.addCase(id, testCaseId, cases.length + index)));
    setAddCaseDialogOpen(false);
    await reloadCases();
    toast.current?.show({ severity: 'success', summary: 'Test case ditambahkan ke plan' });
  }

  function handleRemoveCase(row: TestPlanCaseWithDetails) {
    confirmDialog({
      header: 'Keluarkan Test Case',
      message: `Test case "${row.testCase.title}" akan dikeluarkan dari plan ini. Lanjutkan?`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Keluarkan',
      rejectLabel: 'Batal',
      acceptClassName: 'p-button-danger',
      accept: async () => {
        await testPlanService.removeCase(row.id);
        await reloadCases();
      },
    });
  }

  function handleBulkRemoveCases() {
    confirmDialog({
      header: 'Keluarkan Test Case Terpilih',
      message: `${selectedCases.length} test case akan dikeluarkan dari plan ini. Lanjutkan?`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Keluarkan',
      rejectLabel: 'Batal',
      acceptClassName: 'p-button-danger',
      accept: async () => {
        await Promise.all(selectedCases.map((row) => testPlanService.removeCase(row.id)));
        setSelectedCases([]);
        await reloadCases();
        toast.current?.show({ severity: 'success', summary: 'Test case terpilih dikeluarkan dari plan' });
      },
    });
  }

  // --- Test Run ---
  const [runDialogOpen, setRunDialogOpen] = useState(false);
  const [runName, setRunName] = useState('');
  const [runEnvironmentId, setRunEnvironmentId] = useState<string | null>(null);
  const [runBrowser, setRunBrowser] = useState('');
  const [runDevice, setRunDevice] = useState('');
  const [runBuildVersion, setRunBuildVersion] = useState('');
  const [runRelease, setRunRelease] = useState('');
  const [runError, setRunError] = useState<string | null>(null);

  function openStartRunDialog() {
    setRunName(`Run ${new Date().toLocaleDateString('id-ID')}`);
    setRunEnvironmentId(null);
    setRunBrowser('');
    setRunDevice('');
    setRunBuildVersion('');
    setRunRelease('');
    setRunError(null);
    setRunDialogOpen(true);
  }

  async function handleStartRun() {
    if (!id) return;
    setRunError(null);
    try {
      const run = await testRunService.start(id, runName, { environmentId: runEnvironmentId, browser: runBrowser, device: runDevice, buildVersion: runBuildVersion, release: runRelease });
      setRunDialogOpen(false);
      await reloadRuns();
      navigate(`/test-runs/${run.id}`);
    } catch (err) {
      setRunError(err instanceof Error ? err.message : 'Gagal memulai test run');
    }
  }

  async function handleChangeStatus(status: TestPlanStatus) {
    if (!testPlan || status === testPlan.status) return;
    const updated = status === 'active'
      ? await testPlanService.approve(testPlan.id, true)
      : await testPlanService.changeStatus(testPlan.id, status);
    setTestPlan(updated);
    toast.current?.show({ severity: 'success', summary: `Status diubah ke ${TEST_PLAN_STATUS_LABEL[status]}` });
  }

  function handleDeleteRun(row: TestRun) {
    confirmDialog({
      header: 'Hapus Test Run',
      message: `Test run "${row.name}" akan dihapus permanen, termasuk seluruh hasil eksekusinya. Lanjutkan?`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Hapus',
      rejectLabel: 'Batal',
      acceptClassName: 'p-button-danger',
      accept: async () => {
        await testRunService.remove(row.id);
        await reloadRuns();
        toast.current?.show({ severity: 'success', summary: 'Test run dihapus' });
      },
    });
  }

  return (
    <div>
      <Toast ref={toast} />
      <ConfirmDialog />

      <Breadcrumb
        items={[
          { label: 'Projects', path: '/' },
          { label: testPlan ? (projectName ?? '…') : '…', path: testPlan ? `/projects/${testPlan.projectId}` : undefined },
          { label: testPlan ? testPlan.code : '…' },
        ]}
      />

      <PageHeader
        title={testPlan ? `${testPlan.code} — ${testPlan.name}` : 'Detail Test Plan'}
        actions={
          testPlan && (
            canEditContent ? (
              <div className="flex align-items-center gap-2 flex-wrap">
                <Button icon="pi pi-pencil" text rounded severity="secondary" size="small" onClick={openEditPlanDialog} aria-label="Edit test plan" />
                <Dropdown
                  value={testPlan.status}
                  options={TEST_PLAN_STATUS_OPTIONS}
                  onChange={(e) => handleChangeStatus(e.value)}
                  className="w-10rem"
                />
              </div>
            ) : (
              <Tag value={TEST_PLAN_STATUS_LABEL[testPlan.status]} severity={TEST_PLAN_STATUS_SEVERITY[testPlan.status]} />
            )
          )
        }
      />

      {testPlan?.approvedAt && (
        <Message severity="success" text={`Disetujui secara eksplisit pada ${formatDateTime(testPlan.approvedAt)}.`} className="mb-3" />
      )}

      <TabView>
        <TabPanel header="Test Cases">
          <div className="flex justify-content-between align-items-center flex-wrap gap-2 mb-2">
            <div className="flex align-items-center gap-2 flex-wrap">
              <IconField iconPosition="left">
                <InputIcon className="pi pi-search" />
                <InputText value={caseSearch} onChange={(e) => setCaseSearch(e.target.value)} placeholder="Cari judul/kode..." />
              </IconField>
              <Dropdown
                value={casePriorityFilter}
                options={PRIORITY_OPTIONS}
                onChange={(e) => setCasePriorityFilter(e.value)}
                placeholder="Semua Prioritas"
                showClear
                className="w-10rem"
              />
              <Dropdown
                value={caseModuleFilter}
                options={modules.map((m) => ({ label: m.name, value: m.id }))}
                onChange={(e) => setCaseModuleFilter(e.value)}
                placeholder="Semua Module"
                showClear
                className="w-10rem"
              />
              <Dropdown
                value={caseTagFilter}
                options={tags.map((t) => ({ label: t.name, value: t.id }))}
                onChange={(e) => setCaseTagFilter(e.value)}
                placeholder="Semua Tag"
                showClear
                className="w-10rem"
              />
            </div>
            {canEditContent && (
              <Button label="Tambah Test Case" icon="pi pi-plus" size="small" onClick={openAddCaseDialog} />
            )}
          </div>
          {canEditContent && (
            <BulkActionsBar
              selectedCount={selectedCases.length}
              onClear={() => setSelectedCases([])}
              actions={<Button label="Keluarkan Terpilih" icon="pi pi-times" size="small" severity="danger" outlined onClick={handleBulkRemoveCases} />}
            />
          )}
          <DataTable
            value={filteredCases}
            loading={casesLoading}
            paginator
            rows={10}
            emptyMessage="Belum ada test case di plan ini"
            size="small"
            selection={selectedCases}
            onSelectionChange={(e: { value: TestPlanCaseWithDetails[] }) => setSelectedCases(e.value)}
            dataKey="id"
            selectionMode={canEditContent ? 'checkbox' : null}
          >
            {canEditContent && <Column selectionMode="multiple" style={{ width: '3rem' }} />}
            <Column
              field="testCase.code"
              header="Kode"
              sortable
              style={{ width: '7rem' }}
              body={(row: TestPlanCaseWithDetails) => (
                <a
                  className="entity-link"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/test-cases/${row.testCase.id}?projectId=${testPlan?.projectId}`);
                  }}
                >
                  {row.testCase.code}
                </a>
              )}
            />
            <Column field="testCase.title" header="Test Case" sortable />
            <Column field="testCase.module.name" header="Modul" sortable body={(row: TestPlanCaseWithDetails) => row.testCase.module?.name ?? '-'} />
            <Column
              header="Tag"
              body={(row: TestPlanCaseWithDetails) => (
                <div className="flex flex-wrap gap-1">
                  {row.testCase.tags.map((t) => (
                    <Tag key={t.id} value={t.name} severity="info" />
                  ))}
                </div>
              )}
            />
            <Column
              field="testCase.priority"
              header="Prioritas"
              sortable
              body={(row: TestPlanCaseWithDetails) => (
                <Tag value={TEST_CASE_PRIORITY_LABEL[row.testCase.priority]} severity={TEST_CASE_PRIORITY_SEVERITY[row.testCase.priority]} />
              )}
            />
            {canEditContent && (
              <Column
                header=""
                style={{ width: '4rem' }}
                body={(row: TestPlanCaseWithDetails) => (
                  <Button icon="pi pi-times" text rounded size="small" severity="danger" aria-label="Keluarkan" onClick={() => handleRemoveCase(row)} />
                )}
              />
            )}
          </DataTable>
        </TabPanel>

        <TabPanel header="Test Runs">
          <div className="flex justify-content-between align-items-center flex-wrap gap-2 mb-2">
            <div className="flex align-items-center gap-2 flex-wrap">
              <IconField iconPosition="left">
                <InputIcon className="pi pi-search" />
                <InputText value={runSearch} onChange={(e) => setRunSearch(e.target.value)} placeholder="Cari nama/kode..." />
              </IconField>
              <Dropdown
                value={runStatusFilter}
                options={TEST_RUN_STATUS_OPTIONS}
                onChange={(e) => setRunStatusFilter(e.value)}
                placeholder="Semua Status"
                showClear
                className="w-10rem"
              />
              <Dropdown value={runTesterFilter} options={testRuns.flatMap((run) => run.testers).filter((tester, index, all) => all.findIndex((item) => item.id === tester.id) === index).map((tester) => ({ label: tester.fullName ?? tester.id, value: tester.id }))} onChange={(e) => setRunTesterFilter(e.value)} placeholder="Semua Tester" showClear className="w-12rem" />
              <Dropdown value={runEnvironmentFilter} options={environments.map((environment) => ({ label: environment.name, value: environment.id }))} onChange={(e) => setRunEnvironmentFilter(e.value)} placeholder="Semua Environment" showClear className="w-13rem" />
              <InputText value={runBrowserFilter} onChange={(e) => setRunBrowserFilter(e.target.value)} placeholder="Browser" />
              <InputText value={runDeviceFilter} onChange={(e) => setRunDeviceFilter(e.target.value)} placeholder="Device" />
              <InputText value={runBuildFilter} onChange={(e) => setRunBuildFilter(e.target.value)} placeholder="Build version" />
              <InputText value={runReleaseFilter} onChange={(e) => setRunReleaseFilter(e.target.value)} placeholder="Release" />
            </div>
            {canRunTests && (
              <Button label="Mulai Test Run" icon="pi pi-play" size="small" onClick={openStartRunDialog} />
            )}
          </div>
          <DataTable
            value={filteredRuns}
            loading={runsLoading}
            paginator
            rows={10}
            emptyMessage="Belum ada test run"
            onRowClick={(e) => navigate(`/test-runs/${(e.data as TestRun).id}`)}
            rowHover
            className="cursor-pointer"
            size="small"
          >
            <Column field="code" header="Kode" style={{ width: '7rem' }} />
            <Column field="name" header="Nama Run" />
            <Column field="browser" header="Browser" />
            <Column field="device" header="Device" />
            <Column field="buildVersion" header="Build" />
            <Column field="release" header="Release" />
            <Column field="status" header="Status" body={(row: TestRun) => <Tag value={TEST_RUN_STATUS_LABEL[row.status]} severity={TEST_RUN_STATUS_SEVERITY[row.status]} />} />
            <Column
              header="Hasil"
              body={(row: TestRunWithSummary) => (
                <div className="flex gap-1 align-items-center">
                  <Tag value={String(row.pass)} severity={TEST_RESULT_STATUS_SEVERITY.pass} />
                  <Tag value={String(row.fail)} severity={TEST_RESULT_STATUS_SEVERITY.fail} />
                  <span className="text-color-secondary text-sm">/{row.total}</span>
                </div>
              )}
              sortable
              sortField="pass"
            />
            <Column
              header="Tester"
              body={(row: TestRunWithSummary) =>
                row.testers.length > 0
                  ? row.testers.map((t) => t.fullName ?? t.id).join(', ')
                  : '-'
              }
            />
            <Column field="completedAt" header="Selesai" body={(row: TestRun) => (row.completedAt ? formatDateTime(row.completedAt) : '-')} />
            {canDeleteContent && (
              <Column
                header=""
                style={{ width: '4rem' }}
                body={(row: TestRun) => (
                  <Button
                    icon="pi pi-trash"
                    text
                    rounded
                    size="small"
                    severity="danger"
                    aria-label="Hapus"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteRun(row);
                    }}
                  />
                )}
              />
            )}
          </DataTable>
        </TabPanel>

        <TabPanel header="Activity">
          {testPlan && <ActivityPanel projectId={testPlan.projectId} />}
        </TabPanel>
      </TabView>

      {/* --- Add Test Case Dialog --- */}
      <Dialog header="Tambah Test Case ke Plan" visible={addCaseDialogOpen} onHide={() => setAddCaseDialogOpen(false)} style={{ width: '30rem' }}>
        <div className="flex flex-column gap-3">
          <MultiSelect
            value={selectedCaseIds}
            options={availableCases.map((c) => ({ label: `${c.code} — ${c.title}`, value: c.id }))}
            onChange={(e) => setSelectedCaseIds(e.value)}
            placeholder="Pilih test case"
            filter
            display="chip"
            className="w-full"
          />
          <Button label="Tambahkan" size="small" onClick={handleAddCases} disabled={selectedCaseIds.length === 0} />
        </div>
      </Dialog>

      {/* --- Start Test Run Dialog --- */}
      <Dialog header="Mulai Test Run" visible={runDialogOpen} onHide={() => setRunDialogOpen(false)} style={{ width: '30rem' }}>
        <div className="flex flex-column gap-3">
          {runError && <small className="p-error">{runError}</small>}
          <div className="flex flex-column gap-1">
            <label htmlFor="run-name">Nama Test Run</label>
            <InputText id="run-name" value={runName} onChange={(e) => setRunName(e.target.value)} autoFocus />
          </div>
          <div className="flex flex-column gap-1">
            <label htmlFor="run-environment">Environment</label>
            <Dropdown id="run-environment" value={runEnvironmentId} options={environments.map((e) => ({ label: e.baseUrl ? `${e.name} — ${e.baseUrl}` : e.name, value: e.id }))} onChange={(e) => setRunEnvironmentId(e.value)} placeholder="Pilih environment" showClear className="w-full" />
          </div>
          <div className="flex flex-column gap-1">
            <label htmlFor="run-browser">Browser</label>
            <InputText id="run-browser" value={runBrowser} onChange={(e) => setRunBrowser(e.target.value)} placeholder="Chrome 128" />
          </div>
          <div className="flex flex-column gap-1">
            <label htmlFor="run-device">Device</label>
            <InputText id="run-device" value={runDevice} onChange={(e) => setRunDevice(e.target.value)} placeholder="Desktop / Android" />
          </div>
          <div className="flex gap-2">
            <div className="flex flex-column gap-1 flex-1"><label htmlFor="run-build-version">Build Version</label><InputText id="run-build-version" value={runBuildVersion} onChange={(e) => setRunBuildVersion(e.target.value)} /></div>
            <div className="flex flex-column gap-1 flex-1"><label htmlFor="run-release">Release</label><InputText id="run-release" value={runRelease} onChange={(e) => setRunRelease(e.target.value)} /></div>
          </div>
          <Button label="Mulai" size="small" onClick={handleStartRun} />
        </div>
      </Dialog>

      <TestPlanDialog visible={planDialogOpen} editing code={planCode} onCodeChange={setPlanCode} name={planName} onNameChange={setPlanName} description={planDescription} onDescriptionChange={setPlanDescription} status={planStatus} onStatusChange={setPlanStatus} error={planError} saving={planSaving} onHide={() => setPlanDialogOpen(false)} onSave={handleSavePlanEdit} />
    </div>
  );
}
