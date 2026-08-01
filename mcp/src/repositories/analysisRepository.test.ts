import assert from "node:assert/strict";
import test from "node:test";
import type { ServerConfig } from "../config.js";
import { transportFor } from "../helpers/transportTestHelper.js";
import { AnalysisRepository, AnalysisRepositoryError } from "./analysisRepository.js";

const config = { supabaseUrl: "https://example.supabase.co", supabaseAnonKey: "anon", apiToken: `tm_${"a".repeat(64)}`, projectId: "11111111-1111-4111-8111-111111111111" } as ServerConfig;
test("flaky analysis sends scoped RPC parameters and maps rows", async () => {
  let body: Record<string, unknown> = {};
  const repository = new AnalysisRepository(config, transportFor(async (_input, init) => { body = JSON.parse(String(init?.body)); return new Response(JSON.stringify([{
    test_case_id: "22222222-2222-4222-8222-222222222222", code: "TC-1", title: "Login", priority: "high", executions: 4,
    pass_count: 2, fail_count: 2, transitions: 3, flakiness_score: 1, latest_status: "fail", latest_executed_at: "2026-07-31T00:00:00Z",
  }]), { status: 200, headers: { "Content-Type": "application/json" } }); }));
  const rows = await repository.flakyCandidates(10, 3, 25);
  assert.equal(body.p_project_id, config.projectId); assert.equal(body.p_lookback_runs, 10); assert.equal(rows[0]?.flakinessScore, 1);
});
test("analysis upstream details are credential-safe", async () => {
  const repository = new AnalysisRepository(config, transportFor(async () => new Response("token secret", { status: 500 })));
  await assert.rejects(repository.runSummary("22222222-2222-4222-8222-222222222222"), (error: unknown) => error instanceof AnalysisRepositoryError && !/secret|token/i.test(error.message));
});
