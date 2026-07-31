import assert from "node:assert/strict";
import test from "node:test";

import type { ServerConfig } from "../config.js";
import { McpToolError } from "../helpers/response.js";
import type { ReadRepository, TestCaseSearchQuery } from "../repositories/readRepository.js";
import { ProjectSession } from "./authService.js";
import { encodeTestCaseCursor, ReadService } from "./readService.js";

const projectId = "11111111-1111-4111-8111-111111111111";
const config = { projectId } as ServerConfig;
const session = new ProjectSession(config, { tokenId: "token-id", projectId, scopes: ["read:project"] });

test("testcase search validates pagination and decodes an opaque cursor", async () => {
  let received: TestCaseSearchQuery | undefined;
  const repository = {
    searchTestCases: async (query: TestCaseSearchQuery) => { received = query; return []; },
  } as unknown as ReadRepository;
  const service = new ReadService(session, repository);
  const id = "22222222-2222-4222-8222-222222222222";

  await service.searchTestCases({ cursor: encodeTestCaseCursor({ code: "TC-0004", id }), limit: 10 });

  assert.equal(received?.limit, 11);
  assert.equal(received?.afterCode, "TC-0004");
  assert.equal(received?.afterId, id);
});

test("testcase detail rejects malformed IDs before repository access", async () => {
  let called = false;
  const repository = { getTestCase: async () => { called = true; return null; } } as unknown as ReadRepository;
  const service = new ReadService(session, repository);

  await assert.rejects(service.getTestCase("not-an-id"), (error: unknown) => {
    assert.ok(error instanceof McpToolError);
    assert.equal(error.code, "INVALID_ARGUMENT");
    return true;
  });
  assert.equal(called, false);
});

test("project.get rejects a project outside the authenticated session", async () => {
  const service = new ReadService(session, {} as ReadRepository);
  await assert.rejects(service.getProject("99999999-9999-4999-8999-999999999999"), /Cross-project access is forbidden/);
});
