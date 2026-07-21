import { tagRepository } from '../repositories/tagRepository';

export const tagService = {
  listByProject(projectId: string) {
    return tagRepository.findAllByProject(projectId);
  },

  listForTestCase(testCaseId: string) {
    return tagRepository.findTagsForTestCase(testCaseId);
  },

  rename(id: string, name: string) {
    if (!name.trim()) throw new Error('Nama tag tidak boleh kosong');
    return tagRepository.update(id, name.trim());
  },

  remove(id: string) {
    return tagRepository.remove(id);
  },

  // Creatable dropdown: resolves each name to an existing tag or creates it,
  // then replaces the test case's tag set with the resolved ids.
  async saveTagsForTestCase(projectId: string, testCaseId: string, tagNames: string[]) {
    const uniqueNames = [...new Set(tagNames.map((name) => name.trim()).filter(Boolean))];
    const tags = await Promise.all(uniqueNames.map((name) => tagRepository.findOrCreate(projectId, name)));
    await tagRepository.setTagsForTestCase(testCaseId, tags.map((tag) => tag.id));
    return tags;
  },
};
