import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as z from "zod/v4";
import { successResponse, withErrorHandling } from "../helpers/response.js";
import type { AnalysisService } from "../services/analysisService.js";
import type { ProjectSession } from "../services/authService.js";

const annotations = { destructiveHint: false, readOnlyHint: true, idempotentHint: true } as const;
const lookbackRuns = z.number().int().min(2).max(50).optional().describe("Latest project runs per test case to inspect; default 10");
const limit = z.number().int().min(1).max(100).optional().describe("Maximum candidates; default 25");

export const createAnalysisToolRegistrar = (session: ProjectSession, service: AnalysisService) => (server: McpServer): void => {
  const run = (args: unknown, action: () => Promise<unknown>) => withErrorHandling(async () => { session.assertToolArguments(args); return successResponse(await action()); });
  server.registerTool("testmanager.analysis.run_summary", {
    description: "Analyze one regression run with on-demand counts, pass/failure rates, and bounded problematic results.",
    inputSchema: { testrun_id: z.string().uuid() }, annotations,
  }, async (a) => run(a, () => service.runSummary(a.testrun_id)));
  server.registerTool("testmanager.analysis.flaky_candidates", {
    description: "Find tests whose executed outcomes alternate between pass and fail across recent project runs.",
    inputSchema: { lookback_runs: lookbackRuns, min_executions: z.number().int().min(2).max(50).optional().describe("Minimum pass/fail executions; default 3"), limit }, annotations,
  }, async (a) => run(a, () => service.flakyCandidates({ lookbackRuns: a.lookback_runs, minExecutions: a.min_executions, limit: a.limit })));
  server.registerTool("testmanager.analysis.suggest_retest", {
    description: "Rank cases from one run for retest using outcome, priority, active issues, and recent pass/fail instability.",
    inputSchema: { testrun_id: z.string().uuid(), lookback_runs: lookbackRuns, limit }, annotations,
  }, async (a) => run(a, () => service.suggestRetest({ testRunId: a.testrun_id, lookbackRuns: a.lookback_runs, limit: a.limit })));
};
