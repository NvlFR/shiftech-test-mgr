import { issueService } from './issueService';
import { aiRepository } from '../repositories/aiRepository';
import {
  buildDuplicateReason,
  calculateDuplicateConfidence,
  formatDraftMetadata,
  parseAiIssueDraft,
  parseDuplicateCandidates,
  toIssuePriority,
} from '../helpers/aiValidators';
import type { Issue, TestResultWithDetails } from '../types/domain';
import type {
  AiActorContext,
  AiGatewayDuplicateRequest,
  AiGatewayIssueDraftRequest,
  AiIssueCandidateInput,
  AiIssueDraft,
  DuplicateIssueCandidate,
} from '../types/ai';

function assertActor(actor: AiActorContext) {
  if (!actor.userId || !actor.isApproved) throw new Error('User belum memiliki akses ke fitur AI');
}

export function assertAiProjectScope(projectId: string, actor: AiActorContext, sourceProjectId?: string | null) {
  assertActor(actor);
  if (!projectId.trim()) throw new Error('Project aktif wajib dipilih');
  if (sourceProjectId !== undefined && sourceProjectId !== projectId) {
    throw new Error('Data tidak termasuk dalam project aktif');
  }
}

function failedResultPayload(result: TestResultWithDetails) {
  return {
    id: result.id,
    status: result.status,
    notes: result.notes,
    testCase: {
      id: result.testCase.id,
      projectId: result.testCase.projectId,
      code: result.testCase.code,
      title: result.testCase.title,
      objective: result.testCase.objective,
      preconditions: result.testCase.preconditions,
      steps: result.testCase.steps,
      expectedResult: result.testCase.expectedResult,
      priority: result.testCase.priority,
    },
  } satisfies AiGatewayIssueDraftRequest['result'];
}

function candidatePayload(issues: Awaited<ReturnType<typeof issueService.listByProject>>): AiIssueCandidateInput[] {
  return issues.map((issue) => ({
    id: issue.id,
    code: issue.code,
    testResultId: issue.testResultId,
    title: issue.title,
    description: issue.description,
    actualResult: issue.actualResult,
    expectedResult: issue.expectedResult,
    priority: issue.priority,
    status: issue.status,
  }));
}

export const aiIssueService = {
  async draftFromFailedResult(input: { projectId: string; result: TestResultWithDetails; actor: AiActorContext }): Promise<AiIssueDraft> {
    assertAiProjectScope(input.projectId, input.actor, input.result.testCase.projectId);
    if (input.result.status !== 'fail') throw new Error('Draft Issue AI hanya dapat dibuat dari Test Result FAIL');

    const response = await aiRepository.invoke({
      action: 'issue_draft',
      projectId: input.projectId,
      result: failedResultPayload(input.result),
    });
    const draft = parseAiIssueDraft(response && typeof response === 'object' && 'draft' in response ? response.draft : response);
    if (draft.projectId !== input.projectId) throw new Error('Draft AI merujuk ke project yang berbeda');
    if (draft.testResultId !== input.result.id) throw new Error('Draft AI merujuk ke Test Result yang berbeda');
    return draft;
  },

  async detectDuplicates(input: { projectId: string; draft: AiIssueDraft; actor: AiActorContext }): Promise<DuplicateIssueCandidate[]> {
    assertAiProjectScope(input.projectId, input.actor);
    const draft = parseAiIssueDraft(input.draft);
    if (draft.projectId !== input.projectId) throw new Error('Draft Issue bukan milik project aktif');
    const issues = await issueService.listByProject(input.projectId);
    const knownIssueIds = new Set(issues.map((issue) => issue.id));
    const response = await aiRepository.invoke({
      action: 'duplicate_issue_detection',
      projectId: input.projectId,
      draft,
      candidates: candidatePayload(issues),
    } satisfies AiGatewayDuplicateRequest);

    return parseDuplicateCandidates(response && typeof response === 'object' && 'candidates' in response ? response : { candidates: [] })
      .filter((candidate) => knownIssueIds.has(candidate.issueId))
      .map((candidate) => {
        const issue = issues.find((item) => item.id === candidate.issueId);
        if (!issue) return null;
        const confidence = candidate.confidence ?? calculateDuplicateConfidence(draft, issue);
        return {
          issueId: candidate.issueId,
          confidence,
          reason: candidate.reason ?? buildDuplicateReason(confidence),
        };
      })
      .filter((candidate): candidate is DuplicateIssueCandidate => candidate !== null)
      .sort((left, right) => right.confidence - left.confidence);
  },

  async saveReviewedDraft(input: {
    projectId: string;
    draft: AiIssueDraft;
    actor: AiActorContext;
    reviewed: boolean;
    duplicateAcknowledged: boolean;
  }): Promise<Issue> {
    assertAiProjectScope(input.projectId, input.actor);
    if (!input.reviewed) throw new Error('Draft Issue harus direview sebelum disimpan');
    if (!input.duplicateAcknowledged) throw new Error('Hasil duplicate detection harus ditinjau sebelum menyimpan Issue');

    const draft = parseAiIssueDraft(input.draft);
    const issue = await issueService.create({
      testResultId: draft.testResultId,
      title: draft.title,
      description: formatDraftMetadata(draft),
      actualResult: draft.actualResult,
      expectedResult: draft.expectedResult,
      priority: toIssuePriority(draft.priority),
    });
    await aiRepository.recordApproval({ projectId: input.projectId, targetType: 'issue', targetId: issue.id });
    return issue;
  },
};
