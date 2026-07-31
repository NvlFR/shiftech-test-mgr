import assert from "node:assert/strict";
import test from "node:test";

import type { ServerConfig } from "../config.js";
import { McpToolError } from "../helpers/response.js";
import type { ReadRepository, RequirementListQuery, TestCaseSearchQuery, TestResultListQuery } from "../repositories/readRepository.js";
import { ProjectSession } from "./authService.js";
import { encodeTestCaseCursor, encodeTestResultCursor, ReadService } from "./readService.js";

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

test("testresult.list validates filter UUIDs and decodes its timestamp cursor", async () => {
  let received: TestResultListQuery | undefined;
  const repository = { listTestResults: async (query: TestResultListQuery) => { received = query; return []; } } as unknown as ReadRepository;
  const service = new ReadService(session, repository);
  const id = "22222222-2222-4222-8222-222222222222";
  await service.listTestResults({ testRunId: id, cursor: encodeTestResultCursor({ createdAt: "2026-07-31T00:00:00Z", id }), limit: 10 });
  assert.equal(received?.limit, 11); assert.equal(received?.afterCreatedAt, "2026-07-31T00:00:00Z"); assert.equal(received?.afterId, id);
  assert.throws(() => service.listTestResults({ testerId: "invalid" }), (error: unknown) => error instanceof McpToolError && error.code === "INVALID_ARGUMENT");
});

test("requirement.list keeps coverage filter and decodes its key cursor", async () => {
  let received: RequirementListQuery | undefined;
  const repository = { listRequirements: async (query: RequirementListQuery) => { received = query; return []; } } as unknown as ReadRepository;
  const service = new ReadService(session, repository); const id = "22222222-2222-4222-8222-222222222222";
  const cursor = Buffer.from(JSON.stringify({ code: "REQ-004", id })).toString("base64url");
  await service.listRequirements({ covered: false, cursor, limit: 10 });
  assert.equal(received?.covered, false); assert.equal(received?.afterKey, "REQ-004"); assert.equal(received?.limit, 11);
});

test("artifact URL rejects paths outside the scoped project", () => {
  const service = new ReadService(session, {} as ReadRepository);
  assert.throws(() => service.getArtifactUrl({ path: "99999999-9999-4999-8999-999999999999/job/file.png" }),
    (error: unknown) => error instanceof McpToolError && error.code === "INVALID_ARGUMENT");
});
