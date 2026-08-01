import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.52.0";
import {
  RequestSchema,
  type GatewayRequest,
  type SuccessEnvelope,
  type ErrorEnvelope,
  canonicalAction,
  requestInput,
  type CanonicalAction,
  validateActionOutput,
  OUTPUT_SCHEMA_HINT,
  generateTestCasesCsv,
  TEST_CASE_IMPORT_COLUMNS,
} from "./contract.ts";
import { createProvider, ProviderError, type AiProvider } from "./providers.ts";
import {
  authenticate,
  corsHeaders,
  envNumber,
  GatewayHttpError,
  redactPromptInput,
} from "./security.ts";

const PROMPT_VERSION = "ai-gateway-v1";
const env = Deno.env.toObject();

type ScopedContext = {
  testCases: unknown[];
  testPlans: unknown[];
  testRuns: unknown[];
  testResults: unknown[];
  issues: unknown[];
  requirements: unknown[];
  history: unknown[];
};

function requestId(request: Request): string {
  return request.headers.get("x-request-id")?.slice(0, 100) || crypto.randomUUID();
}

function response(request: Request, body: ErrorEnvelope | SuccessEnvelope, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(request, env), "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}

function errorResponse(request: Request, id: string, error: unknown): Response {
  const gatewayError = error instanceof GatewayHttpError
    ? error
    : new GatewayHttpError(500, "INTERNAL_ERROR", "Terjadi kesalahan internal.");
  const body: ErrorEnvelope = {
    error: {
      code: gatewayError.code,
      message: gatewayError.message,
      requestId: id,
      ...(gatewayError.retryAfterSeconds ? { retryAfterSeconds: gatewayError.retryAfterSeconds } : {}),
      ...(gatewayError.details ? { details: gatewayError.details } : {}),
    },
  };
  return response(request, body, gatewayError.status);
}

async function query<T>(promise: PromiseLike<{ data: T | null; error: { message: string } | null }>): Promise<T> {
  const { data, error } = await promise;
  if (error) throw new GatewayHttpError(500, "INTERNAL_ERROR", "Gagal membaca data project.");
  return data ?? ([] as T);
}

async function requestHash(value: unknown): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function projectContext(client: SupabaseClient, projectId: string, input: Record<string, unknown>): Promise<ScopedContext> {
  const cases = await query(client.from("test_cases").select("id,title,objective,preconditions,steps,expected_result,priority,notes,module_id").eq("project_id", projectId).limit(100));
  const plans = await query(client.from("test_plans").select("id,name,description,status").eq("project_id", projectId).limit(100));
  const planIds = (plans as Array<{ id: string }>).map((row) => row.id);
  const runs = planIds.length
    ? await query(client.from("test_runs").select("id,name,status,test_plan_id,started_at,completed_at").in("test_plan_id", planIds).limit(100))
    : [];
  const runIds = (runs as Array<{ id: string }>).map((row) => row.id);
  const results = runIds.length
    ? await query(client.from("test_results").select("id,test_run_id,test_case_id,status,executed_at,notes").in("test_run_id", runIds).limit(300))
    : [];
  const resultIds = (results as Array<{ id: string }>).map((row) => row.id);
  const issues = resultIds.length
    ? await query(client.from("issues").select("id,test_result_id,title,description,actual_result,expected_result,priority,status").in("test_result_id", resultIds).limit(300))
    : [];
  const requirements = await query(client.from("requirements").select("id,key,title,description,status,priority").eq("project_id", projectId).limit(100));
  const history = await query(client.from("audit_logs").select("id,table_name,record_id,action,created_at").eq("project_id", projectId).order("created_at", { ascending: false }).limit(200));
  const context: ScopedContext = { testCases: cases as unknown[], testPlans: plans as unknown[], testRuns: runs as unknown[], testResults: results as unknown[], issues: issues as unknown[], requirements: requirements as unknown[], history: history as unknown[] };

  const referencedIds = ["testRunId", "testResultId", "issueId"];
  for (const key of referencedIds) {
    const value = input[key];
    if (typeof value !== "string") continue;
    const collections = key === "testRunId" ? context.testRuns : key === "testResultId" ? context.testResults : context.issues;
    if (!collections.some((row) => (row as { id?: string }).id === value)) {
      throw new GatewayHttpError(403, "PROJECT_ACCESS_DENIED", "Entity tidak berada dalam project yang diizinkan.");
    }
  }
  return context;
}

function validateInput(request: GatewayRequest): void {
  const action = canonicalAction(request);
  const input = requestInput(request);
  const hasText = ["requirement", "description", "documentText", "excelText"].some((key) => typeof input[key] === "string" && String(input[key]).trim());
  if (action === "generate_test_cases" && !hasText && !Array.isArray(input.rows) && typeof input.source !== "object") throw new GatewayHttpError(422, "INVALID_INPUT", "Requirement atau dokumen diperlukan.");
  if (["test_run_analysis", "issue_draft"].includes(action) && typeof input.testRunId !== "string" && typeof input.testResultId !== "string") {
    throw new GatewayHttpError(422, "INVALID_INPUT", "ID Test Run atau Test Result diperlukan.");
  }
  if (action === "assistant_search" && (typeof input.query !== "string" || !input.query.trim())) throw new GatewayHttpError(422, "INVALID_INPUT", "Query pencarian diperlukan.");
}

async function generationContext(client: SupabaseClient, projectId: string, input: Record<string, unknown>): Promise<Record<string, unknown>> {
  const source = input.source as { type?: string; repositoryId?: string } | undefined;
  if (source?.type !== "repository" || !source.repositoryId) return {};
  const repository = await query(client.from("project_repositories")
    .select("id,name,source_type,url_or_path,default_branch,subdirectory")
    .eq("id", source.repositoryId)
    .eq("project_id", projectId)
    .eq("is_active", true)
    .maybeSingle());
  if (!repository || !(repository as { id?: string }).id) {
    throw new GatewayHttpError(403, "PROJECT_ACCESS_DENIED", "Referensi repository tidak berada dalam project yang diizinkan.");
  }
  const row = repository as Record<string, unknown>;
  return {
    repository: row.source_type === "local_path"
      ? { ...row, url_or_path: undefined }
      : row,
  };
}

async function completeWithRetry(provider: AiProvider, request: GatewayRequest, prompt: string, timeoutMs: number, retries: number): Promise<ReturnType<typeof validateActionOutput>> {
  const action = canonicalAction(request);
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const raw = await provider.complete({ action, prompt, timeoutMs });
      return validateActionOutput(action, raw);
    } catch (error) {
      lastError = error;
      const retryable = error instanceof ProviderError ? error.retryable : true;
      if (!retryable || attempt >= retries) break;
      await new Promise((resolve) => setTimeout(resolve, Math.min(250, 50 * (attempt + 1))));
    }
  }
  if (lastError instanceof ProviderError) throw new GatewayHttpError(502, lastError.code, "Provider AI gagal memproses permintaan.");
  throw new GatewayHttpError(502, "AI_INVALID_OUTPUT", "Provider AI mengembalikan output yang tidak sesuai kontrak.");
}

