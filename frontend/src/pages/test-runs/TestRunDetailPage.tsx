import { useEffect, useMemo, useRef, useState } from 'react';
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
import { testResultStepService } from '../../services/testResultStepService';
import type { Profile, TestResultStep, TestResultStepStatus, TestResultStatus, TestResultWithDetails } from '../../types/domain';
import { PageHeader } from '../../components/ui/PageHeader';
import { Breadcrumb } from '../../components/ui/Breadcrumb';
import { testPlanService } from '../../services/testPlanService';
import { projectService } from '../../services/projectService';
import { useProjectRole } from '../../hooks/useProjectRole';
import { useTestRunAnalysis } from '../../hooks/useTestRunAnalysis';
import type { TestPlan } from '../../types/domain';
import { AttachmentPanel } from '../../components/ui/AttachmentPanel';
import { ActivityPanel } from '../../components/ui/ActivityPanel';
import { TestRunAnalysisPanel } from '../../components/test-runs/TestRunAnalysisPanel';
import { AiIssueDraftDialog } from '../../components/ai/AiIssueDraftDialog';
import { IssueDialog } from '../../components/dialogs/IssueDialog';
import { useScreenSize } from '../../hooks/useScreenSize';
import { dataTablePaginatorProps } from '../../components/ui/dataTablePaginator';
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
const STEP_RESULT_OPTIONS: { label: string; value: TestResultStepStatus }[] = [
  { label: 'Belum diuji', value: 'not_run' },
  { label: 'Pass', value: 'pass' },
  { label: 'Fail', value: 'fail' },
];
const RESULT_FILTER_OPTIONS = [{ label: 'Semua hasil', value: 'all' as const }, ...RESULT_OPTIONS, { label: 'Belum dites', value: 'not_run' as const }];

