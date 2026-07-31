import assert from "node:assert/strict";
import test from "node:test";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ProjectSession } from "../services/authService.js";
import type { WriteService } from "../services/writeService.js";
import { createWriteToolRegistrar } from "./writeTools.js";

test("registers the MCP write tools including the human approval gate", () => {
  const names: string[] = [];
  const server = { registerTool: (name: string) => names.push(name) } as unknown as McpServer;
  createWriteToolRegistrar({} as ProjectSession, {} as WriteService)(server);
  assert.deepEqual(names, [
    "testmanager.testcase.create_bulk", "testmanager.testcase.update", "testmanager.testcase.duplicate",
    "testmanager.testcase.archive", "testmanager.testplan.create", "testmanager.testplan.add_cases",
    "testmanager.testplan.remove_cases", "testmanager.testplan.approve",
    "testmanager.testrun.create", "testmanager.testrun.record_result", "testmanager.testrun.complete",
  ]);
});
