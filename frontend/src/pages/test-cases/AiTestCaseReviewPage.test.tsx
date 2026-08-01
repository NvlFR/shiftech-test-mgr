import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { makeModule, makeProject, makeTag, makeTestCase } from '../../test';
import type { TestCaseWithDetails } from '../../types/domain';

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  review: vi.fn(),
  update: vi.fn(),
  approveAndCreatePlan: vi.fn(),
}));

vi.mock('react-router-dom', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-router-dom')>()),
  useNavigate: () => mocks.navigate,
}));

vi.mock('primereact/confirmdialog', () => ({
  ConfirmDialog: () => null,
  confirmDialog: (options: { accept: () => void }) => options.accept(),
}));

vi.mock('primereact/column', () => ({ Column: () => null }));
vi.mock('primereact/datatable', async () => {
  const React = await import('react');
  return {
    DataTable: ({ value, children }: { value: TestCaseWithDetails[]; children: React.ReactNode }) => (
      <div>
        {value.map((row) => (
          <div key={row.id}>
            {React.Children.map(children, (child) => {
              if (!React.isValidElement<{ body?: (item: TestCaseWithDetails) => React.ReactNode; field?: keyof TestCaseWithDetails }>(child)) return null;
              if (child.props.body) return child.props.body(row);
              return child.props.field ? String(row[child.props.field] ?? '') : null;
            })}
          </div>
        ))}
      </div>
    ),
  };
});

vi.mock('../../hooks/useProjectContext', () => ({
  useProjectContext: () => ({
    projects: [makeProject()],
    projectId: 'project-1',
    setProjectId: vi.fn(),
  }),
}));

const draft: TestCaseWithDetails = {
  ...makeTestCase({
    status: 'draft',
    source: 'ai',
    aiBatchId: 'batch-1',
    title: 'Judul awal',
  }),
  module: makeModule(),
  tags: [makeTag()],
  targetRole: null,
};
const drafts = [draft];
const modules = [makeModule()];
const tags = [makeTag()];

vi.mock('../../hooks/useAiTestCaseReview', () => ({
  useAiTestCaseReview: () => ({
    drafts,
    modules,
    tags,
    loading: false,
    saving: false,
    error: null,
    reload: vi.fn(),
    review: mocks.review,
    update: mocks.update,
    approveAndCreatePlan: mocks.approveAndCreatePlan,
  }),
}));

import { AiTestCaseReviewPage } from './AiTestCaseReviewPage';

describe('AiTestCaseReviewPage critical review flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.review.mockResolvedValue(1);
    mocks.update.mockResolvedValue(undefined);
  });

  it.each([
    ['Approve semua batch', 'approved'],
    ['Reject semua batch', 'rejected'],
  ] as const)('sends the entire displayed batch when choosing %s', async (buttonLabel, decision) => {
    render(<MemoryRouter><AiTestCaseReviewPage /></MemoryRouter>);

    fireEvent.click(screen.getByRole('button', { name: buttonLabel }));

    await waitFor(() => expect(mocks.review).toHaveBeenCalledWith(['test-case-1'], decision));
  });

  it('persists edited draft fields through the review hook', async () => {
    render(<MemoryRouter><AiTestCaseReviewPage /></MemoryRouter>);

    fireEvent.click(screen.getByRole('button', { name: /Edit/ }));
    const title = screen.getByLabelText('Judul');
    fireEvent.change(title, { target: { value: 'Judul hasil review manusia' } });
    fireEvent.click(screen.getByRole('button', { name: /Simpan Perubahan/ }));

    await waitFor(() => expect(mocks.update).toHaveBeenCalledWith(
      draft,
      expect.objectContaining({ title: 'Judul hasil review manusia' }),
      ['regression'],
    ));
  });
});
