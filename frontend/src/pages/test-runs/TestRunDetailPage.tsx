import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Tag } from 'primereact/tag';
import { Button } from 'primereact/button';
import { ProgressBar } from 'primereact/progressbar';
import { Dropdown } from 'primereact/dropdown';
import { Dialog } from 'primereact/dialog';
import { InputTextarea } from 'primereact/inputtextarea';
import { InputText } from 'primereact/inputtext';
import { ConfirmDialog } from 'primereact/confirmdialog';
import { Toast } from 'primereact/toast';
import { useTestRunDetail } from '../../hooks/useTestRunDetail';
import { useIssuesByTestRun } from '../../hooks/useIssues';
import { useAuthContext } from '../../hooks/useAuth';
import { testRunService } from '../../services/testRunService';
import { profileService } from '../../services/profileService';
import { issueService } from '../../services/issueService';
import type { Profile, TestResultStatus, TestResultWithDetails } from '../../types/domain';
import { PageHeader } from '../../components/ui/PageHeader';
import { Breadcrumb } from '../../components/ui/Breadcrumb';
import { testPlanService } from '../../services/testPlanService';
import { projectService } from '../../services/projectService';
import { useProjectRole } from '../../hooks/useProjectRole';
import type { TestPlan } from '../../types/domain';
import { AttachmentPanel } from '../../components/ui/AttachmentPanel';
import {
  TEST_RESULT_STATUS_LABEL,
  TEST_RESULT_STATUS_SEVERITY,
  TEST_RUN_STATUS_LABEL,
  TEST_RUN_STATUS_SEVERITY,
  TEST_CASE_PRIORITY_LABEL,
  TEST_CASE_PRIORITY_SEVERITY,
} from '../../helpers/statusLabels';

const RESULT_OPTIONS: { label: string; value: TestResultStatus }[] = [
  { label: 'Pass', value: 'pass' },
  { label: 'Fail', value: 'fail' },
  { label: 'Skip', value: 'skip' },
  { label: 'Blocked', value: 'blocked' },
];

