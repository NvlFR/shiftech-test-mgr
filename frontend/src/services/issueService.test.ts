import { beforeEach, describe, expect, it, vi } from 'vitest';

const { create, findCodeContext, findExecutionContext, updateStatus } = vi.hoisted(() => ({
  create: vi.fn(),
  findCodeContext: vi.fn(),
  findExecutionContext: vi.fn(),
  updateStatus: vi.fn(),
}));

vi.mock('../repositories/issueRepository', () => ({ issueRepository: { create, findCodeContext, updateStatus } }));
vi.mock('../repositories/testResultRepository', () => ({ testResultRepository: { findExecutionContext } }));

import { issueService } from './issueService';

describe('issueService.changeStatus', () => {
  beforeEach(() => vi.clearAllMocks());

  it('meneruskan link commit atau PR HTTPS saat Issue menjadi resolved', async () => {
    updateStatus.mockResolvedValue({ id: 'issue-1' });
    await issueService.changeStatus('issue-1', 'resolved', '  https://github.com/acme/app/pull/42  ');
    expect(updateStatus).toHaveBeenCalledWith('issue-1', 'resolved', 'https://github.com/acme/app/pull/42', null);
  });

  it('menolak link perbaikan non-HTTPS', async () => {
    await expect(issueService.changeStatus('issue-1', 'resolved', 'http://example.com/commit/1'))
      .rejects.toThrow('Link commit/PR harus menggunakan HTTPS');
    expect(updateStatus).not.toHaveBeenCalled();
  });

  it('tidak mengubah link perbaikan untuk status selain resolved', async () => {
    updateStatus.mockResolvedValue({ id: 'issue-1' });
    await issueService.changeStatus('issue-1', 'verified');
    expect(updateStatus).toHaveBeenCalledWith('issue-1', 'verified', undefined, undefined);
  });

  it('membersihkan tautan run pembuktian saat manusia meng-override status verified', async () => {
    updateStatus.mockResolvedValue({ id: 'issue-1', status: 'open' });
    await issueService.changeStatus('issue-1', 'open');
    expect(updateStatus).toHaveBeenCalledWith('issue-1', 'open', undefined, null);
  });
});

describe('issueService.getCodeContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('membentuk link commit dan file GitHub dari traceability Test Run', async () => {
    findCodeContext.mockResolvedValue({
      repository: {
        id: 'repo-1', projectId: 'project-1', name: 'Web App', sourceType: 'github_private',
        urlOrPath: 'https://github.com/acme/web-app.git', defaultBranch: 'main', subdirectory: 'frontend',
        credentialId: null, credentialMask: null, credentialCreatedAt: null, credentialExpiresAt: null,
        isActive: true, createdAt: '', updatedAt: '',
      },
      branch: 'fix/login flow',
      commitSha: 'abc123def456',
      scriptRef: 'tests/login.spec.ts',
    });

    await expect(issueService.getCodeContext('issue-1')).resolves.toMatchObject({
      filePath: 'frontend/tests/login.spec.ts',
      repositoryUrl: 'https://github.com/acme/web-app',
      commitUrl: 'https://github.com/acme/web-app/commit/abc123def456',
      fileUrl: 'https://github.com/acme/web-app/blob/abc123def456/frontend/tests/login.spec.ts',
    });
  });

  it('tidak membuat URL browser untuk repository local path', async () => {
    findCodeContext.mockResolvedValue({
      repository: {
        id: 'repo-1', projectId: 'project-1', name: 'Local App', sourceType: 'local_path',
        urlOrPath: '/srv/app', defaultBranch: 'main', subdirectory: null,
        credentialId: null, credentialMask: null, credentialCreatedAt: null, credentialExpiresAt: null,
        isActive: true, createdAt: '', updatedAt: '',
      },
      branch: 'main', commitSha: 'abc123', scriptRef: 'tests/app.spec.ts',
    });

    await expect(issueService.getCodeContext('issue-1')).resolves.toMatchObject({
      filePath: 'tests/app.spec.ts', repositoryUrl: null, commitUrl: null, fileUrl: null,
    });
  });
});

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
