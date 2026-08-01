import { aiTestCaseRepository } from '../repositories/aiTestCaseRepository';
import { AiTestCaseSchema, validateAiTestCaseDraft } from '../helpers/aiTestCaseParser';
import { testCaseService } from './testCaseService';
import type { AiDuplicateCandidate, AiTestCaseCsvPreview, AiTestCaseDraft, AiTestCaseGenerationRequest, AiTestCaseGenerationResult, AiTestCaseSaveInput } from '../types/aiTestCase';
import type { TestCaseWithDetails } from '../types/domain';

function tokens(value: string) {
  return new Set(value.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').split(/\s+/).filter((token) => token.length > 2));
}

function similarity(left: string, right: string) {
  const a = tokens(left);
  const b = tokens(right);
  if (!a.size || !b.size) return 0;
  const intersection = [...a].filter((token) => b.has(token)).length;
  return intersection / (a.size + b.size - intersection);
}

const CSV_COLUMNS = ['Module', 'Title', 'Objective', 'Preconditions', 'Steps', 'Expected Result', 'Priority', 'Tags', 'Target Role', 'requirement_ref'];

function csvCell(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}

export const aiTestCaseService = {
  async generate(request: AiTestCaseGenerationRequest): Promise<AiTestCaseGenerationResult> {
    if (!request.projectId) throw new Error('Project wajib dipilih.');
    if (!request.source.content.trim()) throw new Error('Requirement wajib diisi.');
    if (request.options.maxCases < 1 || request.options.maxCases > 50) throw new Error('Jumlah test case harus antara 1 dan 50.');
    const result = await aiTestCaseRepository.generate(request);
    const drafts = result.drafts.slice(0, request.options.maxCases).map((draft) => validateAiTestCaseDraft(draft));
    if (!drafts.length) throw new Error('AI tidak menghasilkan test case yang valid.');
    return { ...result, drafts };
  },

  findPotentialDuplicates(draft: AiTestCaseDraft, existing: TestCaseWithDetails[]): AiDuplicateCandidate[] {
    return existing
      .map((testCase) => {
        const titleScore = similarity(draft.title, testCase.title);
        const behaviorScore = similarity(`${draft.steps} ${draft.expectedResult}`, `${testCase.steps} ${testCase.expectedResult}`);
        const confidence = Math.min(1, titleScore * 0.65 + behaviorScore * 0.35);
        const reason = titleScore >= behaviorScore
          ? 'Judul memiliki kemiripan dengan test case yang sudah ada.'
          : 'Langkah dan hasil yang diharapkan memiliki kemiripan.';
        return { testCase, confidence, reason };
      })
      .filter((candidate) => candidate.confidence >= 0.45)
      .sort((left, right) => right.confidence - left.confidence)
      .slice(0, 3);
  },

  buildCsvPreview(
    drafts: Array<AiTestCaseDraft & { moduleName?: string }>,
    existing: TestCaseWithDetails[],
  ): AiTestCaseCsvPreview {
    const rows = drafts.map((draft, index) => {
      const validation = AiTestCaseSchema.safeParse(draft);
      const problems = validation.success
        ? this.findPotentialDuplicates(draft, existing).map((candidate) => `Kemungkinan duplikat ${candidate.testCase.code} (${Math.round(candidate.confidence * 100)}%).`)
        : validation.error.issues.map((issue) => issue.message);
      return {
        rowNumber: index + 2,
        draft,
        moduleName: draft.moduleName ?? draft.module,
        status: (!validation.success ? 'invalid' : problems.length ? 'warning' : 'valid') as 'valid' | 'warning' | 'invalid',
        problems,
      };
    });
    const csvRows = rows.map(({ draft, moduleName }) => [
      moduleName, draft.title, draft.objective, draft.preconditions, draft.steps,
      draft.expectedResult, draft.priority, draft.tags.join(','), draft.targetRole,
      draft.requirementRef,
    ].map(csvCell).join(','));
    return {
      rows,
      csv: [CSV_COLUMNS.join(','), ...csvRows].join('\r\n'),
      invalidCount: rows.filter((row) => row.status === 'invalid').length,
      warningCount: rows.filter((row) => row.status === 'warning').length,
    };
  },

  async approveAndSave(input: AiTestCaseSaveInput) {
    const draft = validateAiTestCaseDraft(input.draft);
    const testCase = await testCaseService.create({
      projectId: input.projectId,
      moduleId: input.moduleId,
      title: draft.title,
      objective: draft.objective,
      preconditions: draft.preconditions,
      steps: draft.steps,
      expectedResult: draft.expectedResult,
      priority: draft.priority,
      status: 'draft',
      source: 'ai',
      aiBatchId: input.batchId,
      notes: draft.notes,
      tagNames: draft.tags,
    });
    return testCase;
  },
};
