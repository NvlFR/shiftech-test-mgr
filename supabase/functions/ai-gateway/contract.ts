import { z } from "https://esm.sh/zod@3.23.8";

const Uuid = z.string().uuid();
const Text = z.string().trim();
const Priority = z.enum(["low", "medium", "high", "critical"]);

const GenerateRequest = z.object({
  action: z.literal("generate_test_cases"),
  projectId: Uuid,
  source: z.object({
    type: z.enum(["text", "excel", "document"]),
    content: Text.min(1).max(30_000),
    fileName: Text.max(255).optional(),
  }).strict(),
  options: z.object({
    includeScenarios: z.boolean(),
    includeEdgeCases: z.boolean(),
    maxCases: z.number().int().min(1).max(50),
  }).strict(),
}).strict();

const AnalysisRequest = z.object({
  contractVersion: z.literal("v1"),
  action: z.literal("test_run_analysis"),
  projectId: Uuid,
  testRunId: Uuid,
}).strict();

const IssueRequest = z.object({
  action: z.literal("issue_draft"),
  projectId: Uuid,
  result: z.object({
    id: Uuid,
    status: z.enum(["pass", "fail", "skip", "blocked", "not_run"]),
    notes: Text.max(10_000).nullable(),
    testCase: z.object({ id: Uuid, projectId: Uuid, code: Text.max(100), title: Text.max(500), objective: Text.max(4_000).nullable(), preconditions: Text.max(4_000).nullable(), steps: Text.max(10_000), expectedResult: Text.max(4_000), priority: Priority }).strict(),
  }).strict(),
}).strict();

const DuplicateRequest = z.object({
  action: z.literal("duplicate_issue_detection"),
  projectId: Uuid,
  draft: z.record(z.unknown()),
  candidates: z.array(z.record(z.unknown())).max(300),
}).strict();

const AssistantRequest = z.object({
  action: z.literal("assistant_search"),
  projectId: Uuid,
  query: Text.min(1).max(500),
  entityTypes: z.array(z.enum(["test_case", "test_run", "test_result", "issue", "requirement", "history"])).max(10).optional(),
  limit: z.number().int().min(1).max(50).optional(),
}).strict();

// Legacy aliases are retained for rolling deployments; new frontend code uses the
// explicit action names above. They still pass through the same auth/RLS boundary.
const LegacyRequest = z.object({
  action: z.enum(["generate", "analyze", "issue", "duplicate", "retest", "search"]),
  projectId: Uuid,
  input: z.record(z.unknown()).default({}),
  requestId: Text.min(1).max(100).optional(),
}).strict();

export const RequestSchema = z.union([GenerateRequest, AnalysisRequest, IssueRequest, DuplicateRequest, AssistantRequest, LegacyRequest]);
export type GatewayRequest = z.infer<typeof RequestSchema>;
export type CanonicalAction = "generate_test_cases" | "test_run_analysis" | "issue_draft" | "duplicate_issue_detection" | "assistant_search";
export type ProviderAction = CanonicalAction;

export const TestCaseDraftSchema = z.object({
  title: Text.min(1).max(300), objective: Text.max(4_000), preconditions: Text.max(4_000),
  steps: z.string().min(1).max(10_000), expectedResult: Text.min(1).max(4_000), priority: Priority,
  tags: z.array(Text.min(1).max(80)).max(20), notes: Text.max(4_000),
  scenarios: z.array(Text.min(1).max(2_000)).max(30), edgeCases: z.array(Text.min(1).max(2_000)).max(30),
}).strict();
export const GenerateOutputSchema = z.object({
  testCases: z.array(TestCaseDraftSchema).min(1).max(50), scenarios: z.array(Text).max(30), edgeCases: z.array(Text).max(30),
  provider: Text.max(100).optional(), model: Text.max(200).nullable().optional(), promptVersion: Text.max(100).nullable().optional(),
}).strict();

export const AnalysisOutputSchema = z.object({
  summary: Text.min(1).max(8_000),
  counts: z.object({ pass: z.number().int().nonnegative(), fail: z.number().int().nonnegative(), skip: z.number().int().nonnegative(), blocked: z.number().int().nonnegative(), notRun: z.number().int().nonnegative() }).strict(),
  failurePatterns: z.array(z.object({ pattern: Text.min(1).max(500), evidence: z.array(Text.min(1).max(2_000)).max(10), risk: z.enum(["low", "medium", "high", "critical"]) }).strict()).max(30),
  regressionRisks: z.array(Text.min(1).max(2_000)).max(30),
  retestRecommendations: z.array(z.object({ testCaseId: Uuid.optional(), reason: Text.min(1).max(2_000), priority: Priority }).strict()).max(50),
}).strict();

