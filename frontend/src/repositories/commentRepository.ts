import { supabase } from '../config/supabaseClient';
import { mapCommentRow } from '../helpers/mappers';
import type { Comment, CommentTargetType } from '../types/domain';

const commentSelect = '*, author:profiles!comments_author_id_fkey(*), comment_mentions(*, profile:profiles(*))';

export const commentRepository = {
  async findAll(targetType: CommentTargetType, targetId: string): Promise<Comment[]> {
    const { data, error } = await supabase.from('comments').select(commentSelect).eq('target_type', targetType).eq('target_id', targetId).order('created_at', { ascending: true });
    if (error) throw error;
    return (data ?? []).map(mapCommentRow);
  },
  async create(input: Pick<Comment, 'projectId' | 'targetType' | 'targetId' | 'authorId' | 'body'>, mentionedUserIds: string[]): Promise<Comment> {
    const { data, error } = await supabase.from('comments').insert({ project_id: input.projectId, target_type: input.targetType, target_id: input.targetId, author_id: input.authorId, body: input.body }).select(commentSelect).single();
    if (error) throw error;
    if (mentionedUserIds.length) {
      const { error: mentionError } = await supabase.from('comment_mentions').insert(mentionedUserIds.map((mentionedUserId) => ({ comment_id: data.id, mentioned_user_id: mentionedUserId })));
      if (mentionError) throw mentionError;
    }
    const { data: complete, error: reloadError } = await supabase.from('comments').select(commentSelect).eq('id', data.id).single();
    if (reloadError) throw reloadError;
    return mapCommentRow(complete);
  },
  async remove(id: string): Promise<void> {
    const { error } = await supabase.from('comments').delete().eq('id', id);
    if (error) throw error;
  },
};