function restrictOutput(action: CanonicalAction, output: ReturnType<typeof validateActionOutput>, context: ScopedContext): ReturnType<typeof validateActionOutput> {
  const ids = (key: keyof ScopedContext) => new Set(context[key].map((row) => (row as { id?: string }).id));
  if (action === "duplicate_issue_detection" && "candidates" in output) return { ...output, candidates: output.candidates.filter((candidate) => ids("issues").has(candidate.issueId)) };
  if (action === "assistant_search" && "matches" in output) {
    const allowed = new Set([...ids("testCases"), ...ids("testPlans"), ...ids("testRuns"), ...ids("testResults"), ...ids("issues"), ...ids("requirements"), ...ids("history")]);
    return { ...output, matches: output.matches.filter((item) => allowed.has(item.entityId)) };
  }
  return output;
}

function analysisResponse(request: GatewayRequest, output: ReturnType<typeof validateActionOutput>, context: ScopedContext, provider: AiProvider): unknown {
  if (canonicalAction(request) !== "test_run_analysis" || !("counts" in output)) return output;
  const input = requestInput(request);
  const testRunId = typeof input.testRunId === "string" ? input.testRunId : "";
  const rows = context.testResults.filter((row) => (row as { test_run_id?: string }).test_run_id === testRunId) as Array<{ status?: string; test_case_id?: string }>;
  const counts = { pass: 0, fail: 0, skip: 0, blocked: 0, notRun: 0 };
  for (const row of rows) {
    if (row.status === "pass") counts.pass += 1;
    if (row.status === "fail") counts.fail += 1;
    if (row.status === "skip") counts.skip += 1;
    if (row.status === "blocked") counts.blocked += 1;
    if (row.status === "not_run") counts.notRun += 1;
  }
  const total = rows.length;
  const executed = total - counts.notRun;
  const projectId = request.projectId;
  return {
    contractVersion: "v1", action: "test_run_analysis", projectId, testRunId, mode: "review_only", reviewStatus: "draft",
    provider: provider.descriptor.name, model: provider.descriptor.model, promptVersion: PROMPT_VERSION, generatedAt: new Date().toISOString(),
    summary: { total, executed, progressPercent: total ? Math.round((executed / total) * 100) : 0, ...counts },
    regressionSummary: output.summary,
    failurePatterns: output.failurePatterns.map((pattern) => ({ pattern: pattern.pattern, occurrences: pattern.evidence.length || 1, severity: pattern.risk, testCaseIds: [], evidence: pattern.evidence.join("\n") })),
    riskAreas: output.regressionRisks.map((risk) => ({ area: risk, riskLevel: "medium", rationale: risk, testCaseIds: [] })),
    retestRecommendations: output.retestRecommendations.filter((item) => item.testCaseId).map((item) => {
      const testCase = context.testCases.find((candidate) => (candidate as { id?: string }).id === item.testCaseId) as { code?: string; title?: string } | undefined;
      return { testCaseId: item.testCaseId, testCaseCode: testCase?.code ?? "TC-UNKNOWN", title: testCase?.title ?? "Test Case perlu diretest", reason: item.reason, priority: item.priority, confidence: 0.7, suggestedScope: "Ulangi test case terkait dan jalur regresi terdekat." };
    }),
  };
}

