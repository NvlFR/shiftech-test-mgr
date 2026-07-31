import assert from "node:assert/strict";
import test from "node:test";
import { McpToolError } from "../helpers/response.js";
import type { WriteRepository } from "../repositories/writeRepository.js";
import { WriteService } from "./writeService.js";

const repository = {
  createTestPlan: async () => ({ id: "plan", status: "draft" }),
  addTestPlanCases: async () => ({ added: 1 }),
} as unknown as WriteRepository;

test("marks every write result as draft and review_only", async () => {
  const result = await new WriteService(repository).createTestPlan({ name: " Regression " });
  assert.equal(result.status, "draft");
  assert.equal(result.mode, "review_only");
});

test("deduplicates case IDs and validates UUIDs before repository calls", async () => {
  const id = "11111111-1111-4111-8111-111111111111";
  let received: string[] = [];
  const repo = { addTestPlanCases: async (_plan: string, ids: string[]) => { received = ids; return {}; } } as unknown as WriteRepository;
  await new WriteService(repo).addTestPlanCases(id, [id, id]);
  assert.deepEqual(received, [id]);
  await assert.rejects(new WriteService(repository).addTestPlanCases("bad", [id]), (error: unknown) => error instanceof McpToolError && error.code === "INVALID_ARGUMENT");
});

test("requires explicit human approval before approving a test plan", async () => {
  const id = "11111111-1111-4111-8111-111111111111";
  let received: unknown[] = [];
  const repo = { approveTestPlan: async (...args: unknown[]) => { received = args; return { id, status: "active", approved_by: id }; } } as unknown as WriteRepository;
  const service = new WriteService(repo);
  await assert.rejects(service.approveTestPlan(id, id, false), (error: unknown) => error instanceof McpToolError && error.code === "INVALID_ARGUMENT");
  const result = await service.approveTestPlan(id, id, true);
  assert.deepEqual(received, [id, id, true]);
  assert.deepEqual(result, { id, status: "active", approved_by: id });
});

test("test run workflow validates IDs and preserves explicit completion", async () => {
  const id = "11111111-1111-4111-8111-111111111111";
  const calls: string[] = [];
  const repo = {
    createTestRun: async () => { calls.push("create"); return { id }; },
    recordTestResult: async () => { calls.push("record"); return { id }; },
    completeTestRun: async () => { calls.push("complete"); return { id, status: "completed" }; },
  } as unknown as WriteRepository;
  const service = new WriteService(repo);
  await service.createTestRun({ testPlanId: id, name: " Regression " });
  await service.recordTestResult({ testResultId: id, testerId: id, status: "fail" });
  await service.completeTestRun(id);
  assert.deepEqual(calls, ["create", "record", "complete"]);
  await assert.rejects(service.recordTestResult({ testResultId: id, testerId: id, status: "not_run" as never }), (error: unknown) => error instanceof McpToolError && error.code === "INVALID_ARGUMENT");
});

test("issue workflow requires a test result and keeps AI duplicate output review-only", async () => {
  const id = "11111111-1111-4111-8111-111111111111";
  const repo = {
    createIssue: async (input: unknown) => input,
    duplicateIssueCandidates: async () => [{ id }],
    detectDuplicate: async () => ({ candidates: [{ issueId: id, confidence: 0.9, reason: "same" }] }),
  } as unknown as WriteRepository;
  const service = new WriteService(repo);
  await assert.rejects(service.createIssue({ testResultId: "bad", title: "Bug" }), (error: unknown) => error instanceof McpToolError && error.code === "INVALID_ARGUMENT");
  const created = await service.createIssue({ testResultId: id, title: " Bug " });
  assert.equal(created.status, "draft");
  const detected = await service.detectDuplicate({ title: "Bug" });
  assert.equal(detected.mode, "review_only");
});
