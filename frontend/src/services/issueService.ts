import { issueRepository } from '../repositories/issueRepository';
import { testResultRepository } from '../repositories/testResultRepository';
import type { ExternalLink, Issue, IssuePriority, IssueType } from '../types/domain';

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

  async create(input: {
    testResultId: string;
    title: string;
    description?: string;
    actualResult?: string;
    expectedResult?: string;
    priority?: IssuePriority;
  }) {
    if (!input.title.trim()) throw new Error('Judul issue tidak boleh kosong');
    // Domain rule (PRD): an Issue is filed against a FAILED test result. Enforce here so every
    // caller (manual dialog, AI workflow, future automation) is bound by it, not just the UI.
    const context = await testResultRepository.findExecutionContext(input.testResultId);
    if (!context) throw new Error('Test result tidak ditemukan');
    if (context.resultStatus !== 'fail') throw new Error('Issue hanya bisa dibuat untuk hasil yang FAIL');
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
    input: { title: string; description?: string; actualResult?: string; expectedResult?: string; priority: IssuePriority; type?: IssueType; targetRoleId?: string | null; externalLinks?: ExternalLink[] },
  ) {
    if (!input.title.trim()) throw new Error('Judul issue tidak boleh kosong');
    return issueRepository.update(id, {
      title: input.title.trim(),
      description: input.description?.trim() || null,
      actualResult: input.actualResult?.trim() || null,
      expectedResult: input.expectedResult?.trim() || null,
      priority: input.priority,
      type: input.type,
      targetRoleId: input.targetRoleId,
      externalLinks: input.externalLinks?.filter((link) => link.url.trim()).map((link) => ({ label: link.label.trim(), url: link.url.trim() })),
    } satisfies Partial<Issue>);
  },

  changeStatus: issueRepository.updateStatus,
  assign: issueRepository.assign,
  remove: issueRepository.remove,
};
