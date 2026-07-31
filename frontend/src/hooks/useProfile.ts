import { useQuery } from '@tanstack/react-query';
import { profileService } from '../services/profileService';
import { queryKeys } from './queryKeys';

export function useProfile(userId: string, enabled = true) {
  const query = useQuery({
    queryKey: queryKeys.profile(userId),
    queryFn: () => profileService.getById(userId),
    enabled: enabled && Boolean(userId),
  });

  return {
    profile: query.data ?? null,
    loading: query.isLoading,
    reload: query.refetch,
  };
}
