import assert from "node:assert/strict";
import test from "node:test";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ProjectSession } from "../services/authService.js";
import type { AutomationService } from "../services/automationService.js";
import { createAutomationReadToolRegistrar, createAutomationWriteToolRegistrar } from "./automationTools.js";

test("registers automation read and write catalogs separately", () => {
  const read: string[] = []; const write: string[] = [];
  createAutomationReadToolRegistrar({} as ProjectSession, {} as AutomationService)({ registerTool: (name: string) => read.push(name) } as unknown as McpServer);
  createAutomationWriteToolRegistrar({} as ProjectSession, {} as AutomationService)({ registerTool: (name: string) => write.push(name) } as unknown as McpServer);
  assert.deepEqual(read, ["testmanager.automation.job_status", "testmanager.automation.runner_list"]);
  assert.deepEqual(write, ["testmanager.automation.map_script", "testmanager.automation.enqueue", "testmanager.automation.rerun_failed", "testmanager.automation.verify_regression"]);
});
