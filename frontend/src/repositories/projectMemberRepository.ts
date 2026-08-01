import { supabase } from '../config/supabaseClient';
import { mapProjectMemberWithProfileRow } from '../helpers/mappers';
import type { ProjectMemberRole, ProjectMemberWithProfile, ProjectPermissions } from '../types/domain';

export const projectMemberRepository = {
  async findAllByProject(projectId: string): Promise<ProjectMemberWithProfile[]> {
    const { data, error } = await supabase
      .from('project_members')
      .select('*, profile:profiles(*)')
      .eq('project_id', projectId)
      .order('created_at');
    if (error) throw error;
    return (data ?? []).map(mapProjectMemberWithProfileRow);
  },

  async findOwnAccess(projectId: string, _userId: string): Promise<{ role: ProjectMemberRole; permissions: ProjectPermissions } | null> {
    const { data, error } = await supabase.rpc('get_my_project_access', { p_project_id: projectId });
    if (error) throw error;
    const access = Array.isArray(data) ? data[0] : data;
    return access ? { role: access.role, permissions: access.permissions } : null;
  },

  async findOwnRole(projectId: string, userId: string): Promise<ProjectMemberRole | null> {
    const access = await this.findOwnAccess(projectId, userId);
    return access?.role ?? null;
  },

  async add(projectId: string, userId: string, role: ProjectMemberRole, permissions: ProjectPermissions): Promise<ProjectMemberWithProfile> {
    const { data, error } = await supabase
      .from('project_members')
      .insert({ project_id: projectId, user_id: userId, role, permissions, status: 'invited' })
      .select('*, profile:profiles(*)')
      .single();
    if (error) throw error;
    return mapProjectMemberWithProfileRow(data);
  },

  async updateRole(id: string, role: ProjectMemberRole): Promise<void> {
    const { data: permissions, error: permissionError } = await supabase.rpc('default_project_permissions', { p_role: role });
    if (permissionError) throw permissionError;
    const { error } = await supabase.from('project_members').update({ role, permissions }).eq('id', id);
    if (error) throw error;
  },

  async updatePermissions(id: string, permissions: ProjectPermissions): Promise<void> {
    const { error } = await supabase.from('project_members').update({ permissions }).eq('id', id);
    if (error) throw error;
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase.from('project_members').delete().eq('id', id);
    if (error) throw error;
  },

  async respondToInvitation(id: string, accept: boolean): Promise<void> {
    const { error } = await supabase.rpc('respond_to_project_invitation', {
      p_membership_id: id,
      p_accept: accept,
    });
    if (error) throw error;
  },
};
