import assert from "node:assert/strict";
import test from "node:test";
import { McpToolError } from "../helpers/response.js";
import type { AnalysisRepository } from "../repositories/analysisRepository.js";
import { AnalysisService } from "./analysisService.js";

test("analysis defaults are bounded and forwarded", async () => {
  let flaky: number[] = []; let retest: unknown[] = [];
  const repository = {
    flakyCandidates: async (...args: number[]) => { flaky = args; return []; },
    suggestRetest: async (...args: unknown[]) => { retest = args; return []; },
  } as unknown as AnalysisRepository;
  const service = new AnalysisService(repository); const id = "22222222-2222-4222-8222-222222222222";
  await service.flakyCandidates({}); await service.suggestRetest({ testRunId: id });
  assert.deepEqual(flaky, [10, 3, 25]); assert.deepEqual(retest, [id, 10, 25]);
});

test("run summary validates IDs and reports project-scoped misses", async () => {
  const service = new AnalysisService({ runSummary: async () => null } as unknown as AnalysisRepository);
  await assert.rejects(service.runSummary("bad"), (error: unknown) => error instanceof McpToolError && error.code === "INVALID_ARGUMENT");
  await assert.rejects(service.runSummary("22222222-2222-4222-8222-222222222222"), (error: unknown) => error instanceof McpToolError && error.code === "NOT_FOUND");
});
