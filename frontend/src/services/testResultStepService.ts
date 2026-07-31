import { testResultStepRepository } from '../repositories/testResultStepRepository';
import type { TestResultStepStatus } from '../types/domain';

export const testResultStepService = {
  list(testResultId: string) { return testResultStepRepository.list(testResultId); },
  update(id: string, status: TestResultStepStatus, notes: string | null) { return testResultStepRepository.update(id, status, notes); },
};
