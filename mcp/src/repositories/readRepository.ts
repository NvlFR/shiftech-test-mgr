import type { ServerConfig } from "../config.js";
import { mapIssueDetailRow, mapIssueSummaryRow, mapProjectRow, mapRequirementCoverageRow, mapRequirementDetailRow, mapRequirementSummaryRow, mapTestCaseDetailRow, mapTestCaseSummaryRow, mapTestPlanDetailRow, mapTestPlanSummaryRow, mapTestResultSummaryRow, mapTestRunDetailRow, mapTestRunSummaryRow } from "../helpers/mappers.js";
import type { ArtifactUrl, IssueDetail, IssuePriority, IssueStatus, IssueSummary, Project, RequirementCoverage, RequirementDetail, RequirementPriority, RequirementStatus, RequirementSummary, TestCaseDetail, TestCasePriority, TestCaseStatus, TestCaseSummary, TestPlanDetail, TestPlanSummary, TestResultStatus, TestResultSummary, TestRunDetail, TestRunSummary } from "../types/domain.js";

export interface TestCaseSearchQuery {
  moduleId?: string;
  module?: string;
  tag?: string;
  priority?: TestCasePriority;
  status?: TestCaseStatus;
  text?: string;
  afterCode?: string;
  afterId?: string;
  limit: number;
}
export interface CodeCursorQuery { afterCode?: string; afterId?: string; limit: number }
export interface TestRunListQuery extends CodeCursorQuery { testPlanId?: string; status?: "in_progress" | "completed" }
export interface TestResultListQuery { status?: TestResultStatus; testerId?: string; testRunId?: string; afterCreatedAt?: string; afterId?: string; limit: number }
export interface IssueSearchQuery extends CodeCursorQuery { status?: IssueStatus; priority?: IssuePriority; assigneeId?: string; testRunId?: string; testCaseId?: string; text?: string }
export interface RequirementListQuery { status?: RequirementStatus; priority?: RequirementPriority; covered?: boolean; afterKey?: string; afterId?: string; limit: number }

export class ReadRepositoryError extends Error {
  constructor() {
    super("TestManager data service request failed");
    this.name = "ReadRepositoryError";
  }
}

export class ReadRepository {
  constructor(private readonly config: ServerConfig, private readonly transport: TransportAdapter) {}

  private async rpc(name: string, body: Record<string, unknown>): Promise<unknown> {
    try {
      return (await this.transport.request({ operation: name, body: { p_token: this.config.apiToken, p_project_id: this.config.projectId, ...body } })).data;
    } catch {
      throw new ReadRepositoryError();
    }
  }

  async listProjects(): Promise<Project[]> {
    const rows = await this.rpc("mcp_list_projects", {}) as unknown[];
    return rows.map(mapProjectRow);
  }

  async getProject(): Promise<Project | null> {
    const rows = await this.rpc("mcp_get_project", {}) as unknown[];
    return rows[0] ? mapProjectRow(rows[0]) : null;
  }

  async searchTestCases(query: TestCaseSearchQuery): Promise<TestCaseSummary[]> {
    const rows = await this.rpc("mcp_search_test_cases", {
      p_module_id: query.moduleId ?? null,
      p_module: query.module ?? null,
      p_tag: query.tag ?? null,
      p_priority: query.priority ?? null,
      p_status: query.status ?? null,
      p_text: query.text ?? null,
      p_after_code: query.afterCode ?? null,
      p_after_id: query.afterId ?? null,
      p_limit: query.limit,
    }) as unknown[];
    return rows.map(mapTestCaseSummaryRow);
  }

  async getTestCase(testCaseId: string): Promise<TestCaseDetail | null> {
    const rows = await this.rpc("mcp_get_test_case", { p_test_case_id: testCaseId }) as unknown[];
    return rows[0] ? mapTestCaseDetailRow(rows[0]) : null;
  }

