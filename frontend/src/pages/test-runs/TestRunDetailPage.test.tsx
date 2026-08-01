import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { makeProfile, makeTestCase, makeTestPlan, makeTestResult, makeTestRun } from '../../test';
import type { TestResultWithDetails } from '../../types/domain';

const mocks = vi.hoisted(() => ({
  createIssue: vi.fn(),
  navigate: vi.fn(),
  recordResult: vi.fn(),
  reload: vi.fn(),
}));

vi.mock('react-router-dom', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-router-dom')>()),
  useNavigate: () => mocks.navigate,
}));

vi.mock('primereact/datatable', async () => {
  const React = await import('react');
  return {
    DataTable: ({ value, children }: { value: TestResultWithDetails[]; children: React.ReactNode }) => (
      <div>
        {value.map((row) => <div key={row.id}>
          {React.Children.map(children, (child) => {
            if (!React.isValidElement<{ body?: (item: TestResultWithDetails) => React.ReactNode }>(child)) return null;
            return child.props.body?.(row) ?? null;
          })}
        </div>)}
      </div>
    ),
  };
});
vi.mock('primereact/column', () => ({ Column: () => null }));
vi.mock('primereact/dialog', () => ({
  Dialog: ({ visible, header, children }: { visible: boolean; header: string; children: React.ReactNode }) => visible ? <section aria-label={header}>{children}</section> : null,
}));
vi.mock('primereact/dropdown', () => ({
  Dropdown: ({ id, value, options = [], onChange }: { id?: string; value?: string | null; options?: { label: string; value: string }[]; onChange?: (event: { value: string }) => void }) => (
    <select id={id} value={value ?? ''} onChange={(event) => onChange?.({ value: event.target.value })}>
      <option value="" />
      {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
    </select>
  ),
}));
vi.mock('primereact/button', () => ({
  Button: ({ label, 'aria-label': ariaLabel, onClick, disabled }: { label?: string; 'aria-label'?: string; onClick?: () => void; disabled?: boolean }) => (
    <button aria-label={ariaLabel} onClick={onClick} disabled={disabled}>{label ?? ariaLabel}</button>
  ),
}));
vi.mock('primereact/inputtextarea', () => ({ InputTextarea: (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => <textarea {...props} /> }));
vi.mock('primereact/inputtext', () => ({ InputText: ({ invalid: _invalid, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) => <input {...props} /> }));
vi.mock('primereact/confirmdialog', () => ({ ConfirmDialog: () => null }));
vi.mock('primereact/toast', () => ({ Toast: () => null }));
vi.mock('../../components/ui/Breadcrumb', () => ({ Breadcrumb: () => null }));
vi.mock('../../components/ui/AttachmentPanel', () => ({ AttachmentPanel: () => null }));
vi.mock('../../components/ui/ActivityPanel', () => ({ ActivityPanel: () => null }));
vi.mock('../../components/test-runs/TestRunAnalysisPanel', () => ({ TestRunAnalysisPanel: () => null }));
vi.mock('../../components/ai/AiIssueDraftDialog', () => ({ AiIssueDraftDialog: () => null }));
vi.mock('../../hooks/useScreenSize', () => ({ useScreenSize: () => ({ lt: { sm: false } }) }));
vi.mock('../../hooks/useAuth', () => ({ useAuthContext: () => ({ profile: makeProfile() }) }));
vi.mock('../../hooks/useProjectRole', () => ({ useProjectRole: () => ({ canRunTests: true, canManageIssues: true, canDeleteContent: false }) }));
vi.mock('../../hooks/useIssues', () => ({ useIssuesByTestRun: () => ({ issues: [] }) }));
vi.mock('../../hooks/useTestRunAnalysis', () => ({ useTestRunAnalysis: () => ({ analysis: null, loading: false, error: null, analyze: vi.fn() }) }));
vi.mock('../../services/profileService', () => ({ profileService: { listAll: vi.fn().mockResolvedValue([makeProfile()]) } }));
vi.mock('../../services/testPlanService', () => ({ testPlanService: { getById: vi.fn().mockResolvedValue(makeTestPlan()) } }));
vi.mock('../../services/projectService', () => ({ projectService: { getById: vi.fn().mockResolvedValue(null) } }));
vi.mock('../../services/testResultStepService', () => ({ testResultStepService: { list: vi.fn().mockResolvedValue([]), update: vi.fn() } }));
vi.mock('../../services/testRunService', () => ({
  testRunService: { recordResult: mocks.recordResult, assign: vi.fn(), complete: vi.fn(), reopen: vi.fn() },
}));
vi.mock('../../services/issueService', () => ({ issueService: { create: mocks.createIssue } }));

const failResult: TestResultWithDetails = {
  ...makeTestResult({ id: 'result-fail', status: 'fail' }),
  testCase: makeTestCase({ id: 'case-fail', title: 'Login dengan kredensial valid', expectedResult: 'Dashboard tampil' }),
  tester: makeProfile(),
};
const notRunResult: TestResultWithDetails = {
  ...makeTestResult({ id: 'result-not-run', testCaseId: 'case-not-run' }),
  testCase: makeTestCase({ id: 'case-not-run', title: 'Logout pengguna' }),
  tester: null,
};

vi.mock('../../hooks/useTestRunDetail', () => ({
  useTestRunDetail: () => ({
    testRun: makeTestRun(),
    repositoryTraceability: null,
    results: [failResult, notRunResult],
    summary: { total: 2, executed: 1, progressPercent: 50, pass: 0, fail: 1, skip: 0, blocked: 0, notRun: 1 },
    loading: false,
    reload: mocks.reload,
  }),
}));

import { TestRunDetailPage } from './TestRunDetailPage';

function renderPage() {
  return render(<MemoryRouter initialEntries={['/test-runs/test-run-1']}><Routes><Route path="/test-runs/:id" element={<TestRunDetailPage />} /></Routes></MemoryRouter>);
}

describe('TestRunDetailPage critical result and issue flows', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.recordResult.mockResolvedValue(undefined);
    mocks.createIssue.mockResolvedValue(undefined);
    mocks.reload.mockResolvedValue(undefined);
  });

  it('records a Test Result on the active Test Run and reloads its summary', async () => {
    renderPage();
    fireEvent.click(screen.getAllByRole('button', { name: 'Catat' })[1]);

    fireEvent.change(await screen.findByLabelText('Status'), { target: { value: 'blocked' } });
    fireEvent.change(screen.getByLabelText('Tester'), { target: { value: 'profile-1' } });
    fireEvent.change(screen.getByLabelText('Catatan'), { target: { value: '  Environment tidak tersedia  ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Simpan' }));

    await waitFor(() => expect(mocks.recordResult).toHaveBeenCalledWith(
      'result-not-run', 'profile-1', 'blocked', 'Environment tidak tersedia',
    ));
    expect(mocks.reload).toHaveBeenCalledOnce();
  });

  it('offers Issue creation only for FAIL and preserves the Test Result relation', async () => {
    renderPage();
    expect(screen.getAllByRole('button', { name: 'Buat Issue' })).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: 'Buat Issue' }));

    expect((screen.getByLabelText('Judul') as HTMLInputElement).value).toBe('Login dengan kredensial valid gagal');
    expect((screen.getByLabelText('Hasil yang Diharapkan') as HTMLTextAreaElement).value).toBe('Dashboard tampil');
    fireEvent.change(screen.getByLabelText('Hasil Aktual'), { target: { value: 'Halaman tetap login' } });
    fireEvent.click(screen.getAllByRole('button', { name: 'Buat Issue' })[1]);

    await waitFor(() => expect(mocks.createIssue).toHaveBeenCalledWith({
      testResultId: 'result-fail',
      title: 'Login dengan kredensial valid gagal',
      description: '',
      actualResult: 'Halaman tetap login',
      expectedResult: 'Dashboard tampil',
    }));
    expect(mocks.navigate).toHaveBeenCalledWith('/test-runs/test-run-1/issues');
  });
});
