import assert from "node:assert/strict";
import test from "node:test";
import type { ServerConfig } from "../config.js";
import { transportFor } from "../helpers/transportTestHelper.js";
import { GovernanceRepository, GovernanceRepositoryError } from "./governanceRepository.js";

const config: ServerConfig = {
  supabaseUrl: "https://example.supabase.co", supabaseAnonKey: "anon", apiToken: `tm_${"a".repeat(64)}`,
  projectId: "11111111-1111-4111-8111-111111111111", readonly: false, rerunFailedMaxTests: 25,
  repositoryCacheDir: "/tmp/testmanager-mcp-test", toolRateLimit: 7, toolRateLimitWindowSeconds: 30,
};

test("begin mengirim metadata governance tanpa payload tool", async () => {
  let body: Record<string, unknown> = {};
  const repository = new GovernanceRepository(config, transportFor(async (_input, init) => {
    body = JSON.parse(String(init?.body));
    return new Response(JSON.stringify([{ audit_id: "22222222-2222-4222-8222-222222222222", allowed: true }]), { status: 200 });
  }));
  const result = await repository.beginToolCall("testmanager.project.list");
  assert.equal(result.allowed, true);
  assert.deepEqual(body, {
    p_token: config.apiToken, p_project_id: config.projectId, p_tool_name: "testmanager.project.list",
    p_limit: 7, p_window_seconds: 30,
  });
  assert.equal("p_arguments" in body, false);
  assert.equal("p_payload" in body, false);
});

test("upstream error tidak membocorkan response", async () => {
  const repository = new GovernanceRepository(config, transportFor(async () => new Response("raw sensitive payload", { status: 500 })));
  await assert.rejects(repository.beginToolCall("testmanager.project.list"), GovernanceRepositoryError);
});
