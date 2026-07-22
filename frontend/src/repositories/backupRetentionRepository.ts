import { supabase } from '../config/supabaseClient';
import { mapRestorePreviewRow, mapRestoreResultRow, mapRetentionCleanupPreviewRow, mapRetentionCleanupResultRow, mapRetentionPolicyRow } from '../helpers/mappers';
import type { RetentionCleanupPreview, RetentionCleanupResult, RestorePreview, RestoreResult } from '../types/domain';

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
async function restorePreview(backupData: Record<string, unknown>): Promise<RestorePreview> { return mapRestorePreviewRow(await rpc('preview_project_restore', { p_backup: backupData })); }
async function restore(projectId: string, backupData: Record<string, unknown>): Promise<RestoreResult> { return mapRestoreResultRow(await rpc('restore_project_backup', { p_project_id: projectId, p_backup: backupData, p_confirm: true, p_duplicate_mode: 'skip' })); }
async function cleanupPreview(projectId: string | null): Promise<RetentionCleanupPreview> { return mapRetentionCleanupPreviewRow(await rpc('preview_retention_cleanup', { p_project_id: projectId })); }
async function cleanup(projectId: string | null): Promise<RetentionCleanupResult> { return mapRetentionCleanupResultRow(await rpc('cleanup_retention', { p_project_id: projectId, p_confirm: true })); }

export const backupRetentionRepository = { getPolicy, savePolicy, backup, restorePreview, restore, cleanupPreview, cleanup };
