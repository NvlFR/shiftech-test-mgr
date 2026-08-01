import { beforeEach, describe, expect, it, vi } from 'vitest';

const repositories = vi.hoisted(() => ({
  testCase: { create: vi.fn() },
  tag: { saveTagsForTestCase: vi.fn() },
  module: {},
  step: { create: vi.fn() },
}));

vi.mock('../repositories/testCaseRepository', () => ({ testCaseRepository: repositories.testCase }));
vi.mock('./tagService', () => ({ tagService: repositories.tag }));
vi.mock('./moduleService', () => ({ moduleService: repositories.module }));
vi.mock('./testCaseStepService', () => ({ testCaseStepService: repositories.step }));

import { testCaseService } from './testCaseService';

const validInput = {
  projectId: 'project-1',
  moduleId: null,
  title: 'Login berhasil',
  steps: 'Isi kredensial valid',
  expectedResult: 'Dashboard tampil',
};

describe('testCaseService validation', () => {
  beforeEach(() => vi.clearAllMocks());

  it('rejects an empty title with a clear message before persistence', async () => {
    await expect(testCaseService.create({ ...validInput, title: '   ' }))
      .rejects.toThrow('Judul test case tidak boleh kosong');
    expect(repositories.testCase.create).not.toHaveBeenCalled();
  });

  it('rejects a title longer than 255 characters', async () => {
    await expect(testCaseService.create({ ...validInput, title: 'a'.repeat(256) }))
      .rejects.toThrow('Judul test case maksimal 255 karakter');
    expect(repositories.testCase.create).not.toHaveBeenCalled();
  });

  it('rejects an unknown priority at runtime', async () => {
    await expect(testCaseService.create({
      ...validInput,
      priority: 'urgent' as never,
    })).rejects.toThrow('Prioritas test case tidak dikenal');
    expect(repositories.testCase.create).not.toHaveBeenCalled();
  });

  it('rejects a detailed test case without an actionable step', async () => {
    await expect(testCaseService.create({
      ...validInput,
      stepType: 'detailed',
      detailedSteps: [{ action: '   ' }],
    })).rejects.toThrow('Test case detail wajib punya minimal satu step');
    expect(repositories.testCase.create).not.toHaveBeenCalled();
  });
});
