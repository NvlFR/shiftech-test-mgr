import assert from "node:assert/strict";
import test from "node:test";

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { registerTools, type ToolRegistry } from "./registry.js";

const unusedServer = {} as McpServer;

test("read-only mode registers read tools without invoking write registrars", () => {
  const registered: string[] = [];
  const registry: ToolRegistry = {
    read: [() => registered.push("project.list")],
    write: [() => registered.push("testcase.create_bulk")],
  };

  registerTools(unusedServer, registry, true);

  assert.deepEqual(registered, ["project.list"]);
});

test("normal mode registers both read and write tools", () => {
  const registered: string[] = [];
  const registry: ToolRegistry = {
    read: [() => registered.push("project.list")],
    write: [() => registered.push("testcase.create_bulk")],
  };

  registerTools(unusedServer, registry, false);

  assert.deepEqual(registered, ["project.list", "testcase.create_bulk"]);
});
