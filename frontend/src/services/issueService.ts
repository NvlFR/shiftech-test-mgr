import { issueRepository } from '../repositories/issueRepository';
import type { Issue, IssuePriority } from '../types/domain';

export const issueService = {
  getById(id: string) {
    return issueRepository.findById(id);
  },

  listByTestResult(testResultId: string) {
    return issueRepository.findAllByTestResult(testResultId);
  },

  listByTestRun(testRunId: string) {
    return issueRepository.findAllByTestRun(testRunId);
  },

  listByProject(projectId: string) {
    return issueRepository.findAllByProject(projectId);
  },

  create(input: {
    testResultId: string;
    title: string;
    description?: string;
    actualResult?: string;
    expectedResult?: string;
    priority?: IssuePriority;
  }) {
    if (!input.title.trim()) throw new Error('Judul issue tidak boleh kosong');
    return issueRepository.create({
      testResultId: input.testResultId,
      title: input.title.trim(),
      description: input.description?.trim() || null,
      actualResult: input.actualResult?.trim() || null,
      expectedResult: input.expectedResult?.trim() || null,
      priority: input.priority ?? 'medium',
      status: 'open',
      assignedTo: null,
    });
  },

  update(
    id: string,
    input: { title: string; description?: string; actualResult?: string; expectedResult?: string; priority: IssuePriority },
  ) {
    if (!input.title.trim()) throw new Error('Judul issue tidak boleh kosong');
    return issueRepository.update(id, {
      title: input.title.trim(),
      description: input.description?.trim() || null,
      actualResult: input.actualResult?.trim() || null,
      expectedResult: input.expectedResult?.trim() || null,
      priority: input.priority,
    } satisfies Partial<Issue>);
  },

  changeStatus: issueRepository.updateStatus,
  assign: issueRepository.assign,
  remove: issueRepository.remove,
};
