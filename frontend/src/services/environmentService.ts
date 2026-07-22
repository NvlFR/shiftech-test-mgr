import { environmentRepository } from '../repositories/environmentRepository';

export const environmentService = {
  listByProject(projectId: string) {
    return environmentRepository.findAllByProject(projectId);
  },

  async create(input: { projectId: string; name: string; baseUrl?: string }) {
    const name = input.name.trim();
    if (!name) throw new Error('Nama environment tidak boleh kosong');
    const baseUrl = input.baseUrl?.trim() || null;
    if (baseUrl) {
      try { new URL(baseUrl); } catch { throw new Error('Base URL environment tidak valid'); }
    }
    return environmentRepository.create({ projectId: input.projectId, name, baseUrl });
  },

  async update(id: string, input: { name: string; baseUrl?: string }) {
    const name = input.name.trim();
    if (!name) throw new Error('Nama environment tidak boleh kosong');
    const baseUrl = input.baseUrl?.trim() || null;
    if (baseUrl) {
      try { new URL(baseUrl); } catch { throw new Error('Base URL environment tidak valid'); }
    }
    return environmentRepository.update(id, { name, baseUrl });
  },

  remove(id: string) {
    return environmentRepository.remove(id);
  },
};
