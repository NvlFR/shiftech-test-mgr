import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { notificationService } from '../services/notificationService';
import { queryKeys } from './queryKeys';
import { useAuthContext } from './useAuth';

export function useNotifications() {
  const { profile } = useAuthContext();
  const queryClient = useQueryClient();
  const userId = profile?.id;

  const listQuery = useQuery({
    queryKey: queryKeys.notifications(),
    queryFn: () => notificationService.listAll(userId!),
    enabled: Boolean(userId),
  });
  const unreadQuery = useQuery({
    queryKey: queryKeys.notificationsUnreadCount(),
    queryFn: () => notificationService.countUnread(userId!),
    enabled: Boolean(userId),
    refetchInterval: 30_000,
  });

  const invalidate = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications() }),
      queryClient.invalidateQueries({ queryKey: queryKeys.notificationsUnreadCount() }),
    ]);
  };
  const markReadMutation = useMutation({ mutationFn: notificationService.markRead, onSuccess: invalidate });
  const markAllReadMutation = useMutation({
    mutationFn: () => notificationService.markAllRead(userId!),
    onSuccess: invalidate,
  });

  return {
    notifications: listQuery.data ?? [],
    unreadCount: unreadQuery.data ?? 0,
    loading: listQuery.isLoading,
    markRead: markReadMutation.mutate,
    markAllRead: markAllReadMutation.mutate,
  };
}
