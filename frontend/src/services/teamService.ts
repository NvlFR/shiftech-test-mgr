import { teamRepository } from '../repositories/teamRepository';
import { DEFAULT_PROJECT_PERMISSIONS } from './projectMemberService';
import type { ProjectMemberRole } from '../types/domain';

function requiredName(name: string) {
  const value = name.trim();
  if (!value) throw new Error('Nama team wajib diisi');
  return value;
}

export const teamService = {
  list: () => teamRepository.findAll(),
  listWithMembers: () => teamRepository.findAllWithMembers(),
  create: (name: string, description: string) => teamRepository.create(requiredName(name), description.trim() || null),
  update: (id: string, name: string, description: string) => teamRepository.update(id, requiredName(name), description.trim() || null),
  remove: (id: string) => teamRepository.remove(id),
  setMembers: (teamId: string, userIds: string[]) => teamRepository.setMembers(teamId, [...new Set(userIds)]),
  listByProject: (projectId: string) => teamRepository.findByProject(projectId),
  addToProject: (projectId: string, teamId: string, role: ProjectMemberRole) => teamRepository.addToProject(projectId, teamId, role, DEFAULT_PROJECT_PERMISSIONS[role]),
  updateProjectAccess: (id: string, role: ProjectMemberRole) => teamRepository.updateProjectAccess(id, role, DEFAULT_PROJECT_PERMISSIONS[role]),
  removeFromProject: (id: string) => teamRepository.removeFromProject(id),
};
