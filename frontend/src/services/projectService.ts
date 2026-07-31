import { projectRepository, type ProjectQuery } from '../repositories/projectRepository';
import type { ProjectStatus, ProjectVisibility } from '../types/domain';

export const projectService = {
  list(query?: ProjectQuery) {
    return projectRepository.findAll(query);
  },

  getById(id: string) {
    return projectRepository.findById(id);
  },

  async create(input: { name: string; description?: string; visibility?: ProjectVisibility }) {
    if (!input.name.trim()) throw new Error('Nama project tidak boleh kosong');
    return projectRepository.create({ name: input.name.trim(), description: input.description?.trim() || null, visibility: input.visibility });
  },

  async update(id: string, input: { name: string; description?: string; visibility?: ProjectVisibility }) {
    if (!input.name.trim()) throw new Error('Nama project tidak boleh kosong');
    return projectRepository.update(id, { name: input.name.trim(), description: input.description?.trim() || null, visibility: input.visibility });
  },

  changeStatus(id: string, status: ProjectStatus) {
    return projectRepository.updateStatus(id, status);
  },

  archive(id: string) {
    return projectRepository.updateStatus(id, 'archived');
  },

  restore(id: string) {
    return projectRepository.updateStatus(id, 'active');
  },

  deletePermanently(id: string) {
    return projectRepository.deletePermanently(id);
  },
};