export const IssueDraftSchema = z.object({
  projectId: Uuid.optional(), testResultId: Uuid.optional(),
  title: Text.min(1).max(300), description: Text.max(10_000), actualResult: Text.max(10_000), expectedResult: Text.max(10_000), priority: Priority,
  severity: z.enum(["low", "medium", "high", "critical"]), reproductionSteps: Text.max(10_000),
}).strict();
export const DuplicateOutputSchema = z.object({ candidates: z.array(z.object({ issueId: Uuid, confidence: z.number().min(0).max(1), reason: Text.min(1).max(2_000) }).strict()).max(100) }).strict();
export const AssistantOutputSchema = z.object({
  answer: Text.max(8_000).nullable(),
  matches: z.array(z.object({ entityType: z.enum(["test_case", "test_run", "test_result", "issue", "requirement", "history"]), entityId: Uuid, projectId: Uuid, code: Text.max(100).nullable(), title: Text.min(1).max(500), snippet: Text.max(5_000), score: z.number().min(0).max(1) }).strict()).max(50),
}).strict();

export const OutputSchemas = { generate_test_cases: GenerateOutputSchema, test_run_analysis: AnalysisOutputSchema, issue_draft: IssueDraftSchema, duplicate_issue_detection: DuplicateOutputSchema, assistant_search: AssistantOutputSchema } as const;
export type ActionOutput = z.infer<(typeof OutputSchemas)[keyof typeof OutputSchemas]>;

export type GatewayErrorCode = "AUTH_REQUIRED" | "AUTH_INVALID" | "PROJECT_ACCESS_DENIED" | "INVALID_REQUEST" | "INVALID_INPUT" | "RATE_LIMITED" | "AI_TIMEOUT" | "AI_PROVIDER_ERROR" | "AI_INVALID_OUTPUT" | "CONFIGURATION_ERROR" | "INTERNAL_ERROR";
export type ErrorEnvelope = { error: { code: GatewayErrorCode; message: string; requestId: string; retryAfterSeconds?: number; details?: unknown } };
export type SuccessEnvelope = { data: ActionOutput; meta: { action: string; status: "draft"; provider: string; model: string; promptVersion: string; requestId: string } };

export function canonicalAction(request: GatewayRequest): CanonicalAction {
  if (request.action === "generate") return "generate_test_cases";
  if (request.action === "analyze") return "test_run_analysis";
  if (request.action === "issue") return "issue_draft";
  if (request.action === "duplicate") return "duplicate_issue_detection";
  if (request.action === "search" || request.action === "retest") return "assistant_search";
  return request.action;
}

export function requestInput(request: GatewayRequest): Record<string, unknown> {
  if ("input" in request) return request.input;
  if (request.action === "generate_test_cases") return { requirement: request.source.content, source: request.source, options: request.options };
  if (request.action === "test_run_analysis") return { testRunId: request.testRunId };
  if (request.action === "issue_draft") return { testResultId: request.result.id, result: request.result };
  if (request.action === "duplicate_issue_detection") return { draft: request.draft, candidates: request.candidates };
  return { query: request.query, entityTypes: request.entityTypes, limit: request.limit };
}

export function parseProviderJson(raw: unknown): unknown {
  if (typeof raw !== "string") return raw;
  const trimmed = raw.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return JSON.parse(fenced?.[1]?.trim() ?? trimmed);
}

export function validateActionOutput(action: CanonicalAction, raw: unknown): ActionOutput {
  const parsed = OutputSchemas[action].safeParse(parseProviderJson(raw));
  if (!parsed.success) throw new Error(`AI output validation failed: ${parsed.error.issues.map((issue) => issue.path.join(".")).join(", ")}`);
  return parsed.data as ActionOutput;
}

export function computeDuplicateConfidence(candidate: string, existing: string): number {
  const tokens = (value: string) => new Set(value.toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").split(/\s+/).filter((token) => token.length > 2));
  const left = tokens(candidate); const right = tokens(existing);
  if (!left.size || !right.size) return 0;
  const intersection = [...left].filter((token) => right.has(token)).length;
  return Math.round((intersection / new Set([...left, ...right]).size) * 100) / 100;
}
