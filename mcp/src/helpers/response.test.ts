import assert from "node:assert/strict";
import test from "node:test";
import { registerSecret } from "@testmanager/agent-core";

import {
  DEFAULT_PAGE_SIZE,
  MAX_RESPONSE_BYTES,
  McpToolError,
  errorResponse,
  normalizePageSize,
  paginatedResponse,
  successResponse,
  withErrorHandling,
} from "./response.js";

const body = (response: ReturnType<typeof successResponse>): Record<string, unknown> =>
  JSON.parse(response.content[0]?.text ?? "{}") as Record<string, unknown>;

test("normalizes and validates the shared page limit", () => {
  assert.equal(normalizePageSize(undefined), DEFAULT_PAGE_SIZE);
  assert.equal(normalizePageSize(1), 1);
  assert.throws(() => normalizePageSize(0), (error: unknown) =>
    error instanceof McpToolError && error.code === "INVALID_PAGINATION");
  assert.throws(() => normalizePageSize(101), McpToolError);
});

test("returns one bounded page and a cursor when another row exists", () => {
  const response = paginatedResponse(
    [{ id: "one" }, { id: "two" }, { id: "three" }],
    { limit: 2 },
    (row) => row.id,
  );
  const envelope = body(response);

  assert.deepEqual(envelope.data, [{ id: "one" }, { id: "two" }]);
  assert.deepEqual(envelope.pagination, {
    limit: 2,
    returned: 2,
    hasMore: true,
    nextCursor: "two",
  });
});

test("trims a page to the response byte limit without breaking JSON", () => {
  const chunk = "x".repeat(90_000);
  const response = paginatedResponse(
    [{ id: "one", chunk }, { id: "two", chunk }, { id: "three", chunk }],
    { limit: 3 },
    (row) => row.id,
  );
  const envelope = body(response);
  const pagination = envelope.pagination as { returned: number; hasMore: boolean; nextCursor: string };

  assert.equal(pagination.returned, 2);
  assert.equal(pagination.hasMore, true);
  assert.equal(pagination.nextCursor, "two");
  assert.ok(Buffer.byteLength(response.content[0]?.text ?? "", "utf8") <= MAX_RESPONSE_BYTES);
});

test("rejects one oversized item with a recoverable error", async () => {
  const response = await withErrorHandling(async () => paginatedResponse(
    [{ id: "one", chunk: "x".repeat(MAX_RESPONSE_BYTES) }],
    { limit: 1 },
    (row) => row.id,
  ));

  assert.equal(response.isError, true);
  assert.deepEqual(body(response), {
    error: {
      code: "RESPONSE_ITEM_TOO_LARGE",
      message: "A single result exceeds the MCP context size limit",
      hint: "Use a detail tool, request fewer fields, or narrow the query.",
    },
  });
});

test("returns structured known errors and redacts unknown error details", () => {
  const known = body(errorResponse(new McpToolError("NOT_FOUND", "Case not found", "Check the case ID.")));
  const unknown = body(errorResponse(new Error("secret upstream response")));

  assert.deepEqual(known, {
    error: { code: "NOT_FOUND", message: "Case not found", hint: "Check the case ID." },
  });
  assert.equal((unknown.error as { code: string }).code, "INTERNAL_ERROR");
  assert.equal(JSON.stringify(unknown).includes("secret upstream response"), false);
});

test("enforces the same size limit for non-paginated responses", () => {
  assert.throws(
    () => successResponse({ chunk: "x".repeat(MAX_RESPONSE_BYTES) }),
    (error: unknown) => error instanceof McpToolError && error.code === "RESPONSE_TOO_LARGE",
  );
});

test("redacts registered secrets from every MCP response envelope", () => {
  const runnerToken = "runner-token-response-fixture";
  const bootstrapCode = "bootstrap-code-response-fixture";
  const repositoryCredential = "repository-credential-response-fixture";
  for (const secret of [runnerToken, bootstrapCode, repositoryCredential]) registerSecret(secret);

  const response = successResponse({ runnerToken, bootstrapCode, repositoryCredential });
  const serialized = response.content[0]?.text ?? "";

  for (const secret of [runnerToken, bootstrapCode, repositoryCredential]) {
    assert.equal(serialized.includes(secret), false);
  }
  assert.match(serialized, /\[REDACTED\]/);
});
