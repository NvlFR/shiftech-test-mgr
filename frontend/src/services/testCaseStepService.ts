import { testCaseStepRepository } from '../repositories/testCaseStepRepository';

export const testCaseStepService = {
  list(testCaseId: string) { return testCaseStepRepository.list(testCaseId); },
  create(input: { testCaseId: string; action: string; expectedResult?: string; stepNumber: number }) {
    if (!input.action.trim()) throw new Error('Aksi step tidak boleh kosong');
    return testCaseStepRepository.create(input);
  },
  update(id: string, input: { action: string; expectedResult?: string }) {
    if (!input.action.trim()) throw new Error('Aksi step tidak boleh kosong');
    return testCaseStepRepository.update(id, input);
  },
  remove(id: string) { return testCaseStepRepository.remove(id); },
};