export async function handleAiGateway(request: Request): Promise<Response> {
  const id = requestId(request);
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(request, env) });
  if (request.method !== "POST") return errorResponse(request, id, new GatewayHttpError(405, "INVALID_REQUEST", "Method tidak didukung."));
  try {
    if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) throw new GatewayHttpError(500, "CONFIGURATION_ERROR", "Konfigurasi Supabase Edge Function belum lengkap.");
    const contentLength = Number(request.headers.get("content-length") ?? 0);
    if (contentLength > 1_000_000) throw new GatewayHttpError(413, "INVALID_REQUEST", "Request terlalu besar.");
    const rawBody = await request.json();
    const parsed = RequestSchema.safeParse(rawBody);
    if (!parsed.success) throw new GatewayHttpError(400, "INVALID_REQUEST", "Format request tidak valid.", parsed.error.issues.map((issue) => issue.path.join(".")));
    const gatewayRequest = parsed.data;
    validateInput(gatewayRequest);
    const { client, user } = await authenticate(request, env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
    const action = canonicalAction(gatewayRequest);
    const { data: quotaAllowed, error: quotaError } = await client.rpc("consume_ai_rate_limit", {
      p_project_id: gatewayRequest.projectId,
      p_action: action,
      p_limit: envNumber(env, "AI_RATE_LIMIT_MAX", 20, 1, 1000),
      p_window_seconds: envNumber(env, "AI_RATE_LIMIT_WINDOW_SECONDS", 60, 1, 3600),
    });
    if (quotaError) throw new GatewayHttpError(500, "CONFIGURATION_ERROR", "Rate limit AI belum dikonfigurasi pada database.");
    if (quotaAllowed !== true) throw new GatewayHttpError(429, "RATE_LIMITED", "Batas permintaan AI tercapai.", undefined, 60);
    const project = await query(client.from("projects").select("id").eq("id", gatewayRequest.projectId).maybeSingle());
    if (!project || !(project as { id?: string }).id) throw new GatewayHttpError(403, "PROJECT_ACCESS_DENIED", "Akses project ditolak.");
    const input = requestInput(gatewayRequest);
    const context = action === "generate_test_cases"
      ? await generationContext(client, gatewayRequest.projectId, input)
      : ["test_run_analysis", "issue_draft", "duplicate_issue_detection", "assistant_search"].includes(action)
        ? await projectContext(client, gatewayRequest.projectId, input)
        : { testCases: [], testPlans: [], testRuns: [], testResults: [], issues: [], requirements: [], history: [] } satisfies ScopedContext;
    const prompt = JSON.stringify({ action, input: JSON.parse(redactPromptInput(input)), scopedContext: JSON.parse(redactPromptInput(context)), promptVersion: PROMPT_VERSION, outputSchema: OUTPUT_SCHEMA_HINT[action], outputInstruction: "Return a single JSON object that EXACTLY matches the keys, nesting, and enum values shown in outputSchema. Use only those keys — no extra keys, no markdown, no prose. Enum fields (priority, severity, risk) must be one of the listed values. Any id you output must be copied verbatim from scopedContext. All results are drafts requiring human review." });
    const provider = createProvider(env);
    const startedAt = Date.now();
    const { data: audit, error: auditError } = await client.from("ai_audit_events").insert({
      project_id: gatewayRequest.projectId, action, provider: provider.descriptor.name, model: provider.descriptor.model,
      prompt_version: PROMPT_VERSION, status: "started", created_by: user.id,
      target_type: action === "test_run_analysis" ? "test_run" : action === "issue_draft" ? "test_result" : null,
      target_id: typeof input.testRunId === "string" ? input.testRunId : typeof input.testResultId === "string" ? input.testResultId : null,
      request_hash: await requestHash({ action, projectId: gatewayRequest.projectId, input }),
    }).select("id").single();
    if (auditError || !audit?.id) throw new GatewayHttpError(500, "CONFIGURATION_ERROR", "Audit AI belum dapat disimpan.");
    let output = restrictOutput(action, await completeWithRetry(provider, gatewayRequest, prompt, envNumber(env, "AI_TIMEOUT_MS", 10_000, 500, 30_000), envNumber(env, "AI_MAX_RETRIES", 1, 0, 2)), context as ScopedContext);
    if (action === "issue_draft" && "title" in output) output = { ...output, projectId: gatewayRequest.projectId, testResultId: typeof input.testResultId === "string" ? input.testResultId : undefined } as typeof output;
    const decorated = action === "generate_test_cases" && "testCases" in output
      ? { ...output, csv: generateTestCasesCsv(output), csvColumns: [...TEST_CASE_IMPORT_COLUMNS] }
      : analysisResponse(gatewayRequest, output, context as ScopedContext, provider);
    await client.from("ai_audit_events").update({ status: "completed", completed_at: new Date().toISOString(), latency_ms: Date.now() - startedAt }).eq("id", audit.id);
    const body: SuccessEnvelope = { data: decorated as SuccessEnvelope["data"], meta: { action, status: "draft", provider: provider.descriptor.name, model: provider.descriptor.model, promptVersion: PROMPT_VERSION, requestId: id } };
    return response(request, body, 200);
  } catch (error) {
    return errorResponse(request, id, error);
  }
}
