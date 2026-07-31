import { activityRepository } from '../repositories/activityRepository';

export const activityService = {
  listByProject(projectId: string, limit?: number) { return activityRepository.findByProject(projectId, limit); },
};
