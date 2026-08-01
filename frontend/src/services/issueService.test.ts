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

describe('issueService.create invariants', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    create.mockImplementation(async (input) => ({ id: 'issue-1', ...input }));
  });

  it.each(['pass', 'skip', 'blocked', 'not_run'])(
    'rejects Issue creation when the Test Result status is %s',
    async (resultStatus) => {
      findExecutionContext.mockResolvedValue({ resultStatus, runStatus: 'in_progress' });

      await expect(issueService.create({
        testResultId: 'result-1',
        title: 'Unexpected behavior',
      })).rejects.toThrow('Issue hanya bisa dibuat untuk hasil yang FAIL');

      expect(create).not.toHaveBeenCalled();
    },
  );

  it('allows multiple Issues to reference the same failed Test Result', async () => {
    findExecutionContext.mockResolvedValue({ resultStatus: 'fail', runStatus: 'in_progress' });

    await issueService.create({ testResultId: 'result-1', title: 'First defect' });
    await issueService.create({ testResultId: 'result-1', title: 'Second defect' });

    expect(create).toHaveBeenCalledTimes(2);
    expect(create).toHaveBeenNthCalledWith(1, expect.objectContaining({
      testResultId: 'result-1',
      title: 'First defect',
    }));
    expect(create).toHaveBeenNthCalledWith(2, expect.objectContaining({
      testResultId: 'result-1',
      title: 'Second defect',
    }));
  });
});

describe('issueService validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects an empty title before reading the test result', async () => {
    await expect(issueService.create({ testResultId: 'result-1', title: '   ' }))
      .rejects.toThrow('Judul issue tidak boleh kosong');
    expect(findExecutionContext).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });

  it('rejects a title longer than 255 characters', async () => {
    await expect(issueService.create({ testResultId: 'result-1', title: 'a'.repeat(256) }))
      .rejects.toThrow('Judul issue maksimal 255 karakter');
    expect(findExecutionContext).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });

  it('rejects an unknown priority at runtime', async () => {
    await expect(issueService.create({
      testResultId: 'result-1',
      title: 'Unexpected behavior',
      priority: 'urgent' as never,
    })).rejects.toThrow('Prioritas issue tidak dikenal');
    expect(findExecutionContext).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });

  it('rejects creation when the referenced test result does not exist', async () => {
    findExecutionContext.mockResolvedValue(null);

    await expect(issueService.create({ testResultId: 'missing', title: 'Unexpected behavior' }))
      .rejects.toThrow('Test result tidak ditemukan');
    expect(create).not.toHaveBeenCalled();
  });
});