export function TestRunDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useRef<Toast>(null);
  const { profile: currentProfile } = useAuthContext();

  const { testRun, results, summary, loading, reload } = useTestRunDetail(id ?? null);
  const { issues: runIssues } = useIssuesByTestRun(id ?? null);
  const [approvedUsers, setApprovedUsers] = useState<Profile[]>([]);
  const [testPlan, setTestPlan] = useState<TestPlan | null>(null);
  const [projectName, setProjectName] = useState<string | null>(null);
  const { canRunTests, canManageIssues, canDeleteContent } = useProjectRole(testPlan?.projectId);

  const issueCountByResult = runIssues.reduce<Record<string, number>>((acc, issue) => {
    acc[issue.testResultId] = (acc[issue.testResultId] ?? 0) + 1;
    return acc;
  }, {});

  useEffect(() => {
    profileService.listAll().then((all) => setApprovedUsers(all.filter((p) => p.role === 'user' || p.role === 'admin')));
  }, []);

  useEffect(() => {
    if (testRun) testPlanService.getById(testRun.testPlanId).then(setTestPlan);
  }, [testRun]);

  useEffect(() => {
    if (testPlan) projectService.getById(testPlan.projectId).then((p) => setProjectName(p?.name ?? null));
  }, [testPlan]);

  // --- Record result dialog ---
  const [resultDialogOpen, setResultDialogOpen] = useState(false);
  const [activeResult, setActiveResult] = useState<TestResultWithDetails | null>(null);
  const [resultStatus, setResultStatus] = useState<TestResultStatus>('pass');
  const [resultTesterId, setResultTesterId] = useState<string | null>(null);
  const [resultNotes, setResultNotes] = useState('');
  const [selectedResults, setSelectedResults] = useState<TestResultWithDetails[]>([]);
  const [assignmentTesterId, setAssignmentTesterId] = useState<string | null>(null);

  async function handleAssignSelected() {
    if (!id || !assignmentTesterId || selectedResults.length === 0) return;
    await testRunService.assign(id, selectedResults.map((result) => result.testCaseId), assignmentTesterId);
    setSelectedResults([]);
    await reload();
    toast.current?.show({ severity: 'success', summary: 'Pembagian eksekusi diperbarui' });
  }

  function openResultDialog(row: TestResultWithDetails) {
    setActiveResult(row);
    setResultStatus(row.status === 'not_run' ? 'pass' : row.status);
    setResultTesterId(row.testerId ?? currentProfile?.id ?? null);
    setResultNotes(row.notes ?? '');
    setResultDialogOpen(true);
  }

  async function handleSaveResult() {
    if (!activeResult || !resultTesterId) return;
    await testRunService.recordResult(activeResult.id, resultTesterId, resultStatus, resultNotes.trim() || null);
    setResultDialogOpen(false);
    await reload();
    toast.current?.show({ severity: 'success', summary: 'Hasil tersimpan' });
  }

  // --- Create issue dialog (only relevant for FAIL results) ---
  const [issueDialogOpen, setIssueDialogOpen] = useState(false);
  const [issueTitle, setIssueTitle] = useState('');
  const [issueDescription, setIssueDescription] = useState('');
  const [issueActual, setIssueActual] = useState('');
  const [issueExpected, setIssueExpected] = useState('');
  const [issueError, setIssueError] = useState<string | null>(null);

  function openIssueDialog(row: TestResultWithDetails) {
    setActiveResult(row);
    setIssueTitle(`${row.testCase.title} gagal`);
    setIssueDescription('');
    setIssueActual('');
    setIssueExpected(row.testCase.expectedResult);
    setIssueError(null);
    setIssueDialogOpen(true);
  }

  async function handleCreateIssue() {
    if (!activeResult) return;
    setIssueError(null);
    try {
      await issueService.create({
        testResultId: activeResult.id,
        title: issueTitle,
        description: issueDescription,
        actualResult: issueActual,
        expectedResult: issueExpected,
      });
      setIssueDialogOpen(false);
      toast.current?.show({ severity: 'success', summary: 'Issue dibuat' });
      navigate(`/test-runs/${id}/issues`);
    } catch (err) {
      setIssueError(err instanceof Error ? err.message : 'Gagal membuat issue');
    }
  }

  // --- Complete run dialog ---
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
  const [completeNotes, setCompleteNotes] = useState('');

  function openCompleteDialog() {
    setCompleteNotes(testRun?.notes ?? '');
    setCompleteDialogOpen(true);
  }

  async function handleCompleteRun() {
    if (!id) return;
    await testRunService.complete(id, completeNotes.trim() || null);
    setCompleteDialogOpen(false);
    await reload();
    toast.current?.show({ severity: 'success', summary: 'Test run diselesaikan' });
  }

  async function handleReopenRun() {
    if (!id) return;
    await testRunService.reopen(id);
    await reload();
  }

  return (
    <div>
      <Toast ref={toast} />
      <ConfirmDialog />

      <Breadcrumb
        items={[
          { label: 'Projects', path: '/' },
          { label: testPlan ? (projectName ?? '…') : '…', path: testPlan ? `/projects/${testPlan.projectId}` : undefined },
          { label: testPlan ? testPlan.code : '…', path: testPlan ? `/test-plans/${testPlan.id}` : undefined },
          { label: testRun ? testRun.code : '…', path: testRun ? `/test-runs/${testRun.id}` : undefined },
        ]}
      />

      <PageHeader
        title={testRun ? `${testRun.code} — ${testRun.name}` : 'Test Run'}
        actions={
          canRunTests ? (
            testRun?.status === 'completed' ? (
              <Button label="Buka Kembali" icon="pi pi-replay" size="small" severity="secondary" outlined onClick={handleReopenRun} />
            ) : (
              <Button label="Selesaikan Run" icon="pi pi-check" size="small" onClick={openCompleteDialog} />
            )
          ) : undefined
        }
      />

      {testRun && (
        <div className="flex align-items-center flex-wrap gap-2 mb-3">
          <Tag value={TEST_RUN_STATUS_LABEL[testRun.status]} severity={TEST_RUN_STATUS_SEVERITY[testRun.status]} />
          <span className="text-color-secondary text-sm">
            {summary.pass} pass · {summary.fail} fail · {summary.skip} skip · {summary.blocked} blocked · {summary.notRun} belum dites
          </span>
          {testPlan && (
            <span className="text-color-secondary text-sm">
              · Test Plan:{' '}
              <a className="entity-link" onClick={() => navigate(`/test-plans/${testPlan.id}`)}>
                {testPlan.code} - {testPlan.name}
              </a>
            </span>
          )}
        </div>
      )}

      {testRun?.notes && (
        <div className="mb-3 p-3 surface-100 border-round">
          <div className="text-sm font-medium mb-1">Catatan Test Run</div>
          <div className="text-sm white-space-pre-line">{testRun.notes}</div>
        </div>
      )}

      <div className="mb-4">
        <div className="flex justify-content-between mb-1">
          <span>
            {summary.executed} / {summary.total} dieksekusi
          </span>
          <span>{summary.progressPercent}%</span>
        </div>
        <ProgressBar value={summary.progressPercent} showValue={false} />
      </div>

      {testRun && <AttachmentPanel kind="test_run" entityId={testRun.id} canUpload={canRunTests} canDelete={canDeleteContent} />}

      {canRunTests && (
        <div className="flex align-items-center gap-2 flex-wrap mb-2">
          <span className="text-sm text-color-secondary">Bagi test case terpilih:</span>
          <Dropdown value={assignmentTesterId} options={approvedUsers.map((u) => ({ label: u.fullName ?? u.email, value: u.id }))} onChange={(e) => setAssignmentTesterId(e.value)} placeholder="Pilih tester" showClear className="w-15rem" />
          <Button label="Tetapkan" icon="pi pi-users" size="small" onClick={handleAssignSelected} disabled={!assignmentTesterId || selectedResults.length === 0} />
        </div>
      )}

      <DataTable value={results} selection={selectedResults} onSelectionChange={(e) => setSelectedResults(e.value as TestResultWithDetails[])} selectionMode="multiple" loading={loading} paginator rows={10} emptyMessage="Belum ada test case" size="small">
        {canRunTests && <Column selectionMode="multiple" headerStyle={{ width: '3rem' }} />}
        <Column field="testCase.code" header="Kode" sortable style={{ width: '7rem' }} />
        <Column field="testCase.title" header="Test Case" sortable />
        <Column
          field="testCase.priority"
          header="Prioritas"
          sortable
          body={(row: TestResultWithDetails) => (
            <Tag value={TEST_CASE_PRIORITY_LABEL[row.testCase.priority]} severity={TEST_CASE_PRIORITY_SEVERITY[row.testCase.priority]} />
          )}
        />
        <Column field="status" header="Hasil" body={(row: TestResultWithDetails) => <Tag value={TEST_RESULT_STATUS_LABEL[row.status]} severity={TEST_RESULT_STATUS_SEVERITY[row.status]} />} sortable />
        <Column field="tester.fullName" header="Tester" body={(row: TestResultWithDetails) => row.tester?.fullName ?? row.tester?.email ?? '-'} />
        <Column field="notes" header="Catatan" />
        <Column
          header="Issue"
          style={{ width: '6rem' }}
          body={(row: TestResultWithDetails) => {
            const count = issueCountByResult[row.id] ?? 0;
            if (count === 0) return <span className="text-color-secondary text-sm">-</span>;
            return (
              <Button
                label={String(count)}
                icon="pi pi-flag"
                size="small"
                text
                severity="danger"
                onClick={() => navigate(`/test-runs/${id}/issues?testResultId=${row.id}`)}
              />
            );
          }}
        />
        {(canRunTests || canManageIssues) && (
          <Column
            header=""
            style={{ width: '9rem' }}
            body={(row: TestResultWithDetails) => (
              <div className="flex gap-1">
                {canRunTests && <Button label="Catat" icon="pi pi-pencil" size="small" text onClick={() => openResultDialog(row)} />}
                {canManageIssues && row.status === 'fail' && (
                  <Button icon="pi pi-flag" size="small" text severity="danger" aria-label="Buat Issue" onClick={() => openIssueDialog(row)} />
                )}
              </div>
            )}
          />
        )}
      </DataTable>

      {/* --- Record Result Dialog --- */}
      <Dialog header="Catat Hasil Eksekusi" visible={resultDialogOpen} onHide={() => setResultDialogOpen(false)} style={{ width: '28rem' }}>
        <div className="flex flex-column gap-3">
          <p className="m-0 font-medium">{activeResult?.testCase.title}</p>

          <div className="flex flex-column gap-1">
            <label htmlFor="result-status">Status</label>
            <Dropdown id="result-status" value={resultStatus} options={RESULT_OPTIONS} onChange={(e) => setResultStatus(e.value)} className="w-full" />
          </div>

          <div className="flex flex-column gap-1">
            <label htmlFor="result-tester">Tester</label>
            <Dropdown
              id="result-tester"
              value={resultTesterId}
              options={approvedUsers.map((u) => ({ label: u.fullName ?? u.email, value: u.id }))}
              onChange={(e) => setResultTesterId(e.value)}
              className="w-full"
            />
          </div>

          <div className="flex flex-column gap-1">
            <label htmlFor="result-notes">Catatan</label>
            <InputTextarea id="result-notes" value={resultNotes} onChange={(e) => setResultNotes(e.target.value)} rows={3} />
          </div>

          <Button label="Simpan" size="small" onClick={handleSaveResult} disabled={!resultTesterId} />
        </div>
      </Dialog>

      {/* --- Create Issue Dialog --- */}
      <Dialog header="Buat Issue" visible={issueDialogOpen} onHide={() => setIssueDialogOpen(false)} style={{ width: '32rem' }}>
        <div className="flex flex-column gap-3">
          {issueError && <small className="p-error">{issueError}</small>}
          <div className="flex flex-column gap-1">
            <label htmlFor="issue-title">Judul</label>
            <InputText id="issue-title" value={issueTitle} onChange={(e) => setIssueTitle(e.target.value)} autoFocus />
          </div>
          <div className="flex flex-column gap-1">
            <label htmlFor="issue-description">Deskripsi</label>
            <InputTextarea id="issue-description" value={issueDescription} onChange={(e) => setIssueDescription(e.target.value)} rows={2} />
          </div>
          <div className="flex flex-column gap-1">
            <label htmlFor="issue-actual">Hasil Aktual</label>
            <InputTextarea id="issue-actual" value={issueActual} onChange={(e) => setIssueActual(e.target.value)} rows={2} />
          </div>
          <div className="flex flex-column gap-1">
            <label htmlFor="issue-expected">Hasil yang Diharapkan</label>
            <InputTextarea id="issue-expected" value={issueExpected} onChange={(e) => setIssueExpected(e.target.value)} rows={2} />
          </div>
          <Button label="Buat Issue" size="small" onClick={handleCreateIssue} />
        </div>
      </Dialog>

      {/* --- Complete Run Dialog --- */}
      <Dialog header="Selesaikan Test Run" visible={completeDialogOpen} onHide={() => setCompleteDialogOpen(false)} style={{ width: '28rem' }}>
        <div className="flex flex-column gap-3">
          <p className="m-0 text-sm text-color-secondary">
            Test run ini akan ditandai selesai. Kamu masih bisa membuka kembali kapan saja.
          </p>
          <div className="flex flex-column gap-1">
            <label htmlFor="complete-notes">Catatan (opsional)</label>
            <InputTextarea
              id="complete-notes"
              value={completeNotes}
              onChange={(e) => setCompleteNotes(e.target.value)}
              rows={3}
              placeholder="Mis. blocker, catatan environment, tindak lanjut..."
              autoFocus
            />
          </div>
          <Button label="Selesaikan" icon="pi pi-check" size="small" onClick={handleCompleteRun} />
        </div>
      </Dialog>
    </div>
  );
}
