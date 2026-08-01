import assert from "node:assert/strict";
import test from "node:test";
import type { ServerConfig } from "../config.js";
import { AutomationRepository, AutomationRepositoryError } from "./automationRepository.js";

const config: ServerConfig = { supabaseUrl: "https://example.supabase.co", supabaseAnonKey: "anon", apiToken: `tm_${"a".repeat(64)}`, projectId: "11111111-1111-4111-8111-111111111111", readonly: false, rerunFailedMaxTests: 25, repositoryCacheDir: "/tmp/testmanager-mcp-test", toolRateLimit: 120, toolRateLimitWindowSeconds: 60 };

test("automation calls scoped RPC and keeps token out of URL", async () => {
  const calls: Array<{ url: string; body: Record<string, unknown> }> = [];
  const fetchImpl: typeof fetch = async (input, init) => { calls.push({ url: String(input), body: JSON.parse(String(init?.body)) }); return new Response("{}", { status: 200, headers: { "Content-Type": "application/json" } }); };
  const repository = new AutomationRepository(config, fetchImpl);
  await repository.mapScript("case", "tests/a.spec.ts", ["chromium"]);
  await repository.enqueue({ testPlanId: "plan", runnerLabels: ["staging"], maxAttempts: 2 });
  await repository.rerunFailed({ issueId: "issue", runnerLabels: ["staging"], maxAttempts: 1, explicitConfirmation: false });
  await repository.jobStatus("job"); await repository.runnerList();
  assert.deepEqual(calls.map((call) => call.url.split("/").at(-1)), ["mcp_map_automation_script", "mcp_enqueue_automation", "mcp_rerun_failed_automation", "mcp_automation_job_status", "mcp_automation_runner_list"]);
  assert.ok(calls.every((call) => call.body.p_project_id === config.projectId && call.body.p_token === config.apiToken && !call.url.includes(config.apiToken)));
  assert.deepEqual(calls[1]!.body.p_runner_labels, ["staging"]);
  assert.equal(calls[2]!.body.p_selection_limit, 25);
});

test("automation repository redacts upstream failure", async () => {
  const repository = new AutomationRepository(config, async () => new Response("secret", { status: 403 }));
  await assert.rejects(repository.runnerList(), AutomationRepositoryError);
});
