import { beforeEach, describe, expect, it, vi } from 'vitest';

const repositories = vi.hoisted(() => ({
  testPlan: { create: vi.fn(), update: vi.fn(), createApprovedFromReviewedCases: vi.fn() },
  testCase: {},
}));

vi.mock('../repositories/testPlanRepository', () => ({ testPlanRepository: repositories.testPlan }));
vi.mock('../repositories/testCaseRepository', () => ({ testCaseRepository: repositories.testCase }));

import { testPlanService } from './testPlanService';

describe('testPlanService validation', () => {
  beforeEach(() => vi.clearAllMocks());

  it('rejects an empty name with a clear message', async () => {
    await expect(testPlanService.create({ projectId: 'project-1', name: '  ' }))
      .rejects.toThrow('Nama test plan tidak boleh kosong');
    expect(repositories.testPlan.create).not.toHaveBeenCalled();
  });

  it('rejects a name longer than 255 characters', async () => {
    await expect(testPlanService.create({ projectId: 'project-1', name: 'a'.repeat(256) }))
      .rejects.toThrow('Nama test plan maksimal 255 karakter');
    expect(repositories.testPlan.create).not.toHaveBeenCalled();
  });

  it('rejects an unknown status at runtime', () => {
    expect(() => testPlanService.changeStatus('plan-1', 'unknown' as never))
      .toThrow('Status test plan tidak dikenal');
    expect(repositories.testPlan.update).not.toHaveBeenCalled();
  });

  it('rejects activation without the explicit approval action', () => {
    expect(() => testPlanService.changeStatus('plan-1', 'active'))
      .toThrow('Gunakan aksi approval eksplisit untuk mengaktifkan Test Plan');
    expect(repositories.testPlan.update).not.toHaveBeenCalled();
  });
});
