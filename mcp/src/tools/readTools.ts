import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as z from "zod/v4";

import { paginatedResponse, successResponse, withErrorHandling } from "../helpers/response.js";
import type { ReadService } from "../services/readService.js";
import { encodeCodeCursor, encodeRequirementCursor, encodeTestCaseCursor, encodeTestResultCursor } from "../services/readService.js";
import type { ProjectSession } from "../services/authService.js";

const paginationSchema = {
  cursor: z.string().optional().describe("Opaque nextCursor from the previous response"),
  limit: z.number().int().min(1).max(100).optional().describe("Page size, default 50 and maximum 100"),
};

export const createReadToolRegistrar = (session: ProjectSession, service: ReadService) =>
  (server: McpServer): void => {
    server.registerTool("testmanager.project.list", {
      description: "List projects accessible to this project-scoped API token.",
      inputSchema: {},
      annotations: { readOnlyHint: true, idempotentHint: true },
    }, async (arguments_) => withErrorHandling(async () => {
      session.assertToolArguments(arguments_);
      return successResponse(await service.listProjects());
    }));

    server.registerTool("testmanager.project.get", {
      description: "Get the project bound to this MCP session.",
      inputSchema: {
        project_id: z.string().uuid().optional().describe("Optional project ID; must match the scoped session"),
      },
      annotations: { readOnlyHint: true, idempotentHint: true },
    }, async (arguments_) => withErrorHandling(async () => {
      session.assertToolArguments(arguments_);
      return successResponse(await service.getProject(arguments_.project_id));
    }));

    server.registerTool("testmanager.testcase.search", {
      description: "Search project test cases by module, tag, priority, status, or free text.",
      inputSchema: {
        module_id: z.string().uuid().optional().describe("Exact module UUID"),
        module: z.string().min(1).optional().describe("Case-insensitive exact module name or code"),
        tag: z.string().min(1).optional().describe("Case-insensitive exact tag name"),
        priority: z.enum(["low", "medium", "high", "critical"]).optional(),
        status: z.enum(["active", "archived"]).optional(),
        query: z.string().min(1).optional().describe("Free text matched against case code, title, objective, preconditions, steps, and expected result"),
        ...paginationSchema,
      },
      annotations: { readOnlyHint: true, idempotentHint: true },
    }, async (arguments_) => withErrorHandling(async () => {
      session.assertToolArguments(arguments_);
      const rows = await service.searchTestCases({
        moduleId: arguments_.module_id,
        module: arguments_.module,
        tag: arguments_.tag,
        priority: arguments_.priority,
        status: arguments_.status,
        text: arguments_.query,
        cursor: arguments_.cursor,
        limit: arguments_.limit,
      });
      return paginatedResponse(rows, arguments_, encodeTestCaseCursor);
    }));

    server.registerTool("testmanager.testcase.get", {
      description: "Get full test-case detail including simple and structured steps, expected results, and version history.",
      inputSchema: {
        testcase_id: z.string().uuid().describe("Test case UUID returned by testcase.search"),
      },
      annotations: { readOnlyHint: true, idempotentHint: true },
    }, async (arguments_) => withErrorHandling(async () => {
      session.assertToolArguments(arguments_);
      return successResponse(await service.getTestCase(arguments_.testcase_id));
    }));

    server.registerTool("testmanager.testplan.list", {
      description: "List test plans in the scoped project.", inputSchema: paginationSchema,
      annotations: { readOnlyHint: true, idempotentHint: true },
    }, async (arguments_) => withErrorHandling(async () => {
      session.assertToolArguments(arguments_); const rows = await service.listTestPlans(arguments_);
      return paginatedResponse(rows, arguments_, encodeCodeCursor);
    }));
    server.registerTool("testmanager.testplan.get", {
      description: "Get a test plan and all test cases in its ordered scope.",
      inputSchema: { testplan_id: z.string().uuid() }, annotations: { readOnlyHint: true, idempotentHint: true },
    }, async (arguments_) => withErrorHandling(async () => {
      session.assertToolArguments(arguments_); return successResponse(await service.getTestPlan(arguments_.testplan_id));
    }));
    server.registerTool("testmanager.testrun.list", {
      description: "List test runs with result summaries computed on demand.",
      inputSchema: { testplan_id: z.string().uuid().optional(), status: z.enum(["in_progress", "completed"]).optional(), ...paginationSchema },
      annotations: { readOnlyHint: true, idempotentHint: true },
    }, async (arguments_) => withErrorHandling(async () => {
      session.assertToolArguments(arguments_); const rows = await service.listTestRuns({ testPlanId: arguments_.testplan_id, status: arguments_.status, cursor: arguments_.cursor, limit: arguments_.limit });
      return paginatedResponse(rows, arguments_, encodeCodeCursor);
    }));
    server.registerTool("testmanager.testrun.get", {
      description: "Get a test run with a result summary computed on demand.",
      inputSchema: { testrun_id: z.string().uuid() }, annotations: { readOnlyHint: true, idempotentHint: true },
    }, async (arguments_) => withErrorHandling(async () => {
      session.assertToolArguments(arguments_); return successResponse(await service.getTestRun(arguments_.testrun_id));
    }));
    server.registerTool("testmanager.testresult.list", {
      description: "List test results filtered by status, tester, or run.",
      inputSchema: { status: z.enum(["pass", "fail", "skip", "blocked", "not_run"]).optional(), tester_id: z.string().uuid().optional(), testrun_id: z.string().uuid().optional(), ...paginationSchema },
      annotations: { readOnlyHint: true, idempotentHint: true },
    }, async (arguments_) => withErrorHandling(async () => {
      session.assertToolArguments(arguments_); const rows = await service.listTestResults({ status: arguments_.status, testerId: arguments_.tester_id, testRunId: arguments_.testrun_id, cursor: arguments_.cursor, limit: arguments_.limit });
      return paginatedResponse(rows, arguments_, encodeTestResultCursor);
    }));
    server.registerTool("testmanager.issue.search", {
      description: "Search issues by status, priority, assignee, run, case, or free text.",
      inputSchema: { status: z.enum(["backlog", "open", "in_progress", "resolved", "verified", "closed", "rejected", "duplicate"]).optional(),
        priority: z.enum(["low", "medium", "high", "critical"]).optional(), assignee_id: z.string().uuid().optional(),
        testrun_id: z.string().uuid().optional(), testcase_id: z.string().uuid().optional(), query: z.string().min(1).optional(), ...paginationSchema },
      annotations: { readOnlyHint: true, idempotentHint: true },
    }, async (arguments_) => withErrorHandling(async () => { session.assertToolArguments(arguments_);
      const rows = await service.searchIssues({ status: arguments_.status, priority: arguments_.priority, assigneeId: arguments_.assignee_id,
        testRunId: arguments_.testrun_id, testCaseId: arguments_.testcase_id, text: arguments_.query, cursor: arguments_.cursor, limit: arguments_.limit });
      return paginatedResponse(rows, arguments_, encodeCodeCursor); }));
    server.registerTool("testmanager.issue.get", { description: "Get issue detail and its related test result, run, and case.",
      inputSchema: { issue_id: z.string().uuid() }, annotations: { readOnlyHint: true, idempotentHint: true },
    }, async (arguments_) => withErrorHandling(async () => { session.assertToolArguments(arguments_); return successResponse(await service.getIssue(arguments_.issue_id)); }));
    server.registerTool("testmanager.requirement.list", { description: "List requirements, including requirements with no linked test case.",
      inputSchema: { status: z.enum(["draft", "approved", "deprecated"]).optional(), priority: z.enum(["low", "medium", "high", "critical"]).optional(),
        covered: z.boolean().optional().describe("Filter by direct test-case coverage"), ...paginationSchema }, annotations: { readOnlyHint: true, idempotentHint: true },
    }, async (arguments_) => withErrorHandling(async () => { session.assertToolArguments(arguments_);
      const rows = await service.listRequirements({ status: arguments_.status, priority: arguments_.priority, covered: arguments_.covered, cursor: arguments_.cursor, limit: arguments_.limit });
      return paginatedResponse(rows, arguments_, encodeRequirementCursor); }));
    server.registerTool("testmanager.requirement.get", { description: "Get a requirement and all of its traceability links.",
      inputSchema: { requirement_id: z.string().uuid() }, annotations: { readOnlyHint: true, idempotentHint: true },
    }, async (arguments_) => withErrorHandling(async () => { session.assertToolArguments(arguments_); return successResponse(await service.getRequirement(arguments_.requirement_id)); }));
    server.registerTool("testmanager.requirement.coverage", { description: "Get direct test-case coverage totals, including uncovered requirements.", inputSchema: {},
      annotations: { readOnlyHint: true, idempotentHint: true },
    }, async (arguments_) => withErrorHandling(async () => { session.assertToolArguments(arguments_); return successResponse(await service.getRequirementCoverage()); }));
    server.registerTool("testmanager.artifact.get_url", { description: "Create a short-lived signed download URL for a project-scoped automation artifact.",
      inputSchema: { bucket: z.literal("automation-artifacts").optional(), path: z.string().min(1), expires_in: z.number().int().min(30).max(3600).optional() },
      annotations: { readOnlyHint: true, idempotentHint: false },
    }, async (arguments_) => withErrorHandling(async () => { session.assertToolArguments(arguments_);
      return successResponse(await service.getArtifactUrl({ bucket: arguments_.bucket, path: arguments_.path, expiresIn: arguments_.expires_in })); }));
  };
