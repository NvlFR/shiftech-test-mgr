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
