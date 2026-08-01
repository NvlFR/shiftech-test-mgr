import { projectMemberRepository } from '../repositories/projectMemberRepository';
import type { ProjectMemberRole, ProjectPermissions } from '../types/domain';

export const DEFAULT_PROJECT_PERMISSIONS: Record<ProjectMemberRole, ProjectPermissions> = {
  manager: { view: true, create: true, update: true, delete: true, import: true, export: true, run_automation: true },
  supervisor: { view: true, create: true, update: true, delete: false, import: true, export: true, run_automation: false },
  tester: { view: true, create: false, update: true, delete: false, import: false, export: true, run_automation: true },
  member: { view: true, create: false, update: false, delete: false, import: false, export: false, run_automation: false },
};

export const projectMemberService = {
  listByProject(projectId: string) {
    return projectMemberRepository.findAllByProject(projectId);
  },

  getOwnAccess(projectId: string, userId: string) {
    return projectMemberRepository.findOwnAccess(projectId, userId);
  },

  add(projectId: string, userId: string, role: ProjectMemberRole = 'member') {
    return projectMemberRepository.add(projectId, userId, role, DEFAULT_PROJECT_PERMISSIONS[role]);
  },

  changeRole(id: string, role: ProjectMemberRole) {
    return projectMemberRepository.updateRole(id, role);
  },

  changePermissions(id: string, permissions: ProjectPermissions) {
    if (!permissions.view && Object.entries(permissions).some(([key, enabled]) => key !== 'view' && enabled)) {
      throw new Error('Permission view wajib aktif jika permission lain diberikan');
    }
    return projectMemberRepository.updatePermissions(id, permissions);
  },

  remove(id: string) {
    return projectMemberRepository.remove(id);
  },

  respondToInvitation(id: string, accept: boolean) {
    return projectMemberRepository.respondToInvitation(id, accept);
  },
};
