import assert from "node:assert/strict";
import test from "node:test";
import type { GovernanceRepository } from "../repositories/governanceRepository.js";
import { GovernanceService, ToolRateLimitError } from "./governanceService.js";

test("mencatat completed dan latency untuk tool sukses", async () => {
  const completions: unknown[][] = [];
  const repository = {
    beginToolCall: async () => ({ auditId: "audit-1", allowed: true }),
    completeToolCall: async (...args: unknown[]) => { completions.push(args); },
  } as unknown as GovernanceRepository;
  const times = [100, 137];
  const result = await new GovernanceService(repository, () => times.shift() ?? 137).execute("testmanager.project.list", async () => ({ ok: true }));
  assert.deepEqual(result, { ok: true });
  assert.deepEqual(completions, [["audit-1", "completed", 37]]);
});

test("hasil MCP isError dicatat failed", async () => {
  let status = "";
  const repository = {
    beginToolCall: async () => ({ auditId: "audit-2", allowed: true }),
    completeToolCall: async (_id: string, value: string) => { status = value; },
  } as unknown as GovernanceRepository;
  await new GovernanceService(repository, () => 1).execute("testmanager.project.get", async () => ({ isError: true }));
  assert.equal(status, "failed");
});

test("rate limited tidak menjalankan operasi atau completion kedua", async () => {
  let invoked = false;
  const repository = {
    beginToolCall: async () => ({ auditId: "audit-3", allowed: false }),
    completeToolCall: async () => assert.fail("rate-limited audit sudah final dari RPC begin"),
  } as unknown as GovernanceRepository;
  await assert.rejects(new GovernanceService(repository).execute("testmanager.project.list", async () => { invoked = true; }), ToolRateLimitError);
  assert.equal(invoked, false);
});
