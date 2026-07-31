import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as z from "zod/v4";
import { successResponse, withErrorHandling } from "../helpers/response.js";
import type { WriteService } from "../services/writeService.js";
import type { ProjectSession } from "../services/authService.js";

const caseFields = { title: z.string().min(1), module_id: z.string().uuid().nullable().optional(), objective: z.string().nullable().optional(), preconditions: z.string().nullable().optional(), steps: z.string().min(1), expected_result: z.string().min(1), priority: z.enum(["low", "medium", "high", "critical"]).optional(), notes: z.string().nullable().optional() };
const mapCase = (v: Record<string, unknown>) => Object.fromEntries([
  ["title", v.title], ["moduleId", v.module_id], ["objective", v.objective], ["preconditions", v.preconditions],
  ["steps", v.steps], ["expectedResult", v.expected_result], ["priority", v.priority], ["notes", v.notes],
].filter((entry) => entry[1] !== undefined));
const annotations = { destructiveHint: false, readOnlyHint: false, idempotentHint: false } as const;

export const createWriteToolRegistrar = (session: ProjectSession, service: WriteService) => (server: McpServer): void => {
  const run = (args: unknown, action: () => Promise<unknown>) => withErrorHandling(async () => { session.assertToolArguments(args); return successResponse(await action()); });
  server.registerTool("testmanager.testcase.create_bulk", { description: "Create up to 100 review-only test-case drafts.", inputSchema: { cases: z.array(z.object(caseFields)).min(1).max(100) }, annotations }, async (a) => run(a, () => service.createTestCases(a.cases.map(mapCase))));
  server.registerTool("testmanager.testcase.update", { description: "Update a test case as a review-only draft change.", inputSchema: { testcase_id: z.string().uuid(), changes: z.object({ title: z.string().min(1).optional(), module_id: z.string().uuid().nullable().optional(), objective: z.string().nullable().optional(), preconditions: z.string().nullable().optional(), steps: z.string().min(1).optional(), expected_result: z.string().min(1).optional(), priority: z.enum(["low", "medium", "high", "critical"]).optional(), notes: z.string().nullable().optional() }) }, annotations }, async (a) => run(a, () => service.updateTestCase(a.testcase_id, mapCase(a.changes))));
  server.registerTool("testmanager.testcase.duplicate", { description: "Duplicate a test case for human review.", inputSchema: { testcase_id: z.string().uuid(), title: z.string().min(1).optional() }, annotations }, async (a) => run(a, () => service.duplicateTestCase(a.testcase_id, a.title)));
  server.registerTool("testmanager.testcase.archive", { description: "Archive a test case without deleting it.", inputSchema: { testcase_id: z.string().uuid() }, annotations }, async (a) => run(a, () => service.archiveTestCase(a.testcase_id)));
  server.registerTool("testmanager.testplan.create", { description: "Create a test plan in draft/review-only state.", inputSchema: { name: z.string().min(1), description: z.string().nullable().optional() }, annotations }, async (a) => run(a, () => service.createTestPlan(a)));
  server.registerTool("testmanager.testplan.add_cases", { description: "Add project test cases to a draft plan.", inputSchema: { testplan_id: z.string().uuid(), testcase_ids: z.array(z.string().uuid()).min(1).max(100) }, annotations }, async (a) => run(a, () => service.addTestPlanCases(a.testplan_id, a.testcase_ids)));
  server.registerTool("testmanager.testplan.remove_cases", { description: "Remove cases from a draft plan scope.", inputSchema: { testplan_id: z.string().uuid(), testcase_ids: z.array(z.string().uuid()).min(1).max(100) }, annotations }, async (a) => run(a, () => service.removeTestPlanCases(a.testplan_id, a.testcase_ids)));
  server.registerTool("testmanager.testplan.approve", {
    description: "Approve a draft test plan through an explicit human gate. The approver must be an active TestManager user with project access.",
    inputSchema: { testplan_id: z.string().uuid(), approver_id: z.string().uuid().describe("Profile ID of the human who explicitly approved the plan."), explicit_approval: z.literal(true).describe("Explicit confirmation that the named human approved this action.") },
    annotations,
  }, async (a) => run(a, () => service.approveTestPlan(a.testplan_id, a.approver_id, a.explicit_approval)));
  server.registerTool("testmanager.testrun.create", {
    description: "Create a new test run and seed a fresh not-run result for every case in the plan. This never overwrites an earlier run.",
    inputSchema: { testplan_id: z.string().uuid(), name: z.string().min(1), notes: z.string().nullable().optional() }, annotations,
  }, async (a) => run(a, () => service.createTestRun({ testPlanId: a.testplan_id, name: a.name, notes: a.notes })));
  server.registerTool("testmanager.testrun.record_result", {
    description: "Record one test result on an in-progress run using a registered tester profile.",
    inputSchema: { testresult_id: z.string().uuid(), tester_id: z.string().uuid(), status: z.enum(["pass", "fail", "skip", "blocked"]), notes: z.string().nullable().optional() }, annotations,
  }, async (a) => run(a, () => service.recordTestResult({ testResultId: a.testresult_id, testerId: a.tester_id, status: a.status, notes: a.notes })));
  server.registerTool("testmanager.testrun.complete", {
    description: "Explicitly complete an in-progress test run. Completion is never inferred from its results.",
    inputSchema: { testrun_id: z.string().uuid(), notes: z.string().nullable().optional() }, annotations,
  }, async (a) => run(a, () => service.completeTestRun(a.testrun_id, a.notes)));
  server.registerTool("testmanager.issue.create", {
    description: "Create a review-only issue linked to a required test result.",
    inputSchema: { test_result_id: z.string().uuid(), title: z.string().min(1), description: z.string().nullable().optional(), actual_result: z.string().nullable().optional(), expected_result: z.string().nullable().optional(), priority: z.enum(["low", "medium", "high", "critical"]).optional() }, annotations,
  }, async (a) => run(a, () => service.createIssue({ testResultId: a.test_result_id, title: a.title, description: a.description, actualResult: a.actual_result, expectedResult: a.expected_result, priority: a.priority })));
  server.registerTool("testmanager.issue.comment", {
    description: "Add a comment to a project-scoped issue as the API-token owner.", inputSchema: { issue_id: z.string().uuid(), body: z.string().min(1).max(5000) }, annotations,
  }, async (a) => run(a, () => service.commentIssue(a.issue_id, a.body)));
  server.registerTool("testmanager.issue.update_status", {
    description: "Update the workflow status of a project-scoped issue.", inputSchema: { issue_id: z.string().uuid(), status: z.enum(["backlog", "open", "in_progress", "resolved", "verified", "closed", "rejected", "duplicate"]) }, annotations,
  }, async (a) => run(a, () => service.updateIssueStatus(a.issue_id, a.status)));
  server.registerTool("testmanager.issue.detect_duplicate", {
    description: "Use the existing ai-gateway duplicate_issue_detection action. Output is review-only.",
    inputSchema: { draft: z.object({ title: z.string().min(1), description: z.string().optional(), actual_result: z.string().optional(), expected_result: z.string().optional(), priority: z.enum(["low", "medium", "high", "critical"]).optional() }) }, annotations,
  }, async (a) => run(a, () => service.detectDuplicate({ title: a.draft.title, description: a.draft.description, actualResult: a.draft.actual_result, expectedResult: a.draft.expected_result, priority: a.draft.priority })));
};
