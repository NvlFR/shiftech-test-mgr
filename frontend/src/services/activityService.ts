import { activityRepository } from '../repositories/activityRepository';

export const activityService = {
  listByProject(projectId: string, limit = 40) {
    if (!projectId.trim()) throw new Error('Project wajib dipilih');
    return activityRepository.findByProject(projectId, Math.min(Math.max(limit, 1), 100));
  },
};
