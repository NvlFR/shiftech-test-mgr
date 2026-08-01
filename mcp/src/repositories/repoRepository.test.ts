import assert from "node:assert/strict";
import test from "node:test";
import type { ServerConfig } from "../config.js";
import { RepoRepository, RepoRepositoryError } from "./repoRepository.js";

const config: ServerConfig = { supabaseUrl: "https://example.supabase.co", supabaseAnonKey: "anon", apiToken: "sensitive-token", projectId: "11111111-1111-4111-8111-111111111111", readonly: true, rerunFailedMaxTests: 25, repositoryCacheDir: "/tmp/testmanager-mcp-test", toolRateLimit: 120, toolRateLimitWindowSeconds: 60 };

test("repository configuration RPC is project scoped and maps credential internally", async () => {
  let body: Record<string, unknown> = {};
  const repository = new RepoRepository(config, async (_input, init) => {
    body = JSON.parse(String(init?.body));
    return new Response(JSON.stringify([{ id: "22222222-2222-4222-8222-222222222222", name: "App", source_type: "github_private", url_or_path: "https://github.com/acme/app.git", default_branch: "main", subdirectory: null, credential: "private" }]), { status: 200, headers: { "Content-Type": "application/json" } });
  });
  const value = await repository.getConfiguration("22222222-2222-4222-8222-222222222222");
  assert.equal(body.p_project_id, config.projectId);
  assert.equal(body.p_token, config.apiToken);
  assert.equal(value?.credential, "private");
});

test("repository configuration errors do not expose upstream response", async () => {
  const repository = new RepoRepository(config, async () => new Response("credential leak", { status: 500 }));
  await assert.rejects(repository.getConfiguration("id"), RepoRepositoryError);
});
