export type TestCasePriority = "low" | "medium" | "high" | "critical";
export type TestCaseStatus = "active" | "archived";

export interface Project {
  id: string;
  name: string;
  description: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface TestCaseSummary {
  id: string;
  projectId: string;
  module: { id: string; code: string | null; name: string } | null;
  tags: Array<{ id: string; name: string }>;
  code: string;
  title: string;
  priority: TestCasePriority;
  status: TestCaseStatus;
  updatedAt: string;
}

export interface TestCaseStep {
  id: string;
  stepNumber: number;
  action: string;
  expectedResult: string | null;
}

export interface TestCaseVersion {
  id: string;
  version: number;
  steps: string;
  expectedResult: string;
  changedBy: string | null;
  createdAt: string;
}

export interface TestCaseDetail extends TestCaseSummary {
  objective: string | null;
  preconditions: string | null;
  steps: string;
  expectedResult: string;
  detailedSteps: TestCaseStep[];
  versions: TestCaseVersion[];
  notes: string | null;
  createdAt: string;
}

export type TestPlanStatus = "draft" | "active" | "completed" | "archived";
export interface TestPlanSummary {
  id: string; projectId: string; code: string; name: string; description: string | null;
  status: TestPlanStatus; testCaseCount: number; createdAt: string; updatedAt: string;
}
export interface TestPlanCase { order: number; testCase: TestCaseDetail }
export interface TestPlanDetail extends TestPlanSummary { testCases: TestPlanCase[] }

export type TestRunStatus = "in_progress" | "completed";
export type TestResultStatus = "pass" | "fail" | "skip" | "blocked" | "not_run";
export interface TestRunSummaryCounts {
  total: number; executed: number; progressPercent: number; pass: number; fail: number;
  skip: number; blocked: number; notRun: number;
}
export interface TestRunSummary {
  id: string; projectId: string; testPlanId: string | null; code: string; name: string;
  status: TestRunStatus; startedAt: string; completedAt: string | null; summary: TestRunSummaryCounts;
}
export interface TestRunDetail extends TestRunSummary {
  isCustom: boolean; notes: string | null; createdAt: string; updatedAt: string;
}
export interface TestResultSummary {
  id: string; projectId: string; testRunId: string; testCaseId: string;
  testCase: { code: string | null; title: string | null };
  tester: { id: string; email: string; fullName: string | null } | null;
  status: TestResultStatus; executedAt: string | null; notes: string | null;
  createdAt: string; updatedAt: string;
}

export type IssuePriority = "low" | "medium" | "high" | "critical";
export type IssueStatus = "backlog" | "open" | "in_progress" | "resolved" | "verified" | "closed" | "rejected" | "duplicate";
export interface IssueSummary {
  id: string; projectId: string; code: string; title: string; priority: IssuePriority; status: IssueStatus;
  assignee: { id: string; email: string; fullName: string | null } | null; testResultId: string;
  testRun: { id: string; code: string; name: string }; testCase: { id: string; code: string; title: string };
  createdAt: string; updatedAt: string;
}
export interface IssueDetail extends IssueSummary { description: string | null; actualResult: string | null; expectedResult: string | null }

export type RequirementStatus = "draft" | "approved" | "deprecated";
export type RequirementPriority = "low" | "medium" | "high" | "critical";
export interface RequirementSummary {
  id: string; projectId: string; key: string; title: string; description: string | null; status: RequirementStatus;
  priority: RequirementPriority; testCaseCount: number; covered: boolean; createdAt: string; updatedAt: string;
}
export interface RequirementLink { id: string; type: "test_case" | "test_plan" | "test_result" | "issue"; targetId: string }
export interface RequirementDetail extends RequirementSummary { links: RequirementLink[] }
export interface RequirementCoverage { total: number; covered: number; uncovered: number; percentage: number }
export interface ArtifactUrl { bucket: string; path: string; url: string; expiresIn: number }

export interface AnalysisRunSummary {
  run: TestRunDetail;
  passRate: number;
  failureRate: number;
  problematicResults: Array<{
    testResultId: string; testCaseId: string; code: string | null; title: string | null;
    priority: TestCasePriority | null; status: TestResultStatus;
  }>;
}

export interface FlakyCandidate {
  testCaseId: string; code: string; title: string; priority: TestCasePriority;
  executions: number; passCount: number; failCount: number; transitions: number;
  flakinessScore: number; latestStatus: "pass" | "fail"; latestExecutedAt: string;
}

export interface RetestSuggestion {
  testCaseId: string; code: string; title: string; priority: TestCasePriority;
  latestStatus: TestResultStatus; score: number; reasons: string[];
  openIssueCount: number; flakinessScore: number;
}
