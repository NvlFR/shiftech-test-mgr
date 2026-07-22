import { dashboardRepository } from '../repositories/dashboardRepository';

export const dashboardService = {
  getStats() {
    return dashboardRepository.getStats();
  },
};
