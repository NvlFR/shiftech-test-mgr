import { supabase } from '../config/supabaseClient';
import { mapAttachmentRow } from '../helpers/mappers';
import type { Attachment, AttachmentEntityKind } from '../types/domain';

const BUCKET = 'test-attachments';

async function withSignedUrl(row: any): Promise<Attachment> {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(row.storage_path, 3600);
  if (error) throw error;
  return mapAttachmentRow(row, data.signedUrl);
}

function pathFor(kind: AttachmentEntityKind, entityId: string, file: File) {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  return `${kind}/${entityId}/${crypto.randomUUID()}-${safeName}`;
}

async function findAll(kind: AttachmentEntityKind, entityId: string) {
  const column = kind === 'test_case' ? 'test_case_id' : 'test_run_id';
  const { data, error } = await supabase.from('attachments').select('*').eq(column, entityId).order('created_at', { ascending: false });
  if (error) throw error;
  return Promise.all((data ?? []).map(withSignedUrl));
}

async function upload(kind: AttachmentEntityKind, entityId: string, file: File, uploadedBy: string) {
  const storagePath = pathFor(kind, entityId, file);
  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(storagePath, file, {
    contentType: file.type || 'application/octet-stream',
    upsert: false,
  });
  if (uploadError) throw uploadError;

  const payload = {
    entity_kind: kind,
    test_case_id: kind === 'test_case' ? entityId : null,
    test_run_id: kind === 'test_run' ? entityId : null,
    file_name: file.name,
    storage_path: storagePath,
    mime_type: file.type || 'application/octet-stream',
    size_bytes: file.size,
    uploaded_by: uploadedBy,
  };
  const { data, error } = await supabase.from('attachments').insert(payload).select('*').single();
  if (error) {
    await supabase.storage.from(BUCKET).remove([storagePath]);
    throw error;
  }
  return withSignedUrl(data);
}

async function remove(attachment: Attachment) {
  const { error: storageError } = await supabase.storage.from(BUCKET).remove([attachment.storagePath]);
  if (storageError) throw storageError;
  const { error } = await supabase.from('attachments').delete().eq('id', attachment.id);
  if (error) throw error;
}

export const attachmentRepository = { findAll, upload, remove };
