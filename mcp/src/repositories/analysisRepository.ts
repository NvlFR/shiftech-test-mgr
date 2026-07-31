import type { ServerConfig } from "../config.js";
import { mapAnalysisRunSummaryRow, mapFlakyCandidateRow, mapRetestSuggestionRow } from "../helpers/mappers.js";
import type { AnalysisRunSummary, FlakyCandidate, RetestSuggestion } from "../types/domain.js";

export class AnalysisRepositoryError extends Error {
  constructor() { super("TestManager analysis service request failed"); this.name = "AnalysisRepositoryError"; }
}

export class AnalysisRepository {
  constructor(private readonly config: ServerConfig, private readonly fetchImpl: typeof fetch = fetch) {}

  private async rpc(name: string, body: Record<string, unknown>): Promise<unknown> {
    let response: Response;
    try {
      response = await this.fetchImpl(`${this.config.supabaseUrl}/rest/v1/rpc/${name}`, {
        method: "POST", headers: { "Content-Type": "application/json", apikey: this.config.supabaseAnonKey, Authorization: `Bearer ${this.config.supabaseAnonKey}` },
        body: JSON.stringify({ p_token: this.config.apiToken, p_project_id: this.config.projectId, ...body }),
      });
    } catch { throw new AnalysisRepositoryError(); }
    if (!response.ok) throw new AnalysisRepositoryError();
    return response.json();
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
