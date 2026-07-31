import assert from "node:assert/strict";
import test from "node:test";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { AnalysisService } from "../services/analysisService.js";
import type { ProjectSession } from "../services/authService.js";
import { createAnalysisToolRegistrar } from "./analysisTools.js";

test("registers all analysis tools as read-only catalog", () => {
  const names: string[] = [];
  createAnalysisToolRegistrar({} as ProjectSession, {} as AnalysisService)({ registerTool: (name: string) => names.push(name) } as unknown as McpServer);
  assert.deepEqual(names, ["testmanager.analysis.run_summary", "testmanager.analysis.flaky_candidates", "testmanager.analysis.suggest_retest"]);
});
