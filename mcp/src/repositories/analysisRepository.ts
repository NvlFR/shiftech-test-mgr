import type { ServerConfig } from "../config.js";
import { mapAnalysisRunSummaryRow, mapFlakyCandidateRow, mapRetestSuggestionRow } from "../helpers/mappers.js";
import type { AnalysisRunSummary, FlakyCandidate, RetestSuggestion } from "../types/domain.js";

export class AnalysisRepositoryError extends Error {
  constructor() { super("TestManager analysis service request failed"); this.name = "AnalysisRepositoryError"; }
}

export class AnalysisRepository {
  constructor(private readonly config: ServerConfig, private readonly transport: TransportAdapter) {}

  private async rpc(name: string, body: Record<string, unknown>): Promise<unknown> {
    try {
      return (await this.transport.request({ operation: name, body: { p_token: this.config.apiToken, p_project_id: this.config.projectId, ...body } })).data;
    } catch { throw new AnalysisRepositoryError(); }
  }

  async runSummary(testRunId: string): Promise<AnalysisRunSummary | null> {
    const value = await this.rpc("mcp_analysis_run_summary", { p_test_run_id: testRunId });
    return value ? mapAnalysisRunSummaryRow(value) : null;
  }
  async flakyCandidates(lookbackRuns: number, minExecutions: number, limit: number): Promise<FlakyCandidate[]> {
    const rows = await this.rpc("mcp_analysis_flaky_candidates", { p_lookback_runs: lookbackRuns, p_min_executions: minExecutions, p_limit: limit }) as unknown[];
    return rows.map(mapFlakyCandidateRow);
  }
  async suggestRetest(testRunId: string, lookbackRuns: number, limit: number): Promise<RetestSuggestion[]> {
    const rows = await this.rpc("mcp_analysis_suggest_retest", { p_test_run_id: testRunId, p_lookback_runs: lookbackRuns, p_limit: limit }) as unknown[];
    return rows.map(mapRetestSuggestionRow);
  }
}
import type { TransportAdapter } from "@testmanager/agent-core";
