import { observabilityRepository, type OperationalLogFilters } from '../repositories/observabilityRepository';

export const observabilityService = {
  getHealth: () => observabilityRepository.getHealth(),
  listErrors(filters: OperationalLogFilters = {}) {
    const search = filters.search?.trim().replace(/[(),]/g, ' ');
    if (search && search.length > 100) throw new Error('Pencarian maksimal 100 karakter');
    return observabilityRepository.listErrors({ ...filters, search, limit: Math.min(filters.limit ?? 100, 200) });
  },
};
