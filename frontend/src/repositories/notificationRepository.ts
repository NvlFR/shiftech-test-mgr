import { supabase } from '../config/supabaseClient';
import { mapNotificationRow } from '../helpers/mappers';
import type { Notification } from '../types/domain';

const notificationSelect = '*, comment:comments(target_type, target_id)';

export const notificationRepository = {
  async findAllByUser(userId: string): Promise<Notification[]> {
    const { data, error } = await supabase.from('notifications').select(notificationSelect).eq('recipient_id', userId).order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []).map(mapNotificationRow);
  },

  async findUnread(userId: string): Promise<Notification[]> {
    const { data, error } = await supabase.from('notifications').select(notificationSelect).eq('recipient_id', userId).is('read_at', null).order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []).map(mapNotificationRow);
  },

  async findUnreadCount(userId: string): Promise<number> {
    const { count, error } = await supabase.from('notifications').select('*', { count: 'exact', head: true }).eq('recipient_id', userId).is('read_at', null);
    if (error) throw error;
    return count ?? 0;
  },
  async markRead(id: string): Promise<void> {
    const { error } = await supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('id', id);
    if (error) throw error;
  },
  async markAllRead(userId: string): Promise<void> {
    const { error } = await supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('recipient_id', userId).is('read_at', null);
    if (error) throw error;
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase.from('notifications').delete().eq('id', id);
    if (error) throw error;
  },

  async removeAll(userId: string): Promise<void> {
    const { error } = await supabase.from('notifications').delete().eq('recipient_id', userId);
    if (error) throw error;
  },

  subscribe(userId: string, onChange: () => void): () => void {
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `recipient_id=eq.${userId}` }, onChange)
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  },
};
