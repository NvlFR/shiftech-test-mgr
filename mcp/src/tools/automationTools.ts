import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as z from "zod/v4";
import { successResponse, withErrorHandling } from "../helpers/response.js";
import type { ProjectSession } from "../services/authService.js";
import type { AutomationService } from "../services/automationService.js";

const readAnnotations = { destructiveHint: false, readOnlyHint: true, idempotentHint: true } as const;
const writeAnnotations = { destructiveHint: false, readOnlyHint: false, idempotentHint: false } as const;
const labels = z.array(z.string().min(1).max(80)).max(20).optional();

export const createAutomationReadToolRegistrar = (session: ProjectSession, service: AutomationService) => (server: McpServer): void => {
  const run = (args: unknown, action: () => Promise<unknown>) => withErrorHandling(async () => { session.assertToolArguments(args); return successResponse(await action()); });
  server.registerTool("testmanager.automation.job_status", { description: "Get the current queued/running/passed/failed automation job status.", inputSchema: { job_id: z.string().uuid() }, annotations: readAnnotations }, async (a) => run(a, () => service.jobStatus(a.job_id)));
  server.registerTool("testmanager.automation.runner_list", { description: "List project runners, labels/capabilities, and computed online/offline state.", inputSchema: {}, annotations: readAnnotations }, async (a) => run(a, () => service.runnerList()));
};

export const createAutomationWriteToolRegistrar = (session: ProjectSession, service: AutomationService) => (server: McpServer): void => {
  const run = (args: unknown, action: () => Promise<unknown>) => withErrorHandling(async () => { session.assertToolArguments(args); return successResponse(await action()); });
  server.registerTool("testmanager.automation.map_script", { description: "Create or replace a Test Case to local script reference mapping and runner labels.", inputSchema: { testcase_id: z.string().uuid(), script_ref: z.string().min(1).max(500), runner_labels: labels }, annotations: writeAnnotations }, async (a) => run(a, () => service.mapScript(a.testcase_id, a.script_ref, a.runner_labels ?? [])));
  server.registerTool("testmanager.automation.enqueue", { description: "Create a new automation run and enqueue jobs for exactly one Test Case or Test Plan, routed by runner labels.", inputSchema: { testcase_id: z.string().uuid().optional(), testplan_id: z.string().uuid().optional(), name: z.string().min(1).max(200).optional(), runner_labels: labels, max_attempts: z.number().int().min(1).max(10).optional() }, annotations: writeAnnotations }, async (a) => run(a, () => service.enqueue({ testCaseId: a.testcase_id, testPlanId: a.testplan_id, name: a.name, runnerLabels: a.runner_labels ?? [], maxAttempts: a.max_attempts ?? 1 })));
  server.registerTool("testmanager.automation.rerun_failed", { description: "Create a selective regression run for a resolved Issue. Combines the directly linked failed case, shared module/tags, shared requirements, and automation scripts affected by the fix commit diff. Above the configured safety limit it returns a confirmation error; retry only after a human project member confirms.", inputSchema: { issue_id: z.string().uuid(), name: z.string().min(1).max(200).optional(), runner_labels: labels, max_attempts: z.number().int().min(1).max(10).optional(), confirmed_by: z.string().uuid().optional(), explicit_confirmation: z.boolean().optional() }, annotations: writeAnnotations }, async (a) => run(a, () => service.rerunFailed({ issueId: a.issue_id, name: a.name, runnerLabels: a.runner_labels ?? [], maxAttempts: a.max_attempts ?? 1, confirmedBy: a.confirmed_by, explicitConfirmation: a.explicit_confirmation ?? false })));
  server.registerTool("testmanager.automation.verify_regression", { description: "Verify a resolved Issue against its completed regression Test Run. PASS marks it verified and links the proving run; FAIL reopens it and appends a comparison comment with the old and new failure evidence.", inputSchema: { issue_id: z.string().uuid(), test_run_id: z.string().uuid() }, annotations: writeAnnotations }, async (a) => run(a, () => service.verifyRegression({ issueId: a.issue_id, testRunId: a.test_run_id })));
};
