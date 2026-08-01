import { assert, assertEquals, assertThrows } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { computeDuplicateConfidence, generateTestCasesCsv, RequestSchema, TEST_CASE_IMPORT_COLUMNS, parseProviderJson, validateActionOutput } from "./contract.ts";
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

Deno.test("generate menerima teks, file, dan referensi repository", () => {
  const base = { action: "generate_test_cases", projectId: "11111111-1111-4111-8111-111111111111", options: { includeScenarios: true, includeEdgeCases: true, maxCases: 10 } };
  assert(RequestSchema.safeParse({ ...base, source: { type: "text", content: "Login" } }).success);
  assert(RequestSchema.safeParse({ ...base, source: { type: "csv", fileName: "requirements.csv", content: "id,requirement\nREQ-1,Login" } }).success);
  assert(RequestSchema.safeParse({ ...base, source: { type: "document", fileName: "requirements.md", content: "# Login" } }).success);
  assert(RequestSchema.safeParse({ ...base, source: { type: "repository", repositoryId: "22222222-2222-4222-8222-222222222222", ref: "main", path: "src/auth", context: "Auth flow" } }).success);
});

Deno.test("CSV generate memakai kolom template import secara persis dan meng-escape nilai", () => {
  const output = validateActionOutput("generate_test_cases", { testCases: [{ module: "Auth", title: "Login, valid", objective: "Verify", preconditions: "User", steps: "1. Click \"Login\"", expectedResult: "Dashboard", priority: "high", tags: ["smoke", "auth"], targetRole: "Admin" }] });
  assert("testCases" in output);
  const csv = generateTestCasesCsv(output);
  assertEquals(csv.split("\r\n")[0], TEST_CASE_IMPORT_COLUMNS.join(","));
  assertEquals(csv.split("\r\n").length, 2);
  assert(csv.includes('"Login, valid"'));
  assert(csv.includes('"1. Click ""Login"""'));
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
