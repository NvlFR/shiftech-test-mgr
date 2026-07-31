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
