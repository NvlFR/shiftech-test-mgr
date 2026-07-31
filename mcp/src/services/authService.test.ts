import assert from "node:assert/strict";
import test from "node:test";

import type { ServerConfig } from "../config.js";
import { AuthRepository, AuthenticationError } from "../repositories/authRepository.js";
import { AuthService, ProjectScopeError } from "./authService.js";

const PROJECT_ID = "11111111-1111-4111-8111-111111111111";
const OTHER_PROJECT_ID = "22222222-2222-4222-8222-222222222222";

const config: ServerConfig = {
  supabaseUrl: "https://example.supabase.co",
  supabaseAnonKey: "anon-key",
  apiToken: "test-api-token",
  projectId: PROJECT_ID,
  readonly: false,
  rerunFailedMaxTests: 25,
};

test("authenticates from config and binds the session to the token project", async () => {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  const fetchMock: typeof fetch = async (input, init) => {
    calls.push({ url: input.toString(), init });
    return new Response(JSON.stringify([{
      token_id: "33333333-3333-4333-8333-333333333333",
      project_id: PROJECT_ID,
      scopes: ["read:project"],
    }]), { status: 200, headers: { "Content-Type": "application/json" } });
  };

  const session = await new AuthService(config, new AuthRepository(config, fetchMock)).createSession();

  assert.equal(session.projectId, PROJECT_ID);
  assert.deepEqual([...session.scopes], ["read:project"]);
  assert.deepEqual(JSON.parse(calls[0]?.init?.body as string), { p_token: config.apiToken });
  assert.equal(calls[0]?.url.includes(config.apiToken), false);
});

test("rejects a token belonging to another project", async () => {
  const fetchMock: typeof fetch = async () => new Response(JSON.stringify([{
    token_id: "33333333-3333-4333-8333-333333333333",
    project_id: OTHER_PROJECT_ID,
    scopes: ["read:project"],
  }]), { status: 200, headers: { "Content-Type": "application/json" } });

  await assert.rejects(
    new AuthService(config, new AuthRepository(config, fetchMock)).createSession(),
    ProjectScopeError,
  );
});

test("rejects nested cross-project tool arguments", async () => {
  const fetchMock: typeof fetch = async () => new Response(JSON.stringify([{
    token_id: "33333333-3333-4333-8333-333333333333",
    project_id: PROJECT_ID,
    scopes: ["read:project"],
  }]), { status: 200, headers: { "Content-Type": "application/json" } });
  const session = await new AuthService(config, new AuthRepository(config, fetchMock)).createSession();

  assert.throws(
    () => session.assertToolArguments({ filter: { project_id: OTHER_PROJECT_ID } }),
    ProjectScopeError,
  );
  assert.doesNotThrow(() => session.assertToolArguments({ projectId: PROJECT_ID }));
});

test("does not expose upstream response or token when authentication fails", async () => {
  const fetchMock: typeof fetch = async () => new Response(`invalid ${config.apiToken}`, { status: 401 });

  await assert.rejects(
    new AuthService(config, new AuthRepository(config, fetchMock)).createSession(),
    (error: unknown) => error instanceof AuthenticationError && !error.message.includes(config.apiToken),
  );
});
