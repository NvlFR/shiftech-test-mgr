import { beforeEach, describe, expect, it, vi } from 'vitest';
import { makeTestCase } from '../test';
import type { AiTestCaseDraft } from '../types/aiTestCase';

const dependencies = vi.hoisted(() => ({
  generate: vi.fn(),
  listByProjectWithDetails: vi.fn(),
  create: vi.fn(),
  reviewAiDrafts: vi.fn(),
}));

vi.mock('../repositories/aiTestCaseRepository', () => ({
  aiTestCaseRepository: { generate: dependencies.generate },
}));

vi.mock('./testCaseService', () => ({
  testCaseService: {
    listByProjectWithDetails: dependencies.listByProjectWithDetails,
    create: dependencies.create,
    reviewAiDrafts: dependencies.reviewAiDrafts,
  },
}));

import { aiTestCaseService } from './aiTestCaseService';

const draft: AiTestCaseDraft = {
  requirementRef: 'REQ-LOGIN-01',
  scenarioType: 'happy_path',
  module: 'Authentication',
  title: 'User can sign in',
  objective: 'Verify authentication',
  preconditions: 'User is registered',
  steps: '1. Submit valid credentials',
  expectedResult: 'Dashboard is displayed',
  priority: 'high',
  tags: ['regression'],
  targetRole: 'Member',
  notes: '',
  scenarios: [],
  edgeCases: [],
};

describe('aiTestCaseService human approval invariants', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dependencies.listByProjectWithDetails.mockResolvedValue([]);
    dependencies.create.mockResolvedValue(makeTestCase({
      status: 'draft',
      source: 'ai',
      aiBatchId: 'batch-1',
    }));
  });

  it('persists an AI-generated test case as draft without approving it', async () => {
    const saved = await aiTestCaseService.approveAndSave({
      projectId: 'project-1',
      moduleId: 'module-1',
      draft,
      batchId: 'batch-1',
      duplicateAcknowledged: false,
    });

    expect(dependencies.create).toHaveBeenCalledWith(expect.objectContaining({
      status: 'draft',
      source: 'ai',
      aiBatchId: 'batch-1',
    }));
    expect(dependencies.reviewAiDrafts).not.toHaveBeenCalled();
    expect(saved).toMatchObject({ status: 'draft', source: 'ai' });
  });
});
