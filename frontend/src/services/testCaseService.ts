import { testCaseRepository } from '../repositories/testCaseRepository';
import { tagService } from './tagService';
import type { TestCase } from '../types/domain';

export const testCaseService = {
  listByProject(projectId: string) {
    return testCaseRepository.findAllByProject(projectId);
  },

  listByProjectWithDetails(projectId: string) {
    return testCaseRepository.findAllByProjectWithDetails(projectId);
  },

  getById(id: string) {
    return testCaseRepository.findById(id);
  },

  getByIdWithDetails(id: string) {
    return testCaseRepository.findByIdWithDetails(id);
  },

  async create(input: {
    projectId: string;
    moduleId: string | null;
    code?: string;
    title: string;
    objective?: string;
    steps: string;
    expectedResult: string;
    preconditions?: string;
    priority?: TestCase['priority'];
    notes?: string;
    tagNames?: string[];
  }): Promise<TestCase> {
    if (!input.title.trim()) throw new Error('Judul test case tidak boleh kosong');
    if (!input.steps.trim()) throw new Error('Langkah pengujian tidak boleh kosong');
    if (!input.expectedResult.trim()) throw new Error('Hasil yang diharapkan tidak boleh kosong');

    const testCase = await testCaseRepository.create({
      projectId: input.projectId,
      moduleId: input.moduleId,
      code: input.code?.trim() || null,
      title: input.title.trim(),
      objective: input.objective?.trim() || null,
      preconditions: input.preconditions?.trim() || null,
      steps: input.steps.trim(),
      expectedResult: input.expectedResult.trim(),
      priority: input.priority ?? 'medium',
      status: 'active',
      notes: input.notes?.trim() || null,
    });

    if (input.tagNames?.length) {
      await tagService.saveTagsForTestCase(input.projectId, testCase.id, input.tagNames);
    }

    return testCase;
  },

  async update(
    id: string,
    projectId: string,
    changes: Partial<Omit<TestCase, 'id' | 'projectId' | 'createdAt' | 'updatedAt'>>,
    tagNames?: string[],
  ) {
    const testCase = await testCaseRepository.update(id, changes);
    if (tagNames !== undefined) {
      await tagService.saveTagsForTestCase(projectId, id, tagNames);
    }
    return testCase;
  },

  archive(id: string) {
    return testCaseRepository.update(id, { status: 'archived' });
  },

  reactivate(id: string) {
    return testCaseRepository.update(id, { status: 'active' });
  },

  remove(id: string) {
    return testCaseRepository.remove(id);
  },
};
