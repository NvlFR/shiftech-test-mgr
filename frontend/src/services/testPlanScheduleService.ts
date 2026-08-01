import {
  testPlanScheduleRepository,
  type ScheduleInput,
} from '../repositories/testPlanScheduleRepository';

export const testPlanScheduleService = {
  getByPlan(testPlanId: string) {
    if (!testPlanId) throw new Error('Test Plan wajib dipilih');
    return testPlanScheduleRepository.findByPlan(testPlanId);
  },

  save(input: ScheduleInput) {
    if (!input.projectId || !input.testPlanId) {
      throw new Error('Project dan Test Plan wajib dipilih');
    }
    if (!input.name.trim()) throw new Error('Nama run tidak boleh kosong');
    if (!Number.isInteger(input.intervalDays) || input.intervalDays < 1 || input.intervalDays > 365) {
      throw new Error('Interval harus 1–365 hari');
    }
    if (!Number.isInteger(input.maxAttempts) || input.maxAttempts < 1 || input.maxAttempts > 10) {
      throw new Error('Max attempts harus 1–10');
    }
    if (Number.isNaN(Date.parse(input.nextRunAt))) {
      throw new Error('Waktu run berikutnya tidak valid');
    }
    return testPlanScheduleRepository.save({
      ...input,
      name: input.name.trim(),
      deviceProfile: input.deviceProfile?.trim() || null,
    });
  },

  remove(testPlanId: string) {
    if (!testPlanId) throw new Error('Test Plan wajib dipilih');
    return testPlanScheduleRepository.remove(testPlanId);
  },
};
