import { useQuery } from '@tanstack/react-query';
import { profileService } from '../services/profileService';

export function useProfileView(userId: string) {
  const query = useQuery({
    queryKey: ['profile-view', userId],
    queryFn: () => profileService.getViewById(userId),
    enabled: Boolean(userId),
  });

  return {
    profileView: query.data ?? null,
    loading: query.isLoading,
    error: query.error,
    reload: query.refetch,
  };
}
