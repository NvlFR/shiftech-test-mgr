export type UserRole = 'pending' | 'user' | 'admin';

export interface Profile {
  id: string;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export type ProjectStatus = 'active' | 'inactive' | 'archived';
export type ProjectSortField = 'name' | 'createdAt' | 'updatedAt';
export type SortDirection = 'asc' | 'desc';

export interface Project {
  id: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  createdAt: string;
  updatedAt: string;
}

export type ProjectMemberRole = 'manager' | 'supervisor' | 'tester' | 'member';

export interface ProjectMember {
  id: string;
  projectId: string;
  userId: string;
  role: ProjectMemberRole;
  createdAt: string;
}

export interface ProjectMemberWithProfile extends ProjectMember {
  profile: Profile;
}

export interface Module {
  id: string;
  projectId: string;
  code: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface Tag {
  id: string;
  projectId: string;
  name: string;
  createdAt: string;
}

export type TestPlanStatus = 'draft' | 'active' | 'completed' | 'archived';

export interface TestPlan {
  id: string;
  projectId: string;
  code: string;
  name: string;
  description: string | null;
  status: TestPlanStatus;
  createdAt: string;
  updatedAt: string;
}

// Test Case is a reusable template — it never stores a pass/fail result itself.
// Results live on TestResult, one row per (TestRun x TestCase).
export type TestCasePriority = 'low' | 'medium' | 'high' | 'critical';
export type TestCaseStatus = 'active' | 'archived';

export interface TestCase {
  id: string;
  projectId: string;
  moduleId: string | null;
  code: string;
  title: string;
  objective: string | null;
  preconditions: string | null;
  steps: string;
  expectedResult: string;
  priority: TestCasePriority;
  status: TestCaseStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TestCaseWithDetails extends TestCase {
  module: Module | null;
  tags: Tag[];
}

// Junction: which test cases are in scope for a plan. No result columns here —
// see TestRun/TestResult for execution history.
export interface TestPlanCase {
  id: string;
  testPlanId: string;
  testCaseId: string;
  order: number;
}

export interface TestPlanCaseWithDetails extends TestPlanCase {
  testCase: TestCaseWithDetails;
}

export type TestRunStatus = 'in_progress' | 'completed';

export interface TestRun {
  id: string;
  testPlanId: string;
  code: string;
  name: string;
  status: TestRunStatus;
  startedAt: string;
  completedAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export type TestResultStatus = 'pass' | 'fail' | 'skip' | 'blocked' | 'not_run';

export interface TestResult {
  id: string;
  testRunId: string;
  testCaseId: string;
  testerId: string | null;
  status: TestResultStatus;
  executedAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TestResultWithDetails extends TestResult {
  testCase: TestCase;
  tester: Profile | null;
}

export type IssuePriority = 'low' | 'medium' | 'high' | 'critical';
export type IssueStatus = 'open' | 'in_progress' | 'resolved' | 'verified' | 'closed';

export interface Issue {
  id: string;
  code: string;
  testResultId: string;
  title: string;
  description: string | null;
  actualResult: string | null;
  expectedResult: string | null;
  priority: IssuePriority;
  status: IssueStatus;
  assignedTo: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface IssueWithDetails extends Issue {
  assignee: Profile | null;
  testCase:
    | {
        id: string;
        code: string;
        title: string;
        priority: TestCasePriority;
        module: Module | null;
        tags: Tag[];
      }
    | null;
  testRun: { id: string; code: string; name: string } | null;
}
