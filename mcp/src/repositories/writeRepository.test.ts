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
