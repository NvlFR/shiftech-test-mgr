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
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { Toast } from 'primereact/toast';
import { useTestRunDetail } from '../../hooks/useTestRunDetail';
import { useAuthContext } from '../../hooks/useAuth';
import { testRunService } from '../../services/testRunService';
import { profileService } from '../../services/profileService';
import { issueService } from '../../services/issueService';
import type { Profile, TestResultStatus, TestResultWithDetails } from '../../types/domain';
import { PageHeader } from '../../components/ui/PageHeader';
import {
  TEST_RESULT_STATUS_LABEL,
  TEST_RESULT_STATUS_SEVERITY,
  TEST_RUN_STATUS_LABEL,
  TEST_RUN_STATUS_SEVERITY,
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
  const [approvedUsers, setApprovedUsers] = useState<Profile[]>([]);

  useEffect(() => {
    profileService.listAll().then((all) => setApprovedUsers(all.filter((p) => p.role === 'user' || p.role === 'admin')));
  }, []);

  // --- Record result dialog ---
  const [resultDialogOpen, setResultDialogOpen] = useState(false);
  const [activeResult, setActiveResult] = useState<TestResultWithDetails | null>(null);
  const [resultStatus, setResultStatus] = useState<TestResultStatus>('pass');
  const [resultTesterId, setResultTesterId] = useState<string | null>(null);
  const [resultNotes, setResultNotes] = useState('');

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

  function handleCompleteRun() {
    if (!id) return;
    confirmDialog({
      header: 'Selesaikan Test Run',
      message: 'Test run ini akan ditandai selesai. Kamu masih bisa membuka kembali kapan saja. Lanjutkan?',
      icon: 'pi pi-check-circle',
      acceptLabel: 'Selesaikan',
      rejectLabel: 'Batal',
      accept: async () => {
        await testRunService.complete(id);
        await reload();
        toast.current?.show({ severity: 'success', summary: 'Test run diselesaikan' });
      },
    });
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

      <PageHeader
        title={testRun ? `${testRun.code} — ${testRun.name}` : 'Test Run'}
        actions={
          testRun?.status === 'completed' ? (
            <Button label="Buka Kembali" icon="pi pi-replay" size="small" severity="secondary" outlined onClick={handleReopenRun} />
          ) : (
            <Button label="Selesaikan Run" icon="pi pi-check" size="small" onClick={handleCompleteRun} />
          )
        }
      />

      {testRun && (
        <div className="flex align-items-center gap-2 mb-3">
          <Tag value={TEST_RUN_STATUS_LABEL[testRun.status]} severity={TEST_RUN_STATUS_SEVERITY[testRun.status]} />
          <span className="text-color-secondary text-sm">
            {summary.pass} pass · {summary.fail} fail · {summary.skip} skip · {summary.blocked} blocked · {summary.notRun} belum dites
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

      <DataTable value={results} loading={loading} paginator rows={10} emptyMessage="Belum ada test case" size="small">
        <Column field="testCase.code" header="Kode" sortable style={{ width: '7rem' }} />
        <Column field="testCase.title" header="Test Case" sortable />
        <Column field="testCase.priority" header="Prioritas" sortable />
        <Column field="status" header="Hasil" body={(row: TestResultWithDetails) => <Tag value={TEST_RESULT_STATUS_LABEL[row.status]} severity={TEST_RESULT_STATUS_SEVERITY[row.status]} />} sortable />
        <Column field="tester.fullName" header="Tester" body={(row: TestResultWithDetails) => row.tester?.fullName ?? row.tester?.email ?? '-'} />
        <Column field="notes" header="Catatan" />
        <Column
          header="Aksi"
          style={{ width: '9rem' }}
          body={(row: TestResultWithDetails) => (
            <div className="flex gap-1">
              <Button label="Catat" icon="pi pi-pencil" size="small" text onClick={() => openResultDialog(row)} />
              {row.status === 'fail' && (
                <Button icon="pi pi-flag" size="small" text severity="danger" aria-label="Buat Issue" onClick={() => openIssueDialog(row)} />
              )}
            </div>
          )}
        />
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
    </div>
  );
}
