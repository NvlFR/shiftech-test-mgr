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
