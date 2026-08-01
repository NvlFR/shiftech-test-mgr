import { notificationRepository } from '../repositories/notificationRepository';
import type { Notification } from '../types/domain';

function requireId(value: string, label: string): string {
  const id = value.trim();
  if (!id) throw new Error(`${label} wajib diisi.`);
  return id;
}

export const notificationService = {
  listAll(userId: string) { return notificationRepository.findAllByUser(requireId(userId, 'User')); },
  listUnread(userId: string) { return notificationRepository.findUnread(requireId(userId, 'User')); },
  countUnread(userId: string) { return notificationRepository.findUnreadCount(requireId(userId, 'User')); },
  markRead(id: string) { return notificationRepository.markRead(requireId(id, 'Notification')); },
  markAllRead(userId: string) { return notificationRepository.markAllRead(requireId(userId, 'User')); },
  remove(id: string) { return notificationRepository.remove(requireId(id, 'Notification')); },
  clearAll(userId: string) { return notificationRepository.removeAll(requireId(userId, 'User')); },
  subscribe(userId: string, onChange: () => void) {
    if (typeof onChange !== 'function') throw new Error('Handler notifikasi wajib diisi.');
    return notificationRepository.subscribe(requireId(userId, 'User'), onChange);
  },
  getNavigationPath(notification: Notification): string | null {
    if (notification.issueId) return `/issues/${notification.issueId}`;
    if (notification.commentTargetType === 'issue' && notification.commentTargetId) {
      return `/issues/${notification.commentTargetId}`;
    }
    if (notification.commentTargetType === 'test_case' && notification.commentTargetId) {
      return `/test-cases/${notification.commentTargetId}`;
    }
    if (notification.testRunId) return `/test-runs/${notification.testRunId}`;
    if (notification.testCaseId) return `/test-cases/${notification.testCaseId}`;
    if (notification.kind === 'automation_completed' && notification.projectId) {
      return `/projects/${notification.projectId}/automation`;
    }
    return null;
  },
};
