import { notificationRepository } from '../repositories/notificationRepository';

export const notificationService = {
  listAll(userId: string) { return notificationRepository.findAllByUser(userId); },
  listUnread(userId: string) { return notificationRepository.findUnread(userId); },
  countUnread(userId: string) { return notificationRepository.findUnreadCount(userId); },
  markRead(id: string) { return notificationRepository.markRead(id); },
  markAllRead(userId: string) { return notificationRepository.markAllRead(userId); },
};
