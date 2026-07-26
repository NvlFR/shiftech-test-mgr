import { z } from 'zod';
import {
  AI_TEST_RUN_ANALYSIS_ACTION,
  AI_TEST_RUN_ANALYSIS_CONTRACT_VERSION,
} from '../types/aiTestRunAnalysis';

const summarySchema = z.object({
  total: z.number().int().nonnegative(),
  executed: z.number().int().nonnegative(),
  progressPercent: z.number().int().min(0).max(100),
  pass: z.number().int().nonnegative(),
  fail: z.number().int().nonnegative(),
  skip: z.number().int().nonnegative(),
  blocked: z.number().int().nonnegative(),
  notRun: z.number().int().nonnegative(),
}).strict();

const riskLevelSchema = z.enum(['low', 'medium', 'high', 'critical']);

const failurePatternSchema = z.object({
  pattern: z.string().trim().min(1).max(500),
  occurrences: z.number().int().positive(),
  severity: riskLevelSchema,
  testCaseIds: z.array(z.string().uuid()),
  evidence: z.string().trim().min(1).max(2_000),
}).strict();

const riskAreaSchema = z.object({
  area: z.string().trim().min(1).max(300),
  riskLevel: riskLevelSchema,
  rationale: z.string().trim().min(1).max(2_000),
  testCaseIds: z.array(z.string().uuid()),
}).strict();

const retestRecommendationSchema = z.object({
  testCaseId: z.string().uuid(),
  testCaseCode: z.string().trim().min(1).max(100),
  title: z.string().trim().min(1).max(500),
  reason: z.string().trim().min(1).max(2_000),
  priority: z.enum(['low', 'medium', 'high', 'critical']),
  confidence: z.number().min(0).max(1),
  suggestedScope: z.string().trim().min(1).max(1_000),
}).strict();

export const aiTestRunAnalysisResponseSchema = z.object({
  contractVersion: z.literal(AI_TEST_RUN_ANALYSIS_CONTRACT_VERSION),
  action: z.literal(AI_TEST_RUN_ANALYSIS_ACTION),
  projectId: z.string().uuid(),
  testRunId: z.string().uuid(),
  mode: z.literal('review_only'),
  reviewStatus: z.enum(['draft', 'review_required']),
  provider: z.string().trim().min(1).max(100),
  model: z.string().trim().min(1).max(200),
  promptVersion: z.string().trim().min(1).max(100),
  generatedAt: z.string().datetime(),
  summary: summarySchema,
  regressionSummary: z.string().trim().min(1).max(5_000),
  failurePatterns: z.array(failurePatternSchema).max(100),
  riskAreas: z.array(riskAreaSchema).max(100),
  retestRecommendations: z.array(retestRecommendationSchema).max(200),
}).strict();

export type AiTestRunAnalysisResponseContract = z.infer<typeof aiTestRunAnalysisResponseSchema>;

export function parseAiTestRunAnalysisResponse(value: unknown): AiTestRunAnalysisResponseContract {
  const parsed = aiTestRunAnalysisResponseSchema.safeParse(value);
  if (!parsed.success) throw new Error('Response AI tidak sesuai kontrak analisis Test Run');
  return parsed.data;
}
