import assert from "node:assert/strict";
import test from "node:test";

import { loadConfig } from "../config.js";

const baseEnv = {
  TM_SUPABASE_URL: "https://example.supabase.co",
  TM_SUPABASE_ANON_KEY: "anon-key",
  TM_API_TOKEN: "api-token",
  TM_PROJECT_ID: "project-id",
};

test("loadConfig defaults to local stdio transport", () => {
  const config = loadConfig(baseEnv);
  assert.equal(config.transport, "stdio");
  assert.equal(config.httpHost, "127.0.0.1");
  assert.equal(config.httpPort, 3000);
});

test("loadConfig accepts HTTP transport settings", () => {
  const config = loadConfig({
    ...baseEnv,
    TM_MCP_TRANSPORT: "http",
    TM_MCP_HTTP_HOST: "0.0.0.0",
    TM_MCP_HTTP_PORT: "8080",
  });
  assert.equal(config.transport, "http");
  assert.equal(config.httpHost, "0.0.0.0");
  assert.equal(config.httpPort, 8080);
});

test("loadConfig rejects unknown transport", () => {
  assert.throws(() => loadConfig({ ...baseEnv, TM_MCP_TRANSPORT: "websocket" }), /must be stdio or http/);
});

test("loadConfig rejects unknown TM_ variables", () => {
  assert.throws(() => loadConfig({ ...baseEnv, TM_MCP_TRANSPROT: "stdio" }), /Unknown TestManager environment variable: TM_MCP_TRANSPROT/);
});
