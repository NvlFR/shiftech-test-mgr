import type { IssueDetail, IssueSummary, Project, RequirementCoverage, RequirementDetail, RequirementSummary, TestCaseDetail, TestCaseSummary, TestPlanDetail, TestPlanSummary, TestResultSummary, TestRunDetail, TestRunSummary, TestRunSummaryCounts } from "../types/domain.js";

type JsonRecord = Record<string, unknown>;

const record = (value: unknown): JsonRecord => value && typeof value === "object" ? value as JsonRecord : {};
const stringValue = (value: unknown): string => typeof value === "string" ? value : "";
const nullableString = (value: unknown): string | null => typeof value === "string" ? value : null;
const numberValue = (value: unknown): number => Number(value) || 0;

export const mapProjectRow = (value: unknown): Project => {
  const row = record(value);
  return {
    id: stringValue(row.id),
    name: stringValue(row.name),
    description: nullableString(row.description),
    status: stringValue(row.status),
    createdAt: stringValue(row.created_at),
    updatedAt: stringValue(row.updated_at),
  };
};

export const mapTestCaseSummaryRow = (value: unknown): TestCaseSummary => {
  const row = record(value);
  const module = record(row.module);
  return {
    id: stringValue(row.id),
    projectId: stringValue(row.project_id),
    module: row.module ? {
      id: stringValue(module.id),
      code: nullableString(module.code),
      name: stringValue(module.name),
    } : null,
    tags: Array.isArray(row.tags) ? row.tags.map((item) => {
      const tag = record(item);
      return { id: stringValue(tag.id), name: stringValue(tag.name) };
    }) : [],
    code: stringValue(row.code),
    title: stringValue(row.title),
    priority: row.priority as TestCaseSummary["priority"],
    status: row.status as TestCaseSummary["status"],
    updatedAt: stringValue(row.updated_at),
  };
};

export const mapTestCaseDetailRow = (value: unknown): TestCaseDetail => {
  const row = record(value);
  return {
    ...mapTestCaseSummaryRow(row),
    objective: nullableString(row.objective),
    preconditions: nullableString(row.preconditions),
    steps: stringValue(row.steps),
    expectedResult: stringValue(row.expected_result),
    detailedSteps: Array.isArray(row.detailed_steps) ? row.detailed_steps.map((item) => {
      const step = record(item);
      return {
        id: stringValue(step.id),
        stepNumber: Number(step.step_number),
        action: stringValue(step.action),
        expectedResult: nullableString(step.expected_result),
      };
    }) : [],
    versions: Array.isArray(row.versions) ? row.versions.map((item) => {
      const version = record(item);
      return {
        id: stringValue(version.id),
        version: Number(version.version),
        steps: stringValue(version.steps),
        expectedResult: stringValue(version.expected_result),
        changedBy: nullableString(version.changed_by),
        createdAt: stringValue(version.created_at),
      };
    }) : [],
    notes: nullableString(row.notes),
    createdAt: stringValue(row.created_at),
  };
};

export const mapTestPlanSummaryRow = (value: unknown): TestPlanSummary => {
  const row = record(value);
  return { id: stringValue(row.id), projectId: stringValue(row.project_id), code: stringValue(row.code),
    name: stringValue(row.name), description: nullableString(row.description), status: row.status as TestPlanSummary["status"],
    testCaseCount: numberValue(row.test_case_count), createdAt: stringValue(row.created_at), updatedAt: stringValue(row.updated_at) };
};

export const mapTestPlanDetailRow = (value: unknown): TestPlanDetail => {
  const row = record(value);
  return { ...mapTestPlanSummaryRow(row), testCases: Array.isArray(row.test_cases) ? row.test_cases.map((item) => {
    const planCase = record(item);
    return { order: numberValue(planCase.order), testCase: mapTestCaseDetailRow(planCase.test_case) };
  }) : [] };
};

const mapRunCounts = (value: unknown): TestRunSummaryCounts => {
  const summary = record(value);
  return { total: numberValue(summary.total), executed: numberValue(summary.executed), progressPercent: numberValue(summary.progress_percent),
    pass: numberValue(summary.pass), fail: numberValue(summary.fail), skip: numberValue(summary.skip),
    blocked: numberValue(summary.blocked), notRun: numberValue(summary.not_run) };
};

