import { supabase } from '../config/supabaseClient';
import type { IssueAttachment } from '../types/domain';

const BUCKET = 'issue-attachments';

function mapRow(row: any, url: string | null): IssueAttachment {
  return {
    id: row.id,
    issueId: row.issue_id,
    fileName: row.file_name,
    storagePath: row.storage_path,
    mimeType: row.mime_type,
    sizeBytes: Number(row.size_bytes),
    uploadedBy: row.uploaded_by,
    createdAt: row.created_at,
    url,
  };
}

async function withSignedUrl(row: any) {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(row.storage_path, 3600);
  if (error) throw error;
  return mapRow(row, data.signedUrl);
}

export const issueAttachmentRepository = {
  async findAllByIssue(issueId: string): Promise<IssueAttachment[]> {
    const { data, error } = await supabase.from('issue_attachments').select('*').eq('issue_id', issueId).order('created_at', { ascending: false });
    if (error) throw error;
    return Promise.all((data ?? []).map(withSignedUrl));
  },

  async upload(issueId: string, file: File, uploadedBy: string): Promise<IssueAttachment> {
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `${issueId}/${crypto.randomUUID()}-${safeName}`;
    const { error: uploadError } = await supabase.storage.from(BUCKET).upload(storagePath, file, { contentType: file.type, upsert: false });
    if (uploadError) throw uploadError;

    const { data, error } = await supabase
      .from('issue_attachments')
      .insert({ issue_id: issueId, file_name: file.name, storage_path: storagePath, mime_type: file.type || 'application/octet-stream', size_bytes: file.size, uploaded_by: uploadedBy })
      .select('*')
      .single();
    if (error) {
      await supabase.storage.from(BUCKET).remove([storagePath]);
      throw error;
    }
    return withSignedUrl(data);
  },

  async remove(attachment: IssueAttachment): Promise<void> {
    const { error: storageError } = await supabase.storage.from(BUCKET).remove([attachment.storagePath]);
    if (storageError) throw storageError;
    const { error } = await supabase.from('issue_attachments').delete().eq('id', attachment.id);
    if (error) throw error;
  },
};
