import { assert, assertEquals, assertThrows } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { computeDuplicateConfidence, parseProviderJson, validateActionOutput } from "./contract.ts";
import { MockProvider } from "./providers.ts";
import { InMemoryRateLimiter, redactSensitive } from "./security.ts";

Deno.test("parseProviderJson menerima JSON fenced dan menolak JSON invalid", async () => {
  assertEquals(parseProviderJson("```json\n{\"ok\":true}\n```"), { ok: true });
  assertThrows(() => parseProviderJson("not-json"));
});

Deno.test("schema menolak draft test case invalid", () => {
  assertThrows(() => validateActionOutput("generate_test_cases", { testCases: [] }));
});

Deno.test("mock provider menghasilkan kontrak generate", async () => {
  const raw = await new MockProvider().complete({ action: "generate_test_cases", prompt: JSON.stringify({ input: { requirement: "login" } }), timeoutMs: 1000 });
  assertEquals(validateActionOutput("generate_test_cases", raw).testCases.length, 1);
});

Deno.test("redaction tidak meneruskan secret dan email", () => {
  const redacted = JSON.stringify(redactSensitive({ apiKey: "sk-secret", owner: "qa@example.com" }));
  assert(!redacted.includes("sk-secret"));
  assert(!redacted.includes("qa@example.com"));
});

Deno.test("rate limiter mengembalikan retry window", () => {
  const limiter = new InMemoryRateLimiter(1, 1000);
  assertEquals(limiter.consume("user").allowed, true);
  assertEquals(limiter.consume("user").allowed, false);
});

Deno.test("duplicate confidence berbasis token", () => {
  assertEquals(computeDuplicateConfidence("Login gagal", "Login gagal setelah submit"), 0.5);
});
