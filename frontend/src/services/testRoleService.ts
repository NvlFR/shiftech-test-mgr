import { testRoleRepository } from '../repositories/testRoleRepository';

export const testRoleService = {
  listByProject(projectId: string) {
    return testRoleRepository.findAllByProject(projectId);
  },

  async create(input: { projectId: string; name: string }) {
    const name = input.name.trim();
    if (!name) throw new Error('Nama test role tidak boleh kosong');
    return testRoleRepository.create({ projectId: input.projectId, name });
  },

  async update(id: string, input: { name: string }) {
    const name = input.name.trim();
    if (!name) throw new Error('Nama test role tidak boleh kosong');
    return testRoleRepository.update(id, { name });
  },

  remove(id: string) {
    return testRoleRepository.remove(id);
  },
};
