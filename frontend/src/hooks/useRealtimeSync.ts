import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../config/supabaseClient';
import { queryKeys } from './queryKeys';
import { useAuthContext } from './useAuth';

export function useRealtimeSync() {
  const { profile } = useAuthContext();
  const queryClient = useQueryClient();

  useEffect(() => {
    const userId = profile?.id;
    if (!userId) return;

    const channel = supabase
      .channel(`app-realtime-sync:${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `recipient_id=eq.${userId}` }, () => {
        void queryClient.invalidateQueries({ queryKey: queryKeys.notifications() });
        void queryClient.invalidateQueries({ queryKey: queryKeys.notificationsUnreadCount() });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'audit_logs' }, (payload) => {
        const row = (payload.new ?? payload.old) as { project_id?: string };
        if (row.project_id) void queryClient.invalidateQueries({ queryKey: queryKeys.activity('project', row.project_id) });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'project_members', filter: `user_id=eq.${userId}` }, () => {
        void queryClient.invalidateQueries({ queryKey: ['projectRole'] });
        void queryClient.invalidateQueries({ queryKey: ['projects'] });
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [profile?.id, queryClient]);
}
