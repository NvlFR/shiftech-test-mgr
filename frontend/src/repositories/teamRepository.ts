import { supabase } from '../config/supabaseClient';
import { mapProjectTeamRow, mapTeamRow, mapTeamWithMembersRow } from '../helpers/mappers';
import type { ProjectMemberRole, ProjectPermissions, ProjectTeam, Team, TeamWithMembers } from '../types/domain';

export const teamRepository = {
  async findAll(): Promise<Team[]> {
    const { data, error } = await supabase.from('teams').select('*').order('name');
    if (error) throw error;
    return (data ?? []).map(mapTeamRow);
  },
  async findAllWithMembers(): Promise<TeamWithMembers[]> {
    const { data, error } = await supabase.from('teams').select('*, team_members(profile:profiles(*))').order('name');
    if (error) throw error;
    return (data ?? []).map(mapTeamWithMembersRow);
  },
  async create(name: string, description: string | null): Promise<Team> {
    const { data, error } = await supabase.from('teams').insert({ name, description }).select('*').single();
    if (error) throw error;
    return mapTeamRow(data);
  },
  async update(id: string, name: string, description: string | null): Promise<void> {
    const { error } = await supabase.from('teams').update({ name, description }).eq('id', id);
    if (error) throw error;
  },
  async remove(id: string): Promise<void> {
    const { error } = await supabase.from('teams').delete().eq('id', id);
    if (error) throw error;
  },
  async setMembers(teamId: string, userIds: string[]): Promise<void> {
    const { error } = await supabase.rpc('set_team_members', { p_team_id: teamId, p_user_ids: userIds });
    if (error) throw error;
  },
  async findByProject(projectId: string): Promise<ProjectTeam[]> {
    const { data, error } = await supabase.from('project_teams').select('*, team:teams(*)').eq('project_id', projectId).order('created_at');
    if (error) throw error;
    return (data ?? []).map(mapProjectTeamRow);
  },
  async addToProject(projectId: string, teamId: string, role: ProjectMemberRole, permissions: ProjectPermissions): Promise<void> {
    const { error } = await supabase.from('project_teams').insert({ project_id: projectId, team_id: teamId, role, permissions });
    if (error) throw error;
  },
  async updateProjectAccess(id: string, role: ProjectMemberRole, permissions: ProjectPermissions): Promise<void> {
    const { error } = await supabase.from('project_teams').update({ role, permissions }).eq('id', id);
    if (error) throw error;
  },
  async removeFromProject(id: string): Promise<void> {
    const { error } = await supabase.from('project_teams').delete().eq('id', id);
    if (error) throw error;
  },
};
