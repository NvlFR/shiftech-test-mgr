import type { TestCasePriority, TestCaseWithDetails } from './domain';

export const AI_TEST_CASE_SOURCE_TYPES = ['text', 'excel', 'document'] as const;
export type AiTestCaseSourceType = (typeof AI_TEST_CASE_SOURCE_TYPES)[number];

export interface AiTestCaseSource {
  type: AiTestCaseSourceType;
  content: string;
  fileName?: string;
}

export interface AiTestCaseGenerationOptions {
  includeScenarios: boolean;
  includeEdgeCases: boolean;
  maxCases: number;
}

export interface AiTestCaseGenerationRequest {
  projectId: string;
  source: AiTestCaseSource;
  options: AiTestCaseGenerationOptions;
}

export interface AiTestCaseDraft {
  requirementRef: string;
  scenarioType: 'happy_path' | 'negative' | 'edge_case';
  module: string;
  title: string;
  objective: string;
  preconditions: string;
  steps: string;
  expectedResult: string;
  priority: TestCasePriority;
  tags: string[];
  targetRole: string;
  notes: string;
  scenarios: string[];
  edgeCases: string[];
}

export interface AiTestCaseCsvPreviewRow {
  rowNumber: number;
  draft: AiTestCaseDraft;
  moduleName: string;
  status: 'valid' | 'warning' | 'invalid';
  problems: string[];
}

export interface AiTestCaseCsvPreview {
  rows: AiTestCaseCsvPreviewRow[];
  csv: string;
  invalidCount: number;
  warningCount: number;
}

export interface AiTestCaseGenerationResult {
  drafts: AiTestCaseDraft[];
  provider: string;
  model: string | null;
  promptVersion: string | null;
}

export interface AiDuplicateCandidate {
  testCase: TestCaseWithDetails;
  confidence: number;
  reason: string;
}

export interface AiTestCaseSaveInput {
  projectId: string;
  moduleId: string | null;
  draft: AiTestCaseDraft;
}
