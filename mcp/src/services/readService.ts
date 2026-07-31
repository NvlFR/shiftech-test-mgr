import { McpToolError, normalizePageSize } from "../helpers/response.js";
import type { ProjectSession } from "./authService.js";
import type { IssueSearchQuery, ReadRepository, RequirementListQuery, TestCaseSearchQuery, TestResultListQuery, TestRunListQuery } from "../repositories/readRepository.js";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

interface SearchCursor { code: string; id: string }
interface ResultCursor { createdAt: string; id: string }

const decodeCursor = (cursor: string | undefined): SearchCursor | undefined => {
  if (!cursor) return undefined;
  try {
    const value = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")) as Partial<SearchCursor>;
    if (typeof value.code !== "string" || !UUID_PATTERN.test(value.id ?? "")) throw new Error();
    return { code: value.code, id: value.id! };
  } catch {
    throw new McpToolError("INVALID_CURSOR", "cursor is invalid", "Use the nextCursor returned by the previous response.");
  }
};

export const encodeTestCaseCursor = (row: { code: string; id: string }): string =>
  Buffer.from(JSON.stringify({ code: row.code, id: row.id }), "utf8").toString("base64url");
export const encodeCodeCursor = encodeTestCaseCursor;
export const encodeRequirementCursor = (row: { key: string; id: string }): string =>
  Buffer.from(JSON.stringify({ code: row.key, id: row.id }), "utf8").toString("base64url");
export const encodeTestResultCursor = (row: { createdAt: string; id: string }): string =>
  Buffer.from(JSON.stringify({ createdAt: row.createdAt, id: row.id }), "utf8").toString("base64url");

const decodeResultCursor = (cursor: string | undefined): ResultCursor | undefined => {
  if (!cursor) return undefined;
  try {
    const value = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")) as Partial<ResultCursor>;
    if (typeof value.createdAt !== "string" || Number.isNaN(Date.parse(value.createdAt)) || !UUID_PATTERN.test(value.id ?? "")) throw new Error();
    return { createdAt: value.createdAt, id: value.id! };
  } catch {
    throw new McpToolError("INVALID_CURSOR", "cursor is invalid", "Use the nextCursor returned by the previous response.");
  }
};

export class ReadService {
  constructor(private readonly session: ProjectSession, private readonly repository: ReadRepository) {}

  listProjects() { return this.repository.listProjects(); }

  async getProject(projectId?: string) {
    if (projectId) this.session.assertProject(projectId);
    const project = await this.repository.getProject();
    if (!project) throw new McpToolError("NOT_FOUND", "Project was not found", "Check that the session token still has access to this project.");
    return project;
  }

  searchTestCases(input: Omit<TestCaseSearchQuery, "limit" | "afterCode" | "afterId"> & { cursor?: string; limit?: number }) {
    if (input.moduleId && !UUID_PATTERN.test(input.moduleId)) {
      throw new McpToolError("INVALID_ARGUMENT", "module_id must be a valid UUID", "Pass a module UUID or use the module name filter.");
    }
    const cursor = decodeCursor(input.cursor);
    return this.repository.searchTestCases({
      ...input,
      limit: normalizePageSize(input.limit) + 1,
      afterCode: cursor?.code,
      afterId: cursor?.id,
    });
  }

  async getTestCase(testCaseId: string) {
    if (!UUID_PATTERN.test(testCaseId)) {
      throw new McpToolError("INVALID_ARGUMENT", "testcase_id must be a valid UUID", "Pass the UUID returned by testcase.search.");
    }
    const testCase = await this.repository.getTestCase(testCaseId);
    if (!testCase) throw new McpToolError("NOT_FOUND", "Test case was not found", "Check the ID and confirm it belongs to the scoped project.");
    return testCase;
  }