  async listTestPlans(query: CodeCursorQuery): Promise<TestPlanSummary[]> {
    const rows = await this.rpc("mcp_list_test_plans", { p_after_code: query.afterCode ?? null, p_after_id: query.afterId ?? null, p_limit: query.limit }) as unknown[];
    return rows.map(mapTestPlanSummaryRow);
  }
  async getTestPlan(id: string): Promise<TestPlanDetail | null> {
    const rows = await this.rpc("mcp_get_test_plan", { p_test_plan_id: id }) as unknown[];
    return rows[0] ? mapTestPlanDetailRow(rows[0]) : null;
  }
  async listTestRuns(query: TestRunListQuery): Promise<TestRunSummary[]> {
    const rows = await this.rpc("mcp_list_test_runs", { p_test_plan_id: query.testPlanId ?? null, p_status: query.status ?? null,
      p_after_code: query.afterCode ?? null, p_after_id: query.afterId ?? null, p_limit: query.limit }) as unknown[];
    return rows.map(mapTestRunSummaryRow);
  }
  async getTestRun(id: string): Promise<TestRunDetail | null> {
    const rows = await this.rpc("mcp_get_test_run", { p_test_run_id: id }) as unknown[];
    return rows[0] ? mapTestRunDetailRow(rows[0]) : null;
  }
  async listTestResults(query: TestResultListQuery): Promise<TestResultSummary[]> {
    const rows = await this.rpc("mcp_list_test_results", { p_status: query.status ?? null, p_tester_id: query.testerId ?? null,
      p_test_run_id: query.testRunId ?? null, p_after_created_at: query.afterCreatedAt ?? null, p_after_id: query.afterId ?? null, p_limit: query.limit }) as unknown[];
    return rows.map(mapTestResultSummaryRow);
  }
  async searchIssues(query: IssueSearchQuery): Promise<IssueSummary[]> {
    const rows = await this.rpc("mcp_search_issues", { p_status: query.status ?? null, p_priority: query.priority ?? null,
      p_assignee_id: query.assigneeId ?? null, p_test_run_id: query.testRunId ?? null, p_test_case_id: query.testCaseId ?? null,
      p_text: query.text ?? null, p_after_code: query.afterCode ?? null, p_after_id: query.afterId ?? null, p_limit: query.limit }) as unknown[];
    return rows.map(mapIssueSummaryRow);
  }
  async getIssue(id: string): Promise<IssueDetail | null> { const rows = await this.rpc("mcp_get_issue", { p_issue_id: id }) as unknown[]; return rows[0] ? mapIssueDetailRow(rows[0]) : null; }
  async listRequirements(query: RequirementListQuery): Promise<RequirementSummary[]> {
    const rows = await this.rpc("mcp_list_requirements", { p_status: query.status ?? null, p_priority: query.priority ?? null, p_covered: query.covered ?? null,
      p_after_key: query.afterKey ?? null, p_after_id: query.afterId ?? null, p_limit: query.limit }) as unknown[];
    return rows.map(mapRequirementSummaryRow);
  }
  async getRequirement(id: string): Promise<RequirementDetail | null> { const rows = await this.rpc("mcp_get_requirement", { p_requirement_id: id }) as unknown[]; return rows[0] ? mapRequirementDetailRow(rows[0]) : null; }
  async getRequirementCoverage(): Promise<RequirementCoverage> { const rows = await this.rpc("mcp_requirement_coverage", {}) as unknown[]; return mapRequirementCoverageRow(rows[0]); }
  async getArtifactUrl(bucket: string, path: string, expiresIn: number): Promise<ArtifactUrl> {
    try {
      return (await this.transport.request<ArtifactUrl>({
        operation: "automation-artifacts",
        kind: "function",
        body: { token: this.config.apiToken, action: "download", bucket, path, expires_in: expiresIn },
      })).data;
    } catch { throw new ReadRepositoryError(); }
  }
}
import type { TransportAdapter } from "@testmanager/agent-core";
