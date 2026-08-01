import { beforeEach, describe, expect, it, vi } from 'vitest';

const { create, findExecutionContext } = vi.hoisted(() => ({
  create: vi.fn(),
  findExecutionContext: vi.fn(),
}));

vi.mock('../repositories/issueRepository', () => ({ issueRepository: { create } }));
vi.mock('../repositories/testResultRepository', () => ({ testResultRepository: { findExecutionContext } }));

import { issueService } from './issueService';

describe('issueService.createAiDraft', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findExecutionContext.mockResolvedValue({ resultStatus: 'fail' });
    create.mockImplementation(async (input) => ({ id: 'issue-1', ...input }));
  });

  it('menyimpan Issue hasil AI sebagai draft sampai diverifikasi manusia', async () => {
    const issue = await issueService.createAiDraft({
      testResultId: 'result-1',
      title: '  Login gagal  ',
      priority: 'high',
    });

    expect(create).toHaveBeenCalledWith(expect.objectContaining({
      testResultId: 'result-1',
      title: 'Login gagal',
      status: 'draft',
    }));
    expect(issue.status).toBe('draft');
  });
});
