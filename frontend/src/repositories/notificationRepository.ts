import { supabase } from '../config/supabaseClient';
import { mapNotificationRow } from '../helpers/mappers';
import type { Notification } from '../types/domain';

export const notificationRepository = {
  async findUnread(userId: string): Promise<Notification[]> {
    const { data, error } = await supabase.from('notifications').select('*').eq('recipient_id', userId).is('read_at', null).order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []).map(mapNotificationRow);
  },
  async markRead(id: string): Promise<void> {
    const { error } = await supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('id', id);
    if (error) throw error;
  },
};
