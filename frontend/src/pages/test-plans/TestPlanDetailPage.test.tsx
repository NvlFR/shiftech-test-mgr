import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { makeProject, makeTestPlan } from '../../test';

const mocks = vi.hoisted(() => ({
  approve: vi.fn(),
  getById: vi.fn(),
}));

vi.mock('primereact/dropdown', () => ({
  Dropdown: ({ value, options = [], onChange, ...props }: {
    value?: string | null;
    options?: { label: string; value: string }[];
    onChange?: (event: { value: string }) => void;
    [key: string]: unknown;
  }) => (
    <select
      aria-label={props['aria-label'] as string | undefined}
      value={value ?? ''}
      onChange={(event) => onChange?.({ value: event.target.value })}
    >
      <option value="" />
      {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
    </select>
  ),
}));

vi.mock('../../hooks/useTestPlanDetail', () => ({
  useTestPlanDetail: () => ({ cases: [], loading: false, reload: vi.fn() }),
}));
vi.mock('../../hooks/useTestRuns', () => ({
  useTestRuns: () => ({ testRuns: [], loading: false, reload: vi.fn() }),
}));
vi.mock('../../hooks/useProjectRole', () => ({
  useProjectRole: () => ({ canEditContent: true, canDeleteContent: false, canRunTests: false }),
}));
vi.mock('../../hooks/useEnvironments', () => ({
  useEnvironments: () => ({ environments: [] }),
}));
vi.mock('../../components/ui/Breadcrumb', () => ({ Breadcrumb: () => null }));
vi.mock('../../services/testPlanService', () => ({
  testPlanService: {
    getById: mocks.getById,
    approve: mocks.approve,
    changeStatus: vi.fn(),
    update: vi.fn(),
    addCase: vi.fn(),
    removeCase: vi.fn(),
  },
}));
vi.mock('../../services/projectService', () => ({
  projectService: { getById: vi.fn().mockResolvedValue(makeProject()) },
}));
vi.mock('../../services/moduleService', () => ({
  moduleService: { listByProject: vi.fn().mockResolvedValue([]) },
}));
vi.mock('../../services/tagService', () => ({
  tagService: { listByProject: vi.fn().mockResolvedValue([]) },
}));
vi.mock('../../services/testCaseService', () => ({
  testCaseService: { listByProject: vi.fn() },
}));
vi.mock('../../services/testRunService', () => ({
  testRunService: { start: vi.fn(), remove: vi.fn() },
}));

import { TestPlanDetailPage } from './TestPlanDetailPage';

describe('TestPlanDetailPage approval flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getById.mockResolvedValue(makeTestPlan({ status: 'draft' }));
    mocks.approve.mockResolvedValue(makeTestPlan({
      status: 'active',
      approvedBy: 'profile-1',
      approvedAt: '2026-08-01T10:00:00.000Z',
    }));
  });

  it('uses explicit approval when a draft plan is activated', async () => {
    render(
      <MemoryRouter initialEntries={['/test-plans/test-plan-1']}>
        <Routes>
          <Route path="/test-plans/:id" element={<TestPlanDetailPage />} />
        </Routes>
      </MemoryRouter>,
    );

    await screen.findByText(/TP-0001/);
    const statusSelect = screen.getAllByRole('combobox').find((element) => (
      element instanceof HTMLSelectElement && element.value === 'draft'
    ));
    expect(statusSelect).toBeTruthy();
    fireEvent.change(statusSelect!, { target: { value: 'active' } });

    await waitFor(() => expect(mocks.approve).toHaveBeenCalledWith('test-plan-1', true));
    expect(await screen.findByText(/Disetujui secara eksplisit/)).toBeTruthy();
  }, 15_000);
});
