import { commentRepository } from '../repositories/commentRepository';
import type { CommentTargetType } from '../types/domain';

export const commentService = {
  list: (targetType: CommentTargetType, targetId: string) => commentRepository.findAll(targetType, targetId),
  create(input: { projectId: string; targetType: CommentTargetType; targetId: string; authorId: string; body: string; mentionedUserIds?: string[] }) {
    const body = input.body.trim();
    if (!body) throw new Error('Komentar tidak boleh kosong');
    if (body.length > 5000) throw new Error('Komentar maksimal 5.000 karakter');
    return commentRepository.create({ ...input, body }, [...new Set(input.mentionedUserIds ?? [])].filter(Boolean));
  },
  remove: commentRepository.remove,
};
