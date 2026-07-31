import assert from "node:assert/strict";
import test from "node:test";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import type { ReadService } from "../services/readService.js";
import type { ProjectSession } from "../services/authService.js";
import { createReadToolRegistrar } from "./readTools.js";

test("registers every discovery/read tool from batches 1 through 3", () => {
  const names: string[] = [];
  const server = { registerTool: (name: string) => { names.push(name); } } as unknown as McpServer;
  createReadToolRegistrar({} as ProjectSession, {} as ReadService)(server);
  assert.deepEqual(names, [
    "testmanager.project.list", "testmanager.project.get", "testmanager.testcase.search", "testmanager.testcase.get",
    "testmanager.testplan.list", "testmanager.testplan.get", "testmanager.testrun.list", "testmanager.testrun.get",
    "testmanager.testresult.list", "testmanager.issue.search", "testmanager.issue.get",
    "testmanager.requirement.list", "testmanager.requirement.get", "testmanager.requirement.coverage",
    "testmanager.artifact.get_url",
  ]);
});
