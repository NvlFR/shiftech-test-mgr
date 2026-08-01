import { supabase } from '../config/supabaseClient';
import { mapRestorePreviewRow, mapRestoreResultRow, mapRetentionCleanupPreviewRow, mapRetentionCleanupResultRow, mapRetentionPolicyRow } from '../helpers/mappers';
import type { RetentionCleanupPreview, RetentionCleanupResult, RestorePreview, RestoreResult } from '../types/domain';
import type { BackupStorageObject } from '../types/domain';

async function rpc<T>(name: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.rpc(name, args);
  if (error) throw error;
  return data as T;
}

async function getPolicy(projectId: string | null) {
  let query = supabase.from('retention_policies').select('*');
  query = projectId ? query.eq('project_id', projectId) : query.is('project_id', null);
  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  return data ? mapRetentionPolicyRow(data) : null;
}

async function savePolicy(input: { projectId: string | null; retentionDays: number; attachmentRetentionDays: number | null; enabled: boolean; createdBy: string }) {
  const existing = await getPolicy(input.projectId);
  const payload = { retention_days: input.retentionDays, attachment_retention_days: input.attachmentRetentionDays, enabled: input.enabled, created_by: input.createdBy };
  const query = existing
    ? supabase.from('retention_policies').update(payload).eq('id', existing.id)
    : supabase.from('retention_policies').insert({ ...payload, project_id: input.projectId });
  const { data, error } = await query.select('*').single();
  if (error) throw error;
  return mapRetentionPolicyRow(data);
}

async function backup(projectId: string): Promise<Record<string, unknown>> { return rpc('project_backup', { p_project_id: projectId }); }
async function downloadStorageObject(bucket: BackupStorageObject['bucket'], path: string): Promise<Blob> {
  const { data, error } = await supabase.storage.from(bucket).download(path);
  if (error) throw error;
  return data;
}
async function uploadStorageObject(object: BackupStorageObject): Promise<boolean> {
  const bytes = Uint8Array.from(atob(object.base64), (character) => character.charCodeAt(0));
  const { error } = await supabase.storage.from(object.bucket).upload(object.path, bytes, { contentType: object.mimeType, upsert: false });
  if (!error) return true;
  if ('statusCode' in error && String(error.statusCode) === '409') return false;
  throw error;
}
async function restorePreview(backupData: Record<string, unknown>): Promise<RestorePreview> {
  const row = await rpc<Record<string, unknown>>('preview_project_restore', { p_backup: { ...backupData, version: 1 } });
  return mapRestorePreviewRow({ ...row, storage_objects: Array.isArray(backupData.storage_objects) ? backupData.storage_objects.length : 0 });
}
async function restore(projectId: string, backupData: Record<string, unknown>): Promise<RestoreResult> { return mapRestoreResultRow(await rpc('restore_project_backup', { p_project_id: projectId, p_backup: backupData, p_confirm: true, p_duplicate_mode: 'skip' })); }
async function cleanupPreview(projectId: string | null): Promise<RetentionCleanupPreview> { return mapRetentionCleanupPreviewRow(await rpc('preview_retention_cleanup', { p_project_id: projectId })); }
async function cleanup(projectId: string | null): Promise<RetentionCleanupResult> { return mapRetentionCleanupResultRow(await rpc('cleanup_retention', { p_project_id: projectId, p_confirm: true })); }

export const backupRetentionRepository = { getPolicy, savePolicy, backup, downloadStorageObject, uploadStorageObject, restorePreview, restore, cleanupPreview, cleanup };
