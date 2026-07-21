import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Tag } from 'primereact/tag';
import { Button } from 'primereact/button';
import { TabView, TabPanel } from 'primereact/tabview';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { MultiSelect } from 'primereact/multiselect';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { Toast } from 'primereact/toast';
import { useTestPlanDetail } from '../../hooks/useTestPlanDetail';
import { useTestRuns } from '../../hooks/useTestRuns';
import { testPlanService } from '../../services/testPlanService';
import { testCaseService } from '../../services/testCaseService';
import { testRunService } from '../../services/testRunService';
import type { TestCase, TestPlan, TestPlanCaseWithDetails, TestRun } from '../../types/domain';
import { PageHeader } from '../../components/ui/PageHeader';
import { Breadcrumb } from '../../components/ui/Breadcrumb';
import { projectService } from '../../services/projectService';
import { formatDateTime } from '../../helpers/dateFormatter';
import {
  TEST_RUN_STATUS_LABEL,
  TEST_RUN_STATUS_SEVERITY,
  TEST_RESULT_STATUS_SEVERITY,
} from '../../helpers/statusLabels';
import type { TestRunWithSummary } from '../../hooks/useTestRuns';

export function TestPlanDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useRef<Toast>(null);

  const [testPlan, setTestPlan] = useState<TestPlan | null>(null);
  const [projectName, setProjectName] = useState<string | null>(null);
  const { cases, loading: casesLoading, reload: reloadCases } = useTestPlanDetail(id ?? null);
  const { testRuns, loading: runsLoading, reload: reloadRuns } = useTestRuns(id ?? null);

  useEffect(() => {
    if (id) testPlanService.getById(id).then(setTestPlan);
  }, [id]);

  useEffect(() => {
    if (testPlan) projectService.getById(testPlan.projectId).then((p) => setProjectName(p?.name ?? null));
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

  // --- Test Run ---
  const [runDialogOpen, setRunDialogOpen] = useState(false);
  const [runName, setRunName] = useState('');
  const [runError, setRunError] = useState<string | null>(null);

  function openStartRunDialog() {
    setRunName(`Run ${new Date().toLocaleDateString('id-ID')}`);
    setRunError(null);
    setRunDialogOpen(true);
  }

  async function handleStartRun() {
    if (!id) return;
    setRunError(null);
    try {
      const run = await testRunService.start(id, runName);
      setRunDialogOpen(false);
      await reloadRuns();
      navigate(`/test-runs/${run.id}`);
    } catch (err) {
      setRunError(err instanceof Error ? err.message : 'Gagal memulai test run');
    }
  }

  return (
    <div>
      <Toast ref={toast} />
      <ConfirmDialog />

      {testPlan && (
        <Breadcrumb
          items={[
            { label: 'Projects', path: '/' },
            { label: projectName ?? '...', path: `/projects/${testPlan.projectId}` },
            { label: `${testPlan.code} — ${testPlan.name}` },
          ]}
        />
      )}

      <PageHeader title={testPlan ? `${testPlan.code} — ${testPlan.name}` : 'Detail Test Plan'} />

      <TabView>
        <TabPanel header="Test Cases">
          <div className="flex justify-content-end mb-3">
            <Button label="Tambah Test Case" icon="pi pi-plus" size="small" onClick={openAddCaseDialog} />
          </div>
          <DataTable value={cases} loading={casesLoading} paginator rows={10} emptyMessage="Belum ada test case di plan ini" size="small">
            <Column field="testCase.code" header="Kode" sortable style={{ width: '7rem' }} />
            <Column field="testCase.title" header="Test Case" sortable />
            <Column field="testCase.priority" header="Prioritas" sortable />
            <Column
              header="Aksi"
              style={{ width: '4rem' }}
              body={(row: TestPlanCaseWithDetails) => (
                <Button icon="pi pi-times" text rounded size="small" severity="danger" aria-label="Keluarkan" onClick={() => handleRemoveCase(row)} />
              )}
            />
          </DataTable>
        </TabPanel>

        <TabPanel header="Test Runs">
          <div className="flex justify-content-end mb-3">
            <Button label="Mulai Test Run" icon="pi pi-play" size="small" onClick={openStartRunDialog} />
          </div>
          <DataTable
            value={testRuns}
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
          </DataTable>
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
      <Dialog header="Mulai Test Run" visible={runDialogOpen} onHide={() => setRunDialogOpen(false)} style={{ width: '25rem' }}>
        <div className="flex flex-column gap-3">
          {runError && <small className="p-error">{runError}</small>}
          <div className="flex flex-column gap-1">
            <label htmlFor="run-name">Nama Test Run</label>
            <InputText id="run-name" value={runName} onChange={(e) => setRunName(e.target.value)} autoFocus />
          </div>
          <Button label="Mulai" size="small" onClick={handleStartRun} />
        </div>
      </Dialog>
    </div>
  );
}
