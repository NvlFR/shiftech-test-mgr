import { useQuery } from '@tanstack/react-query';
import { activityService } from '../services/activityService';
import { queryKeys } from './queryKeys';

export function useActivity(projectId: string | null) {
  const query = useQuery({
    queryKey: queryKeys.activity('project', projectId ?? ''),
    queryFn: () => activityService.listByProject(projectId!),
    enabled: Boolean(projectId),
  });

  return {
    events: query.data ?? [],
    loading: query.isLoading,
    error: query.error instanceof Error ? query.error.message : null,
    reload: query.refetch,
  };
}
