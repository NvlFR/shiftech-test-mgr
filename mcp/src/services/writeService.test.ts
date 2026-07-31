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
