import assert from "node:assert/strict";
import test from "node:test";
import { createRepoCredentialsHandler } from "./handler.ts";
import { maskCredential, parseCredentialRequest } from "./contract.ts";

const projectId = "11111111-1111-4111-8111-111111111111";
const repositoryId = "22222222-2222-4222-8222-222222222222";

test("mask hanya mempertahankan prefix dan empat karakter terakhir", () => {
  assert.equal(maskCredential("ghp_example-private-abcd"), "ghp_••••••abcd");
});

test("kontrak revoke menolak token", () => {
  assert.throws(() => parseCredentialRequest({ action: "revoke", project_id: projectId, repository_id: repositoryId, token: "forbidden" }));
});

test("handler tidak pernah mengembalikan token atau error database ke browser", async () => {
  const token = "ghp_contract-test-private-abcd";
  let rpcArgs: Record<string, unknown> = {};
  const handler = createRepoCredentialsHandler({
    authenticate: async () => ({ id: "33333333-3333-4333-8333-333333333333" }),
    manageCredential: async (args) => {
      rpcArgs = args;
      return {
        data: {
          credential_id: "44444444-4444-4444-8444-444444444444",
          mask: maskCredential(token),
          created_at: "2026-07-31T00:00:00Z",
          expires_at: null,
          token,
          decrypted_secret: token,
        },
        error: null,
      };
    },
    getRepositoryConnection: async () => ({ data: null, error: null }),
    fetchGitHub: fetch,
  });
  const response = await handler(new Request("http://localhost/repo-credentials", {
    method: "POST",
    headers: { Authorization: "Bearer user-session", "Content-Type": "application/json" },
    body: JSON.stringify({ action: "store", project_id: projectId, repository_id: repositoryId, token }),
  }));
  const body = await response.text();

  assert.equal(response.status, 200);
  assert.equal(rpcArgs.p_token, token);
  assert.doesNotMatch(body, new RegExp(token));
  assert.doesNotMatch(body, /decrypted_secret/);
  assert.deepEqual(JSON.parse(body), {
    data: {
      credential_id: "44444444-4444-4444-8444-444444444444",
      mask: "ghp_••••••abcd",
    },
  });
});

test("handler meredam pesan error upstream yang mungkin mengandung token", async () => {
  const token = "generic-contract-private-wxyz";
  const handler = createRepoCredentialsHandler({
    authenticate: async () => ({ id: "33333333-3333-4333-8333-333333333333" }),
    manageCredential: async () => ({ data: null, error: { message: `failed for ${token}` } }),
    getRepositoryConnection: async () => ({ data: null, error: null }),
    fetchGitHub: fetch,
  });
  const response = await handler(new Request("http://localhost/repo-credentials", {
    method: "POST",
    headers: { Authorization: "Bearer user-session", "Content-Type": "application/json" },
    body: JSON.stringify({ action: "rotate", project_id: projectId, repository_id: repositoryId, token }),
  }));
  const body = await response.text();
  assert.equal(response.status, 403);
  assert.doesNotMatch(body, new RegExp(token));
  assert.deepEqual(JSON.parse(body), { error: "credential_operation_failed" });
});

test("test connection mengembalikan metadata aman dan warning untuk scope berlebih", async () => {
  const handler = createRepoCredentialsHandler({
    authenticate: async () => ({ id: "33333333-3333-4333-8333-333333333333" }),
    manageCredential: async () => ({ data: null, error: null }),
    getRepositoryConnection: async () => ({
      data: { source_type: "github_private", url_or_path: "https://github.com/acme/app.git", token: "private-test-token" },
      error: null,
    }),
    fetchGitHub: async (_input, init) => {
      assert.equal((init?.headers as Record<string, string>).Authorization, "Bearer private-test-token");
      return new Response(JSON.stringify({ full_name: "acme/app", default_branch: "main", permissions: { pull: true, push: true } }), {
        status: 200,
        headers: { "Content-Type": "application/json", "X-OAuth-Scopes": "repo" },
      });
    },
  });
  const response = await handler(new Request("http://localhost/repo-credentials", {
    method: "POST",
    headers: { Authorization: "Bearer user-session", "Content-Type": "application/json" },
    body: JSON.stringify({ action: "test", project_id: projectId, repository_id: repositoryId }),
  }));
  const body = await response.text();

  assert.equal(response.status, 200);
  assert.doesNotMatch(body, /private-test-token/);
  assert.deepEqual(JSON.parse(body), { data: {
    name: "acme/app",
    default_branch: "main",
    permissions: ["contents: read", "repository: push", "token: repo"],
    warning: "Token memiliki permission lebih luas dari contents: read. Gunakan fine-grained token dengan permission minimum.",
  } });
});

test("GitHub public diuji tanpa authorization token", async () => {
  const handler = createRepoCredentialsHandler({
    authenticate: async () => ({ id: "33333333-3333-4333-8333-333333333333" }),
    manageCredential: async () => ({ data: null, error: null }),
    getRepositoryConnection: async () => ({ data: { source_type: "github_public", url_or_path: "https://github.com/acme/public", token: null }, error: null }),
    fetchGitHub: async (_input, init) => {
      assert.equal((init?.headers as Record<string, string>).Authorization, undefined);
      return new Response(JSON.stringify({ full_name: "acme/public", default_branch: "trunk" }), { status: 200 });
    },
  });
  const response = await handler(new Request("http://localhost/repo-credentials", {
    method: "POST",
    headers: { Authorization: "Bearer user-session", "Content-Type": "application/json" },
    body: JSON.stringify({ action: "test", project_id: projectId, repository_id: repositoryId }),
  }));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { data: { name: "acme/public", default_branch: "trunk", permissions: ["contents: read"], warning: null } });
});
