import assert from "node:assert/strict";
import test from "node:test";

import type { ServerConfig } from "../config.js";
import { ReadRepository, ReadRepositoryError } from "./readRepository.js";

const config: ServerConfig = {
  supabaseUrl: "https://example.supabase.co",
  supabaseAnonKey: "anon-key",
  apiToken: `tm_${"a".repeat(64)}`,
  projectId: "11111111-1111-4111-8111-111111111111",
  readonly: true,
  rerunFailedMaxTests: 25,
  repositoryCacheDir: "/tmp/testmanager-mcp-test",
  toolRateLimit: 120,
  toolRateLimitWindowSeconds: 60,
};

test("search sends project scope and token in RPC body, then maps snake_case rows", async () => {
  let requestUrl = "";
  let requestBody: Record<string, unknown> = {};
  const fetchImpl: typeof fetch = async (input, init) => {
    requestUrl = String(input);
    requestBody = JSON.parse(String(init?.body)) as Record<string, unknown>;
    return new Response(JSON.stringify([{
      id: "22222222-2222-4222-8222-222222222222",
      project_id: config.projectId,
      module: { id: "33333333-3333-4333-8333-333333333333", code: "MOD-0001", name: "Login" },
      tags: [{ id: "44444444-4444-4444-8444-444444444444", name: "smoke" }],
      code: "TC-0001", title: "Successful login", priority: "high", status: "active",
      updated_at: "2026-07-31T00:00:00Z",
    }]), { status: 200, headers: { "Content-Type": "application/json" } });
  };

  const rows = await new ReadRepository(config, fetchImpl).searchTestCases({ tag: "smoke", limit: 11 });

  assert.equal(requestUrl, "https://example.supabase.co/rest/v1/rpc/mcp_search_test_cases");
  assert.equal(requestBody.p_token, config.apiToken);
  assert.equal(requestBody.p_project_id, config.projectId);
  assert.equal(requestBody.p_tag, "smoke");
  assert.equal(rows[0]?.projectId, config.projectId);
  assert.equal(rows[0]?.module?.code, "MOD-0001");
  assert.deepEqual(rows[0]?.tags.map((tag) => tag.name), ["smoke"]);
});

test("upstream failures are replaced with a credential-safe repository error", async () => {
  const repository = new ReadRepository(config, async () => new Response("sensitive upstream detail", { status: 500 }));
  await assert.rejects(repository.listProjects(), (error: unknown) => {
    assert.ok(error instanceof ReadRepositoryError);
    assert.doesNotMatch(error.message, /sensitive|token/i);
    return true;
  });
});

test("batch 2 result listing sends filters and maps nested result data", async () => {
  let requestBody: Record<string, unknown> = {};
  const fetchImpl: typeof fetch = async (_input, init) => {
    requestBody = JSON.parse(String(init?.body)) as Record<string, unknown>;
    return new Response(JSON.stringify([{ id: "55555555-5555-4555-8555-555555555555", project_id: config.projectId,
      test_run_id: "66666666-6666-4666-8666-666666666666", test_case_id: "77777777-7777-4777-8777-777777777777",
      test_case: { code: "TC-0001", title: "Login" }, tester: { id: "88888888-8888-4888-8888-888888888888", email: "qa@example.com", full_name: "QA" },
      status: "fail", executed_at: "2026-07-31T01:00:00Z", notes: "Mismatch", created_at: "2026-07-31T00:00:00Z", updated_at: "2026-07-31T01:00:00Z" }]),
      { status: 200, headers: { "Content-Type": "application/json" } });
  };
  const rows = await new ReadRepository(config, fetchImpl).listTestResults({ status: "fail", testerId: "88888888-8888-4888-8888-888888888888", testRunId: "66666666-6666-4666-8666-666666666666", limit: 11 });
  assert.equal(requestBody.p_status, "fail"); assert.equal(requestBody.p_test_run_id, "66666666-6666-4666-8666-666666666666");
  assert.equal(rows[0]?.testCase.code, "TC-0001"); assert.equal(rows[0]?.tester?.fullName, "QA");
});

test("test run summaries are mapped from on-the-fly RPC output", async () => {
  const repository = new ReadRepository(config, async () => new Response(JSON.stringify([{ id: "99999999-9999-4999-8999-999999999999",
    project_id: config.projectId, test_plan_id: null, code: "TR-0001", name: "Regression", status: "in_progress",
    started_at: "2026-07-31T00:00:00Z", completed_at: null,
    summary: { total: 4, executed: 3, progress_percent: 75, pass: 1, fail: 1, skip: 1, blocked: 0, not_run: 1 } }]),
    { status: 200, headers: { "Content-Type": "application/json" } }));
  const rows = await repository.listTestRuns({ limit: 2 });
  assert.deepEqual(rows[0]?.summary, { total: 4, executed: 3, progressPercent: 75, pass: 1, fail: 1, skip: 1, blocked: 0, notRun: 1 });
});

test("requirement listing maps uncovered requirements", async () => {
  const repository = new ReadRepository(config, async () => new Response(JSON.stringify([{ id: "22222222-2222-4222-8222-222222222222",
    project_id: config.projectId, key: "REQ-1", title: "Login", description: null, status: "approved", priority: "high",
    test_case_count: 0, covered: false, created_at: "2026-07-31T00:00:00Z", updated_at: "2026-07-31T00:00:00Z" }]),
    { status: 200, headers: { "Content-Type": "application/json" } }));
  const rows = await repository.listRequirements({ covered: false, limit: 2 });
  assert.equal(rows[0]?.covered, false); assert.equal(rows[0]?.testCaseCount, 0);
});

test("artifact signing calls the server-side signer without exposing credentials", async () => {
  let body: Record<string, unknown> = {};
  const repository = new ReadRepository(config, async (_input, init) => { body = JSON.parse(String(init?.body));
    return new Response(JSON.stringify({ bucket: "automation-artifacts", path: `${config.projectId}/job/a.png`, url: "https://signed.example/a", expiresIn: 120 }),
      { status: 200, headers: { "Content-Type": "application/json" } }); });
  const result = await repository.getArtifactUrl("automation-artifacts", `${config.projectId}/job/a.png`, 120);
  assert.equal(body.action, "download"); assert.equal(result.url, "https://signed.example/a");
});
