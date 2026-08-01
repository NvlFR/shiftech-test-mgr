import { issueRepository } from '../repositories/issueRepository';
import { testResultRepository } from '../repositories/testResultRepository';
import type { ExternalLink, Issue, IssuePriority, IssueType } from '../types/domain';

const MAX_TITLE_LENGTH = 255;
const VALID_PRIORITIES: readonly IssuePriority[] = ['low', 'medium', 'high', 'critical'];
const VALID_TYPES: readonly IssueType[] = ['bug', 'feature', 'improvement', 'task'];

function validateIssueInput(input: { title: string; priority?: IssuePriority; type?: IssueType }) {
  if (!input.title.trim()) throw new Error('Judul issue tidak boleh kosong');
  if (input.title.trim().length > MAX_TITLE_LENGTH) throw new Error(`Judul issue maksimal ${MAX_TITLE_LENGTH} karakter`);
  if (input.priority && !VALID_PRIORITIES.includes(input.priority)) throw new Error('Prioritas issue tidak dikenal');
  if (input.type && !VALID_TYPES.includes(input.type)) throw new Error('Tipe issue tidak dikenal');
}

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
    validateIssueInput(input);
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

  async createAiDraft(input: {
    testResultId: string;
    title: string;
    description?: string;
    actualResult?: string;
    expectedResult?: string;
    priority?: IssuePriority;
  }) {
    validateIssueInput(input);
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
      status: 'draft',
      assignedTo: null,
    });
  },

  update(
    id: string,
    input: { title: string; description?: string; actualResult?: string; expectedResult?: string; priority: IssuePriority; type?: IssueType; targetRoleId?: string | null; externalLinks?: ExternalLink[] },
  ) {
    validateIssueInput(input);
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
