import type { ServerConfig } from "../config.js";

export interface AutomationEnqueueInput {
  testCaseId?: string;
  testPlanId?: string;
  name?: string;
  runnerLabels: string[];
  maxAttempts: number;
}

export interface AutomationRerunFailedInput {
  issueId: string;
  name?: string;
  runnerLabels: string[];
  maxAttempts: number;
  confirmedBy?: string;
  explicitConfirmation: boolean;
  diffPaths?: string[];
  diffBase?: string;
  diffHead?: string;
}

export interface RegressionDiffContext {
  repositoryId: string | null;
  baseCommit: string | null;
  fixReferenceUrl: string | null;
}

export interface AutomationVerifyRegressionInput {
  issueId: string;
  testRunId: string;
}

export class AutomationRepositoryError extends Error {
  constructor() { super("TestManager automation request failed"); this.name = "AutomationRepositoryError"; }
}

export class AutomationRepository {
  constructor(private readonly config: ServerConfig, private readonly fetchImpl: typeof fetch = fetch) {}

  private async rpc(name: string, body: Record<string, unknown>): Promise<unknown> {
    let response: Response;
    try {
      response = await this.fetchImpl(`${this.config.supabaseUrl}/rest/v1/rpc/${name}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: this.config.supabaseAnonKey, Authorization: `Bearer ${this.config.supabaseAnonKey}` },
        body: JSON.stringify({ p_token: this.config.apiToken, p_project_id: this.config.projectId, ...body }),
      });
    } catch { throw new AutomationRepositoryError(); }
    if (!response.ok) throw new AutomationRepositoryError();
    return response.json();
  }

  mapScript(testCaseId: string, scriptRef: string, runnerLabels: string[]) {
    return this.rpc("mcp_map_automation_script", { p_test_case_id: testCaseId, p_script_ref: scriptRef, p_runner_labels: runnerLabels });
  }
  enqueue(input: AutomationEnqueueInput) {
    return this.rpc("mcp_enqueue_automation", { p_test_case_id: input.testCaseId ?? null, p_test_plan_id: input.testPlanId ?? null, p_name: input.name ?? null, p_runner_labels: input.runnerLabels, p_max_attempts: input.maxAttempts });
  }
  rerunFailed(input: AutomationRerunFailedInput) {
    return this.rpc("mcp_rerun_failed_automation", {
      p_issue_id: input.issueId,
      p_name: input.name ?? null,
      p_runner_labels: input.runnerLabels,
      p_max_attempts: input.maxAttempts,
      p_selection_limit: this.config.rerunFailedMaxTests,
      p_confirmed_by: input.confirmedBy ?? null,
      p_explicit_confirmation: input.explicitConfirmation,
      p_diff_paths: input.diffPaths ?? [],
      p_diff_base: input.diffBase ?? null,
      p_diff_head: input.diffHead ?? null,
    });
  }
  verifyRegression(input: AutomationVerifyRegressionInput) {
    return this.rpc("mcp_verify_regression", {
      p_issue_id: input.issueId,
      p_test_run_id: input.testRunId,
    });
  }
  async regressionDiffContext(issueId: string): Promise<RegressionDiffContext | null> {
    const value = await this.rpc("mcp_regression_diff_context", { p_issue_id: issueId });
    const row = Array.isArray(value) ? value[0] as Record<string, unknown> | undefined : undefined;
    return row ? {
      repositoryId: typeof row.repository_id === "string" ? row.repository_id : null,
      baseCommit: typeof row.base_commit === "string" ? row.base_commit : null,
      fixReferenceUrl: typeof row.fix_reference_url === "string" ? row.fix_reference_url : null,
    } : null;
  }
  jobStatus(jobId: string) { return this.rpc("mcp_automation_job_status", { p_job_id: jobId }); }
  runnerList() { return this.rpc("mcp_automation_runner_list", {}); }
}
