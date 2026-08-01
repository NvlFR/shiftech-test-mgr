import assert from "node:assert/strict";
import test from "node:test";
import type { ServerConfig } from "../config.js";
import { transportFor } from "../helpers/transportTestHelper.js";
import { WriteRepository, WriteRepositoryError } from "./writeRepository.js";

const config: ServerConfig = { supabaseUrl: "https://example.supabase.co", supabaseAnonKey: "anon", apiToken: `tm_${"a".repeat(64)}`, projectId: "11111111-1111-4111-8111-111111111111", readonly: false, rerunFailedMaxTests: 25, repositoryCacheDir: "/tmp/testmanager-mcp-test", toolRateLimit: 120, toolRateLimitWindowSeconds: 60 };

test("create bulk maps camelCase input and includes project scope", async () => {
  let body: Record<string, any> = {};
  const fetchImpl: typeof fetch = async (_input, init) => { body = JSON.parse(String(init?.body)); return new Response(JSON.stringify([]), { status: 200, headers: { "Content-Type": "application/json" } }); };
  await new WriteRepository(config, transportFor(fetchImpl)).createTestCases([{ title: "Login", steps: "Open", expectedResult: "Shown", moduleId: null }]);
  assert.equal(body.p_project_id, config.projectId);
  assert.equal(body.p_token, config.apiToken);
  assert.equal(body.p_cases[0].expected_result, "Shown");
  assert.equal(body.p_cases[0].module_id, null);
});

test("write repository hides upstream response details", async () => {
  const repository = new WriteRepository(config, transportFor(async () => new Response("secret detail", { status: 403 })));
  await assert.rejects(repository.archiveTestCase("22222222-2222-4222-8222-222222222222"), WriteRepositoryError);
});

test("test run workflow uses separate scoped RPC calls", async () => {
  const calls: Array<{ url: string; body: Record<string, unknown> }> = [];
  const fetchImpl: typeof fetch = async (input, init) => { calls.push({ url: String(input), body: JSON.parse(String(init?.body)) }); return new Response("{}", { status: 200, headers: { "Content-Type": "application/json" } }); };
  const repository = new WriteRepository(config, transportFor(fetchImpl));
  const planId = "22222222-2222-4222-8222-222222222222";
  const resultId = "33333333-3333-4333-8333-333333333333";
  const testerId = "44444444-4444-4444-8444-444444444444";
  await repository.createTestRun({ testPlanId: planId, name: "Regression" });
  await repository.recordTestResult({ testResultId: resultId, testerId, status: "pass", notes: "OK" });
  await repository.completeTestRun(resultId);
  assert.equal(calls.length, 3);
  const [createCall, recordCall, completeCall] = calls as [typeof calls[number], typeof calls[number], typeof calls[number]];
  assert.match(createCall.url, /mcp_create_test_run$/); assert.equal(createCall.body.p_test_plan_id, planId);
  assert.match(recordCall.url, /mcp_record_test_result$/); assert.equal(recordCall.body.p_tester_id, testerId);
  assert.match(completeCall.url, /mcp_complete_test_run$/);
  assert.ok(calls.every((call) => call.body.p_project_id === config.projectId));
});

test("issue duplicate detection loads scoped candidates then calls ai-gateway with user JWT", async () => {
  const aiConfig = { ...config, supabaseAccessToken: "user-jwt" };
  const calls: Array<{ url: string; body: Record<string, unknown>; authorization?: string }> = [];
  const fetchImpl: typeof fetch = async (input, init) => {
    const url = String(input); calls.push({ url, body: JSON.parse(String(init?.body)), authorization: new Headers(init?.headers).get("authorization") ?? undefined });
    const data = url.includes("mcp_issue_duplicate_candidates") ? [{ id: "22222222-2222-4222-8222-222222222222" }] : { data: { candidates: [] } };
    return new Response(JSON.stringify(data), { status: 200, headers: { "Content-Type": "application/json" } });
  };
  const repository = new WriteRepository(aiConfig, transportFor(fetchImpl));
  const candidates = await repository.duplicateIssueCandidates() as unknown[];
  await repository.detectDuplicate({ title: "Login fails" }, candidates);
  assert.match(calls[0]!.url, /mcp_issue_duplicate_candidates$/);
  assert.equal(calls[0]!.body.p_project_id, config.projectId);
  assert.match(calls[1]!.url, /functions\/v1\/ai-gateway$/);
  assert.equal(calls[1]!.authorization, "Bearer user-jwt");
  assert.equal(calls[1]!.body.action, "duplicate_issue_detection");
  assert.deepEqual(calls[1]!.body.candidates, candidates);
});
