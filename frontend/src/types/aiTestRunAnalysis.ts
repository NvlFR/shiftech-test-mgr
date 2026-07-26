import type { TestCasePriority, TestRunSummary } from './domain';

export const AI_GATEWAY_FUNCTION = 'ai-gateway';
export const AI_TEST_RUN_ANALYSIS_ACTION = 'test_run_analysis';
export const AI_TEST_RUN_ANALYSIS_CONTRACT_VERSION = 'v1';

export type AiReviewStatus = 'draft' | 'review_required';
export type AiRiskLevel = 'low' | 'medium' | 'high' | 'critical';

/**
 * Contract frontend -> Supabase Edge Function.
 *
 * Only opaque entity IDs are sent. The gateway must re-check authentication,
 * project membership and RLS before it loads any project data.
 */
export interface AiTestRunAnalysisRequest {
  contractVersion: typeof AI_TEST_RUN_ANALYSIS_CONTRACT_VERSION;
  action: typeof AI_TEST_RUN_ANALYSIS_ACTION;
  projectId: string;
  testRunId: string;
}

export interface AiFailurePattern {
  pattern: string;
  occurrences: number;
  severity: AiRiskLevel;
  testCaseIds: string[];
  evidence: string;
}

export interface AiRiskArea {
  area: string;
  riskLevel: AiRiskLevel;
  rationale: string;
  testCaseIds: string[];
}

export interface AiRetestRecommendation {
  testCaseId: string;
  testCaseCode: string;
  title: string;
  reason: string;
  priority: TestCasePriority;
  confidence: number;
  suggestedScope: string;
}

export interface AiTestRunAnalysisResponse {
  contractVersion: typeof AI_TEST_RUN_ANALYSIS_CONTRACT_VERSION;
  action: typeof AI_TEST_RUN_ANALYSIS_ACTION;
  projectId: string;
  testRunId: string;
  mode: 'review_only';
  reviewStatus: AiReviewStatus;
  provider: string;
  model: string;
  promptVersion: string;
  generatedAt: string;
  summary: TestRunSummary;
  regressionSummary: string;
  failurePatterns: AiFailurePattern[];
  riskAreas: AiRiskArea[];
  retestRecommendations: AiRetestRecommendation[];
}