  listTestPlans(input: { cursor?: string; limit?: number }) {
    const cursor = decodeCursor(input.cursor);
    return this.repository.listTestPlans({ limit: normalizePageSize(input.limit) + 1, afterCode: cursor?.code, afterId: cursor?.id });
  }
  async getTestPlan(id: string) {
    this.assertUuid(id, "testplan_id", "testplan.list");
    const value = await this.repository.getTestPlan(id);
    if (!value) throw new McpToolError("NOT_FOUND", "Test plan was not found", "Check the ID and confirm it belongs to the scoped project.");
    return value;
  }
  listTestRuns(input: Omit<TestRunListQuery, "limit" | "afterCode" | "afterId"> & { cursor?: string; limit?: number }) {
    if (input.testPlanId) this.assertUuid(input.testPlanId, "testplan_id", "testplan.list");
    const cursor = decodeCursor(input.cursor);
    return this.repository.listTestRuns({ ...input, limit: normalizePageSize(input.limit) + 1, afterCode: cursor?.code, afterId: cursor?.id });
  }
  async getTestRun(id: string) {
    this.assertUuid(id, "testrun_id", "testrun.list");
    const value = await this.repository.getTestRun(id);
    if (!value) throw new McpToolError("NOT_FOUND", "Test run was not found", "Check the ID and confirm it belongs to the scoped project.");
    return value;
  }
  listTestResults(input: Omit<TestResultListQuery, "limit" | "afterCreatedAt" | "afterId"> & { cursor?: string; limit?: number }) {
    if (input.testerId) this.assertUuid(input.testerId, "tester_id", "profile IDs from TestManager");
    if (input.testRunId) this.assertUuid(input.testRunId, "testrun_id", "testrun.list");
    const cursor = decodeResultCursor(input.cursor);
    return this.repository.listTestResults({ ...input, limit: normalizePageSize(input.limit) + 1,
      afterCreatedAt: cursor?.createdAt, afterId: cursor?.id });
  }
  searchIssues(input: Omit<IssueSearchQuery, "limit" | "afterCode" | "afterId"> & { cursor?: string; limit?: number }) {
    if (input.assigneeId) this.assertUuid(input.assigneeId, "assignee_id", "profile IDs from TestManager");
    if (input.testRunId) this.assertUuid(input.testRunId, "testrun_id", "testrun.list");
    if (input.testCaseId) this.assertUuid(input.testCaseId, "testcase_id", "testcase.search");
    const cursor = decodeCursor(input.cursor);
    return this.repository.searchIssues({ ...input, limit: normalizePageSize(input.limit) + 1, afterCode: cursor?.code, afterId: cursor?.id });
  }
  async getIssue(id: string) { this.assertUuid(id, "issue_id", "issue.search"); const value = await this.repository.getIssue(id);
    if (!value) throw new McpToolError("NOT_FOUND", "Issue was not found", "Check the ID and confirm it belongs to the scoped project."); return value; }
  listRequirements(input: Omit<RequirementListQuery, "limit" | "afterKey" | "afterId"> & { cursor?: string; limit?: number }) {
    const cursor = decodeCursor(input.cursor);
    return this.repository.listRequirements({ ...input, limit: normalizePageSize(input.limit) + 1, afterKey: cursor?.code, afterId: cursor?.id });
  }
  async getRequirement(id: string) { this.assertUuid(id, "requirement_id", "requirement.list"); const value = await this.repository.getRequirement(id);
    if (!value) throw new McpToolError("NOT_FOUND", "Requirement was not found", "Check the ID and confirm it belongs to the scoped project."); return value; }
  getRequirementCoverage() { return this.repository.getRequirementCoverage(); }
  getArtifactUrl(input: { bucket?: string; path: string; expiresIn?: number }) {
    const bucket = input.bucket ?? "automation-artifacts";
    if (bucket !== "automation-artifacts") throw new McpToolError("INVALID_ARGUMENT", "bucket is not supported", "Use the automation-artifacts bucket.");
    const normalized = input.path.replace(/^\/+/, "");
    if (!normalized || normalized.includes("..") || !normalized.startsWith(`${this.session.projectId}/`))
      throw new McpToolError("INVALID_ARGUMENT", "path must belong to the scoped project", "Pass an artifact path returned by an automation job.");
    return this.repository.getArtifactUrl(bucket, normalized, Math.min(Math.max(input.expiresIn ?? 120, 30), 3600));
  }
  private assertUuid(value: string, field: string, source: string): void {
    if (!UUID_PATTERN.test(value)) throw new McpToolError("INVALID_ARGUMENT", `${field} must be a valid UUID`, `Pass a UUID returned by ${source}.`);
  }
}
