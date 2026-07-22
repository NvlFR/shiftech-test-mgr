import { notificationRepository } from '../repositories/notificationRepository';

export const notificationService = {
  listUnread(userId: string) { return notificationRepository.findUnread(userId); },
  markRead(id: string) { return notificationRepository.markRead(id); },
};
