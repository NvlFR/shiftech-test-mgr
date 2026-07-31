import type { ServerConfig } from "../config.js";

export interface AutomationEnqueueInput {
  testCaseId?: string;
  testPlanId?: string;
  name?: string;
  runnerLabels: string[];
  maxAttempts: number;
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
  jobStatus(jobId: string) { return this.rpc("mcp_automation_job_status", { p_job_id: jobId }); }
  runnerList() { return this.rpc("mcp_automation_runner_list", {}); }
}