export const mapTestRunSummaryRow = (value: unknown): TestRunSummary => {
  const row = record(value);
  return { id: stringValue(row.id), projectId: stringValue(row.project_id), testPlanId: nullableString(row.test_plan_id),
    code: stringValue(row.code), name: stringValue(row.name), status: row.status as TestRunSummary["status"],
    startedAt: stringValue(row.started_at), completedAt: nullableString(row.completed_at), summary: mapRunCounts(row.summary) };
};

export const mapTestRunDetailRow = (value: unknown): TestRunDetail => {
  const row = record(value);
  return { ...mapTestRunSummaryRow(row), isCustom: row.is_custom === true, notes: nullableString(row.notes),
    createdAt: stringValue(row.created_at), updatedAt: stringValue(row.updated_at) };
};

export const mapTestResultSummaryRow = (value: unknown): TestResultSummary => {
  const row = record(value); const testCase = record(row.test_case); const tester = record(row.tester);
  return { id: stringValue(row.id), projectId: stringValue(row.project_id), testRunId: stringValue(row.test_run_id),
    testCaseId: stringValue(row.test_case_id), testCase: { code: nullableString(testCase.code), title: nullableString(testCase.title) },
    tester: row.tester ? { id: stringValue(tester.id), email: stringValue(tester.email), fullName: nullableString(tester.full_name) } : null,
    status: row.status as TestResultSummary["status"], executedAt: nullableString(row.executed_at), notes: nullableString(row.notes),
    createdAt: stringValue(row.created_at), updatedAt: stringValue(row.updated_at) };
};

export const mapIssueSummaryRow = (value: unknown): IssueSummary => {
  const row = record(value); const assignee = record(row.assigned_to); const run = record(row.test_run); const testCase = record(row.test_case);
  return { id: stringValue(row.id), projectId: stringValue(row.project_id), code: stringValue(row.code), title: stringValue(row.title),
    priority: row.priority as IssueSummary["priority"], status: row.status as IssueSummary["status"],
    assignee: row.assigned_to ? { id: stringValue(assignee.id), email: stringValue(assignee.email), fullName: nullableString(assignee.full_name) } : null,
    testResultId: stringValue(row.test_result_id), testRun: { id: stringValue(run.id), code: stringValue(run.code), name: stringValue(run.name) },
    testCase: { id: stringValue(testCase.id), code: stringValue(testCase.code), title: stringValue(testCase.title) },
    createdAt: stringValue(row.created_at), updatedAt: stringValue(row.updated_at) };
};
export const mapIssueDetailRow = (value: unknown): IssueDetail => { const row = record(value); return { ...mapIssueSummaryRow(row),
  description: nullableString(row.description), actualResult: nullableString(row.actual_result), expectedResult: nullableString(row.expected_result) }; };

export const mapRequirementSummaryRow = (value: unknown): RequirementSummary => { const row = record(value); return {
  id: stringValue(row.id), projectId: stringValue(row.project_id), key: stringValue(row.key), title: stringValue(row.title),
  description: nullableString(row.description), status: row.status as RequirementSummary["status"], priority: row.priority as RequirementSummary["priority"],
  testCaseCount: numberValue(row.test_case_count), covered: row.covered === true, createdAt: stringValue(row.created_at), updatedAt: stringValue(row.updated_at) }; };
export const mapRequirementDetailRow = (value: unknown): RequirementDetail => { const row = record(value); return { ...mapRequirementSummaryRow(row),
  links: Array.isArray(row.links) ? row.links.map((item) => { const link = record(item); return { id: stringValue(link.id), type: link.type as RequirementDetail["links"][number]["type"], targetId: stringValue(link.target_id) }; }) : [] }; };
export const mapRequirementCoverageRow = (value: unknown): RequirementCoverage => { const row = record(value); return {
  total: numberValue(row.total), covered: numberValue(row.covered), uncovered: numberValue(row.uncovered), percentage: numberValue(row.percentage) }; };
