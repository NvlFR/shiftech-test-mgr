import { projectMemberRepository } from '../repositories/projectMemberRepository';
import type { ProjectMemberRole } from '../types/domain';

export const projectMemberService = {
  listByProject(projectId: string) {
    return projectMemberRepository.findAllByProject(projectId);
  },

  getOwnRole(projectId: string, userId: string) {
    return projectMemberRepository.findOwnRole(projectId, userId);
  },

  add(projectId: string, userId: string, role: ProjectMemberRole = 'member') {
    return projectMemberRepository.add(projectId, userId, role);
  },

  changeRole(id: string, role: ProjectMemberRole) {
    return projectMemberRepository.updateRole(id, role);
  },

  remove(id: string) {
    return projectMemberRepository.remove(id);
  },

  respondToInvitation(id: string, accept: boolean) {
    return projectMemberRepository.respondToInvitation(id, accept);
  },
};
