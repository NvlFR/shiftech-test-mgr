import { McpToolError, normalizePageSize } from "../helpers/response.js";
import type { ProjectSession } from "./authService.js";
import type { ReadRepository, TestCaseSearchQuery } from "../repositories/readRepository.js";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

interface SearchCursor { code: string; id: string }

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
}
