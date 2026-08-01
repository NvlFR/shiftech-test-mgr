import type { ServerConfig } from "../config.js";

export interface TestCaseWriteInput {
  title: string; moduleId?: string | null; objective?: string | null; preconditions?: string | null;
  steps: string; expectedResult: string; priority?: "low" | "medium" | "high" | "critical"; notes?: string | null;
}
export interface TestCaseChanges extends Partial<TestCaseWriteInput> {}
export type TestResultWriteStatus = "pass" | "fail" | "skip" | "blocked";
export type IssuePriority = "low" | "medium" | "high" | "critical";
export type IssueStatus = "backlog" | "open" | "in_progress" | "resolved" | "verified" | "closed" | "rejected" | "duplicate";
export interface IssueWriteInput { testResultId: string; title: string; description?: string | null; actualResult?: string | null; expectedResult?: string | null; priority?: IssuePriority; }
export interface DuplicateIssueDraft { title: string; description?: string; actualResult?: string; expectedResult?: string; priority?: IssuePriority; }

export class WriteRepositoryError extends Error {
  constructor() { super("TestManager write service request failed"); this.name = "WriteRepositoryError"; }
}

export class WriteRepository {
  constructor(private readonly config: ServerConfig, private readonly fetchImpl: typeof fetch = fetch) {}

  private async rpc(name: string, body: Record<string, unknown>): Promise<unknown> {
    let response: Response;
    try {
      response = await this.fetchImpl(`${this.config.supabaseUrl}/rest/v1/rpc/${name}`, {
        method: "POST", headers: { "Content-Type": "application/json", apikey: this.config.supabaseAnonKey,
          Authorization: `Bearer ${this.config.supabaseAnonKey}` },
        body: JSON.stringify({ p_token: this.config.apiToken, p_project_id: this.config.projectId, ...body }),
      });
    } catch { throw new WriteRepositoryError(); }
    if (!response.ok) throw new WriteRepositoryError();
    return response.json();
  }

  createTestCases(cases: TestCaseWriteInput[]) { return this.rpc("mcp_create_test_cases", { p_cases: cases.map(toCaseRow) }); }
  updateTestCase(id: string, changes: TestCaseChanges) { return this.rpc("mcp_update_test_case", { p_test_case_id: id, p_changes: toCaseRow(changes) }); }
  duplicateTestCase(id: string, title?: string) { return this.rpc("mcp_duplicate_test_case", { p_test_case_id: id, p_title: title ?? null }); }
  archiveTestCase(id: string) { return this.rpc("mcp_archive_test_case", { p_test_case_id: id }); }
  createTestPlan(input: { name: string; description?: string | null }) { return this.rpc("mcp_create_test_plan", { p_name: input.name, p_description: input.description ?? null }); }
  addTestPlanCases(id: string, caseIds: string[]) { return this.rpc("mcp_add_test_plan_cases", { p_test_plan_id: id, p_test_case_ids: caseIds }); }
  removeTestPlanCases(id: string, caseIds: string[]) { return this.rpc("mcp_remove_test_plan_cases", { p_test_plan_id: id, p_test_case_ids: caseIds }); }
  createTestRun(input: { testPlanId: string; name: string; notes?: string | null }) {
    return this.rpc("mcp_create_test_run", { p_test_plan_id: input.testPlanId, p_name: input.name, p_notes: input.notes ?? null });
  }
  recordTestResult(input: { testResultId: string; testerId: string; status: TestResultWriteStatus; notes?: string | null }) {
    return this.rpc("mcp_record_test_result", { p_test_result_id: input.testResultId, p_tester_id: input.testerId, p_status: input.status, p_notes: input.notes ?? null });
  }
  completeTestRun(id: string, notes?: string | null) {
    return this.rpc("mcp_complete_test_run", { p_test_run_id: id, p_notes: notes ?? null });
  }
  createIssue(input: IssueWriteInput) { return this.rpc("mcp_create_issue", { p_test_result_id: input.testResultId, p_title: input.title, p_description: input.description ?? null, p_actual_result: input.actualResult ?? null, p_expected_result: input.expectedResult ?? null, p_priority: input.priority ?? "medium" }); }
  commentIssue(id: string, body: string) { return this.rpc("mcp_comment_issue", { p_issue_id: id, p_body: body }); }
  updateIssueStatus(id: string, status: IssueStatus) { return this.rpc("mcp_update_issue_status", { p_issue_id: id, p_status: status }); }
  duplicateIssueCandidates() { return this.rpc("mcp_issue_duplicate_candidates", {}); }
  async detectDuplicate(draft: DuplicateIssueDraft, candidates: unknown[]) {
    if (!this.config.supabaseAccessToken) throw new WriteRepositoryError();
    let response: Response;
    try {
      response = await this.fetchImpl(`${this.config.supabaseUrl}/functions/v1/ai-gateway`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: this.config.supabaseAnonKey, Authorization: `Bearer ${this.config.supabaseAccessToken}` },
        body: JSON.stringify({ action: "duplicate_issue_detection", projectId: this.config.projectId, draft, candidates }),
      });
    } catch { throw new WriteRepositoryError(); }
    if (!response.ok) throw new WriteRepositoryError();
    const payload = await response.json() as { data?: unknown };
    return payload.data ?? payload;
  }
}

const toCaseRow = (input: TestCaseChanges): Record<string, unknown> => {
  const row: Record<string, unknown> = {};
  if (input.title !== undefined) row.title = input.title;
  if (input.moduleId !== undefined) row.module_id = input.moduleId;
  if (input.objective !== undefined) row.objective = input.objective;
  if (input.preconditions !== undefined) row.preconditions = input.preconditions;
  if (input.steps !== undefined) row.steps = input.steps;
  if (input.expectedResult !== undefined) row.expected_result = input.expectedResult;
  if (input.priority !== undefined) row.priority = input.priority;
  if (input.notes !== undefined) row.notes = input.notes;
  return row;
};
