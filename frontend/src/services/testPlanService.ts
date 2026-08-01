import { testPlanRepository } from '../repositories/testPlanRepository';
import { testCaseRepository } from '../repositories/testCaseRepository';
import type { TestPlan } from '../types/domain';

const MAX_NAME_LENGTH = 255;
const VALID_STATUSES: readonly TestPlan['status'][] = ['draft', 'active', 'completed', 'archived'];

function validateName(name: string) {
  if (!name.trim()) throw new Error('Nama test plan tidak boleh kosong');
  if (name.trim().length > MAX_NAME_LENGTH) throw new Error(`Nama test plan maksimal ${MAX_NAME_LENGTH} karakter`);
}

// Service layer: business rules, validation, orchestration across repositories.
// Pages/components call services — never repositories directly.

export const testPlanService = {
  listByProject(projectId: string) {
    return testPlanRepository.findAllByProject(projectId);
  },

  getById(id: string) {
    return testPlanRepository.findById(id);
  },

  async create(input: { projectId: string; name: string; description?: string; code?: string }): Promise<TestPlan> {
    validateName(input.name);
    return testPlanRepository.create({
      projectId: input.projectId,
      name: input.name.trim(),
      description: input.description?.trim() || null,
      code: input.code?.trim() || null,
    });
  },

  createApprovedFromReviewedCases(input: { projectId: string; name: string; description?: string; testCaseIds: string[]; explicitApproval: boolean }): Promise<TestPlan> {
    if (!input.projectId) throw new Error('Project wajib dipilih');
    validateName(input.name);
    if (!input.testCaseIds.length) throw new Error('Pilih minimal satu test case yang lolos review');
    if (input.explicitApproval !== true) throw new Error('Persetujuan Test Plan harus diberikan secara eksplisit');
    return testPlanRepository.createApprovedFromReviewedCases({
      projectId: input.projectId,
      name: input.name.trim(),
      description: input.description?.trim() || null,
      testCaseIds: [...new Set(input.testCaseIds)],
      explicitApproval: true,
    });
  },

  rename(id: string, name: string) {
    validateName(name);
    return testPlanRepository.update(id, { name: name.trim() });
  },

  update(id: string, input: { name: string; description?: string; code?: string }) {
    validateName(input.name);
    return testPlanRepository.update(id, {
      name: input.name.trim(),
      description: input.description?.trim() || null,
      ...(input.code !== undefined ? { code: input.code.trim() } : {}),
    });
  },

  changeStatus(id: string, status: TestPlan['status']) {
    if (!VALID_STATUSES.includes(status)) throw new Error('Status test plan tidak dikenal');
    if (status === 'active') throw new Error('Gunakan aksi approval eksplisit untuk mengaktifkan Test Plan');
    return testPlanRepository.update(id, { status });
  },

  approve(id: string, explicitApproval: boolean) {
    if (!id) throw new Error('Test Plan tidak valid');
    if (explicitApproval !== true) throw new Error('Persetujuan Test Plan harus diberikan secara eksplisit');
    return testPlanRepository.approve(id, true);
  },

  remove(id: string) {
    return testPlanRepository.remove(id);
  },

  // Test cases in scope for this plan — no result/progress here anymore.
  // Progress belongs to a specific Test Run (see testRunService.getSummary).
  listCases(testPlanId: string) {
    return testCaseRepository.findCasesForPlan(testPlanId);
  },

  addCase(testPlanId: string, testCaseId: string, order: number) {
    return testCaseRepository.attachToPlan(testPlanId, testCaseId, order);
  },

  removeCase(testPlanCaseId: string) {
    return testCaseRepository.detachFromPlan(testPlanCaseId);
  },
};
