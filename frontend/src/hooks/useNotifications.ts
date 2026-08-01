import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { notificationService } from '../services/notificationService';
import { queryKeys } from './queryKeys';
import { useAuthContext } from './useAuth';
import type { Notification } from '../types/domain';

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
  useEffect(() => {
    if (!userId) return;
    return notificationService.subscribe(userId, () => {
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.notifications() }),
        queryClient.invalidateQueries({ queryKey: queryKeys.notificationsUnreadCount() }),
      ]);
    });
  }, [userId, queryClient]);
  const markReadMutation = useMutation({ mutationFn: notificationService.markRead, onSuccess: invalidate });
  const markAllReadMutation = useMutation({
    mutationFn: () => notificationService.markAllRead(userId!),
    onSuccess: invalidate,
  });
  const removeMutation = useMutation({ mutationFn: notificationService.remove, onSuccess: invalidate });
  const clearAllMutation = useMutation({
    mutationFn: () => notificationService.clearAll(userId!),
    onSuccess: invalidate,
  });

  return {
    notifications: listQuery.data ?? [],
    unreadCount: unreadQuery.data ?? 0,
    loading: listQuery.isLoading,
    error: listQuery.error ?? unreadQuery.error ?? markReadMutation.error ?? markAllReadMutation.error ?? removeMutation.error ?? clearAllMutation.error,
    markRead: markReadMutation.mutate,
    markAllRead: markAllReadMutation.mutate,
    remove: removeMutation.mutate,
    clearAll: clearAllMutation.mutate,
    getNavigationPath: (notification: Notification) => notificationService.getNavigationPath(notification),
    mutating: markReadMutation.isPending || markAllReadMutation.isPending || removeMutation.isPending || clearAllMutation.isPending,
  };
}