export function TestRunDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useRef<Toast>(null);
  const { lt } = useScreenSize();
  const isMobile = lt.sm;
  const { profile: currentProfile } = useAuthContext();

  const { testRun, repositoryTraceability, results, summary, loading, reload } = useTestRunDetail(id ?? null);
  const { issues: runIssues } = useIssuesByTestRun(id ?? null);
  const [approvedUsers, setApprovedUsers] = useState<Profile[]>([]);
  const [testPlan, setTestPlan] = useState<TestPlan | null>(null);
  const [projectName, setProjectName] = useState<string | null>(null);
  const { canRunTests, canManageIssues, canDeleteContent } = useProjectRole(testPlan?.projectId ?? testRun?.projectId ?? undefined);
  const { analysis, loading: analysisLoading, error: analysisError, analyze: analyzeTestRun } = useTestRunAnalysis(testPlan?.projectId ?? null, id ?? null);

  const issueCountByResult = runIssues.reduce<Record<string, number>>((acc, issue) => {
    acc[issue.testResultId] = (acc[issue.testResultId] ?? 0) + 1;
    return acc;
  }, {});

  useEffect(() => {
    profileService.listAll().then((all) => setApprovedUsers(all.filter((p) => p.role === 'user' || p.role === 'admin')));
  }, []);

  useEffect(() => {
    if (!testRun) return;
    if (testRun.testPlanId) testPlanService.getById(testRun.testPlanId).then(setTestPlan);
    else setTestPlan(null);
  }, [testRun]);

  useEffect(() => {
    const projectId = testPlan?.projectId ?? testRun?.projectId;
    if (projectId) projectService.getById(projectId).then((p) => setProjectName(p?.name ?? null));
  }, [testPlan, testRun]);

  // --- Record result dialog ---
  const [resultDialogOpen, setResultDialogOpen] = useState(false);
  const [activeResult, setActiveResult] = useState<TestResultWithDetails | null>(null);
  const [resultStatus, setResultStatus] = useState<TestResultStatus>('pass');
  const [resultTesterId, setResultTesterId] = useState<string | null>(null);
  const [resultNotes, setResultNotes] = useState('');
  const [resultSteps, setResultSteps] = useState<TestResultStep[]>([]);
  const [selectedResults, setSelectedResults] = useState<TestResultWithDetails[]>([]);
  const [assignmentTesterId, setAssignmentTesterId] = useState<string | null>(null);
  const [resultFilter, setResultFilter] = useState<'all' | TestResultStatus>('all');
  const [resultSearch, setResultSearch] = useState('');

  const visibleResults = useMemo(() => {
    const query = resultSearch.trim().toLowerCase();
    return results.filter((result) => {
      const matchesStatus = resultFilter === 'all' || result.status === resultFilter;
      const matchesSearch = !query || [result.testCase.code, result.testCase.title, result.tester?.fullName, result.tester?.email]
        .filter(Boolean)
        .some((value) => value?.toLowerCase().includes(query));
      return matchesStatus && matchesSearch;
    });
  }, [results, resultFilter, resultSearch]);

  async function handleAssignSelected() {
    if (!id || !assignmentTesterId || selectedResults.length === 0) return;
    await testRunService.assign(id, selectedResults.map((result) => result.testCaseId), assignmentTesterId);
    setSelectedResults([]);
    await reload();
    toast.current?.show({ severity: 'success', summary: 'Pembagian eksekusi diperbarui' });
  }

  async function openResultDialog(row: TestResultWithDetails) {
    setActiveResult(row);
    setResultStatus(row.status === 'not_run' ? 'pass' : row.status);
    setResultTesterId(row.testerId ?? currentProfile?.id ?? null);
    setResultNotes(row.notes ?? '');
    setResultSteps(await testResultStepService.list(row.id));
    setResultDialogOpen(true);
  }

  async function handleSaveResult() {
    if (!activeResult || !resultTesterId) return;
    await testRunService.recordResult(activeResult.id, resultTesterId, resultStatus, resultNotes.trim() || null);
    await Promise.all(resultSteps.map((step) => testResultStepService.update(step.id, step.status, step.notes)));
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
  const [issueSaving, setIssueSaving] = useState(false);
  const [aiIssueDialogOpen, setAiIssueDialogOpen] = useState(false);
  const [aiIssueResult, setAiIssueResult] = useState<TestResultWithDetails | null>(null);

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
    setIssueSaving(true);
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
    } finally {
      setIssueSaving(false);
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
          { label: testPlan ? testPlan.code : (testRun?.isCustom ? 'Custom Run' : '…'), path: testPlan ? `/test-plans/${testPlan.id}` : undefined },
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

      {repositoryTraceability && (
        <div className="mb-3 p-3 surface-100 border-round flex align-items-center flex-wrap gap-3 text-sm">
          <span className="font-medium"><i className="pi pi-code mr-2" />{repositoryTraceability.repository?.name ?? '-'}</span>
          <span><i className="pi pi-code-branch mr-2" />{repositoryTraceability.branch ?? '-'}</span>
          <span title={repositoryTraceability.commitSha ?? undefined}>
            <i className="pi pi-hashtag mr-2" />
            {repositoryTraceability.commitSha?.slice(0, 12) ?? '-'}
          </span>
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

      {testRun && testPlan && (
        <TestRunAnalysisPanel
          summary={summary}
          analysis={analysis}
          loading={analysisLoading}
          error={analysisError}
          canAnalyze
          onAnalyze={analyzeTestRun}
        />
      )}

      {testRun && <AttachmentPanel kind="test_run" entityId={testRun.id} canUpload={canRunTests} canDelete={canDeleteContent} />}

      {testRun?.projectId && <ActivityPanel projectId={testRun.projectId} />}

      <div className="flex align-items-center gap-2 flex-wrap mb-3">
        <Button label="Hasil Eksekusi" icon="pi pi-list" size="small" outlined />
        <Button label={`Issues (${runIssues.length})`} icon="pi pi-flag" size="small" text onClick={() => navigate(`/test-runs/${id}/issues`)} />
      </div>

      <div className="flex align-items-center gap-2 flex-wrap mb-2">
        <InputText value={resultSearch} onChange={(e) => setResultSearch(e.target.value)} placeholder="Cari kode atau test case..." className="w-full md:w-20rem" />
        <Dropdown value={resultFilter} options={RESULT_FILTER_OPTIONS} onChange={(e) => setResultFilter(e.value)} className="w-full md:w-14rem" />
        {(resultFilter !== 'all' || resultSearch) && <Button label="Reset" icon="pi pi-times" size="small" text onClick={() => { setResultFilter('all'); setResultSearch(''); }} />}
      </div>

      {canRunTests && (
        <div className="flex align-items-center gap-2 flex-wrap mb-2">
          <span className="text-sm text-color-secondary">Bagi test case terpilih:</span>
          <Dropdown value={assignmentTesterId} options={approvedUsers.map((u) => ({ label: u.fullName ?? u.email, value: u.id }))} onChange={(e) => setAssignmentTesterId(e.value)} placeholder="Pilih tester" showClear className="w-15rem" />
          <Button label="Tetapkan" icon="pi pi-users" size="small" onClick={handleAssignSelected} disabled={!assignmentTesterId || selectedResults.length === 0} />
        </div>
      )}

      <DataTable value={visibleResults} selection={selectedResults} onSelectionChange={(e) => setSelectedResults(e.value as TestResultWithDetails[])} selectionMode="multiple" loading={loading} {...dataTablePaginatorProps} rows={10} rowsPerPageOptions={[5, 10, 25, 50]} emptyMessage="Tidak ada hasil yang sesuai filter" size="small" responsiveLayout="scroll">
        {canRunTests && <Column selectionMode="multiple" headerStyle={{ width: '3rem' }} />}
        {isMobile && <Column body={(row: TestResultWithDetails) => <div className="flex flex-column gap-2 py-1"><span className="font-bold">{row.testCase.code}</span><span>{row.testCase.title}</span><div className="flex gap-2 flex-wrap"><Tag value={TEST_CASE_PRIORITY_LABEL[row.testCase.priority]} severity={TEST_CASE_PRIORITY_SEVERITY[row.testCase.priority]} /><Tag value={TEST_RESULT_STATUS_LABEL[row.status]} severity={TEST_RESULT_STATUS_SEVERITY[row.status]} /></div><span className="text-sm text-color-secondary">Tester: {row.tester?.fullName ?? row.tester?.email ?? '-'}</span>{row.notes && <span className="text-sm text-color-secondary">{row.notes}</span>}</div>} />}
        {!isMobile && <Column field="testCase.code" header="Kode" sortable style={{ width: '7rem' }} />}
        {!isMobile && <Column field="testCase.title" header="Test Case" sortable />}
        {!isMobile && <Column
          field="testCase.priority"
          header="Prioritas"
          sortable
          body={(row: TestResultWithDetails) => (
            <Tag value={TEST_CASE_PRIORITY_LABEL[row.testCase.priority]} severity={TEST_CASE_PRIORITY_SEVERITY[row.testCase.priority]} />
          )}
        />}
        {!isMobile && <Column field="status" header="Hasil" body={(row: TestResultWithDetails) => <Tag value={TEST_RESULT_STATUS_LABEL[row.status]} severity={TEST_RESULT_STATUS_SEVERITY[row.status]} />} sortable />}
        {!isMobile && <Column field="tester.fullName" header="Tester" body={(row: TestResultWithDetails) => row.tester?.fullName ?? row.tester?.email ?? '-'} />}
        {!isMobile && <Column field="notes" header="Catatan" />}
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
                {canRunTests && testRun?.status !== 'completed' && <Button label="Catat" icon="pi pi-pencil" size="small" text onClick={() => openResultDialog(row)} />}
                {canManageIssues && row.status === 'fail' && (
                  <>
                    <Button icon="pi pi-flag" size="small" text severity="danger" aria-label="Buat Issue" onClick={() => openIssueDialog(row)} />
                    <Button icon="pi pi-sparkles" size="small" text severity="help" aria-label="Buat draft Issue dengan AI" onClick={() => { setAiIssueResult(row); setAiIssueDialogOpen(true); }} />
                  </>
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

          {resultSteps.length > 0 && <div className="flex flex-column gap-2">
            <label>Checklist Structured Steps</label>
            {resultSteps.map((step) => <div key={step.id} className="border-1 surface-border border-round p-2">
              <div className="flex align-items-start justify-content-between gap-2">
                <div className="flex-1"><span className="font-medium">{step.stepNumber}. {step.action}</span>{step.expectedResult && <small className="block text-color-secondary mt-1">Expected: {step.expectedResult}</small>}</div>
                <Dropdown value={step.status} options={STEP_RESULT_OPTIONS} onChange={(e) => setResultSteps((current) => current.map((item) => item.id === step.id ? { ...item, status: e.value } : item))} className="w-9rem" />
              </div>
            </div>)}
          </div>}

          <Button label="Simpan" size="small" onClick={handleSaveResult} disabled={!resultTesterId} />
        </div>
      </Dialog>

      <IssueDialog visible={issueDialogOpen} title={issueTitle} description={issueDescription} actualResult={issueActual} expectedResult={issueExpected} error={issueError} saving={issueSaving} onTitleChange={setIssueTitle} onDescriptionChange={setIssueDescription} onActualResultChange={setIssueActual} onExpectedResultChange={setIssueExpected} onHide={() => setIssueDialogOpen(false)} onSave={handleCreateIssue} />

      {testPlan && <AiIssueDraftDialog visible={aiIssueDialogOpen} projectId={testPlan.projectId} result={aiIssueResult} onHide={() => setAiIssueDialogOpen(false)} onSaved={() => navigate(`/test-runs/${id}/issues`)} />}

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
