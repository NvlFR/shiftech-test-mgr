import type { ServerConfig } from "../config.js";

export interface TestCaseWriteInput {
  title: string; moduleId?: string | null; objective?: string | null; preconditions?: string | null;
  steps: string; expectedResult: string; priority?: "low" | "medium" | "high" | "critical"; notes?: string | null;
}
export interface TestCaseChanges extends Partial<TestCaseWriteInput> {}

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
