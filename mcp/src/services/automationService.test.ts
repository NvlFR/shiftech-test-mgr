import assert from "node:assert/strict";
import test from "node:test";
import type { AutomationRepository } from "../repositories/automationRepository.js";
import { AutomationService } from "./automationService.js";

const id = "11111111-1111-4111-8111-111111111111";

test("map script normalizes runner labels", async () => {
  let received: unknown[] = [];
  const repository = { mapScript: async (...args: unknown[]) => { received = args; return {}; } } as unknown as AutomationRepository;
  await new AutomationService(repository).mapScript(id, " tests/login.spec.ts ", [" Chromium ", "chromium", "staging"]);
  assert.deepEqual(received, [id, "tests/login.spec.ts", ["chromium", "staging"]]);
});

test("enqueue requires exactly one target", async () => {
  const service = new AutomationService({} as AutomationRepository);
  assert.throws(() => service.enqueue({ runnerLabels: [], maxAttempts: 1 }));
  assert.throws(() => service.enqueue({ testCaseId: id, testPlanId: id, runnerLabels: [], maxAttempts: 1 }));
});

test("enqueue forwards normalized label routing", async () => {
  let received: unknown;
  const repository = { enqueue: async (input: unknown) => { received = input; return {}; } } as unknown as AutomationRepository;
  await new AutomationService(repository).enqueue({ testPlanId: id, name: " Run ", runnerLabels: [" VPN ", "vpn"], maxAttempts: 2 });
  assert.deepEqual(received, { testPlanId: id, name: "Run", runnerLabels: ["vpn"], maxAttempts: 2 });
});
