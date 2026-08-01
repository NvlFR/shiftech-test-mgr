import assert from "node:assert/strict";
import test from "node:test";

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import type { GovernanceService } from "../services/governanceService.js";
import { installToolGovernance, registerTools, type ToolRegistry } from "./registry.js";

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

test("governance membungkus setiap handler berdasarkan nama tool", async () => {
  let registeredHandler: ((args: unknown) => Promise<unknown>) | undefined;
  const fakeServer = {
    registerTool: (_name: string, _definition: unknown, handler: (args: unknown) => Promise<unknown>) => { registeredHandler = handler; },
  } as unknown as McpServer;
  const calls: string[] = [];
  const governance = {
    execute: async (name: string, operation: () => Promise<unknown>) => { calls.push(name); return operation(); },
  } as GovernanceService;

  installToolGovernance(fakeServer, governance);
  (fakeServer.registerTool as unknown as (name: string, definition: unknown, handler: (args: unknown) => Promise<unknown>) => void)(
    "testmanager.project.list", {}, async () => ({ content: [] }),
  );
  assert.deepEqual(await registeredHandler?.({}), { content: [] });
  assert.deepEqual(calls, ["testmanager.project.list"]);
});
