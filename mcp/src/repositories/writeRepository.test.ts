import assert from "node:assert/strict";
import test from "node:test";
import type { ServerConfig } from "../config.js";
import { WriteRepository, WriteRepositoryError } from "./writeRepository.js";

const config: ServerConfig = { supabaseUrl: "https://example.supabase.co", supabaseAnonKey: "anon", apiToken: `tm_${"a".repeat(64)}`, projectId: "11111111-1111-4111-8111-111111111111", readonly: false };

test("create bulk maps camelCase input and includes project scope", async () => {
  let body: Record<string, any> = {};
  const fetchImpl: typeof fetch = async (_input, init) => { body = JSON.parse(String(init?.body)); return new Response(JSON.stringify([]), { status: 200, headers: { "Content-Type": "application/json" } }); };
  await new WriteRepository(config, fetchImpl).createTestCases([{ title: "Login", steps: "Open", expectedResult: "Shown", moduleId: null }]);
  assert.equal(body.p_project_id, config.projectId);
  assert.equal(body.p_token, config.apiToken);
  assert.equal(body.p_cases[0].expected_result, "Shown");
  assert.equal(body.p_cases[0].module_id, null);
});

test("write repository hides upstream response details", async () => {
  const repository = new WriteRepository(config, async () => new Response("secret detail", { status: 403 }));
  await assert.rejects(repository.archiveTestCase("22222222-2222-4222-8222-222222222222"), WriteRepositoryError);
});

test("test plan approval sends the explicit approver gate only in the RPC body", async () => {
  const id = "22222222-2222-4222-8222-222222222222";
  const approverId = "33333333-3333-4333-8333-333333333333";
  let url = ""; let body: Record<string, unknown> = {};
  const fetchImpl: typeof fetch = async (input, init) => { url = String(input); body = JSON.parse(String(init?.body)); return new Response(JSON.stringify({ id, status: "active" }), { status: 200, headers: { "Content-Type": "application/json" } }); };
  await new WriteRepository(config, fetchImpl).approveTestPlan(id, approverId, true);
  assert.match(url, /\/rpc\/mcp_approve_test_plan$/);
  assert.equal(body.p_test_plan_id, id); assert.equal(body.p_approver_id, approverId); assert.equal(body.p_explicit_approval, true);
  assert.equal(url.includes(config.apiToken), false);
});

test("test run workflow uses separate scoped RPC calls", async () => {
  const calls: Array<{ url: string; body: Record<string, unknown> }> = [];
  const fetchImpl: typeof fetch = async (input, init) => { calls.push({ url: String(input), body: JSON.parse(String(init?.body)) }); return new Response("{}", { status: 200, headers: { "Content-Type": "application/json" } }); };
  const repository = new WriteRepository(config, fetchImpl);
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
