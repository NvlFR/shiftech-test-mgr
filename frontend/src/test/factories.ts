import type {
  Issue,
  Module,
  Profile,
  Project,
  Tag,
  TestCase,
  TestPlan,
  TestResult,
  TestRun,
} from '../types/domain';

const CREATED_AT = '2026-01-01T00:00:00.000Z';
const UPDATED_AT = '2026-01-02T00:00:00.000Z';

export function makeProfile(overrides: Partial<Profile> = {}): Profile {
  return {
    id: 'profile-1',
    email: 'tester@example.com',
    fullName: 'Test User',
    avatarUrl: null,
    role: 'user',
    createdAt: CREATED_AT,
    updatedAt: UPDATED_AT,
    deletedAt: null,
    ...overrides,
  };
}

export function makeProject(overrides: Partial<Project> = {}): Project {
  return {
    id: 'project-1',
    name: 'Test Project',
    description: 'Project fixture',
    status: 'active',
    ownerId: 'profile-1',
    visibility: 'private',
    createdAt: CREATED_AT,
    updatedAt: UPDATED_AT,
    ...overrides,
  };
}

export function makeModule(overrides: Partial<Module> = {}): Module {
  return {
    id: 'module-1',
    projectId: 'project-1',
    code: 'MOD-0001',
    name: 'Authentication',
    createdAt: CREATED_AT,
    updatedAt: UPDATED_AT,
    ...overrides,
  };
}

export function makeTag(overrides: Partial<Tag> = {}): Tag {
  return {
    id: 'tag-1',
    projectId: 'project-1',
    name: 'regression',
    createdAt: CREATED_AT,
    ...overrides,
  };
}

export function makeTestCase(overrides: Partial<TestCase> = {}): TestCase {
  return {
    id: 'test-case-1',
    projectId: 'project-1',
    moduleId: 'module-1',
    code: 'TC-0001',
    title: 'User can sign in',
    objective: 'Verify authentication',
    preconditions: 'An active user exists',
    steps: 'Submit valid credentials',
    expectedResult: 'The dashboard is displayed',
    stepType: 'simple',
    priority: 'high',
    status: 'active',
    source: 'manual',
    aiBatchId: null,
    reviewDecision: null,
    reviewedBy: null,
    reviewedAt: null,
    notes: null,
    assignedTo: null,
    targetRoleId: null,
    createdBy: 'profile-1',
    externalLinks: [],
    createdAt: CREATED_AT,
    updatedAt: UPDATED_AT,
    ...overrides,
  };
}

export function makeTestPlan(overrides: Partial<TestPlan> = {}): TestPlan {
  return {
    id: 'test-plan-1',
    projectId: 'project-1',
    code: 'TP-0001',
    name: 'Release regression',
    description: 'Regression plan fixture',
    status: 'draft',
    createdBy: 'profile-1',
    approvedBy: null,
    approvedAt: null,
    createdAt: CREATED_AT,
    updatedAt: UPDATED_AT,
    ...overrides,
  };
}

export function makeTestRun(overrides: Partial<TestRun> = {}): TestRun {
  return {
    id: 'test-run-1',
    testPlanId: 'test-plan-1',
    projectId: 'project-1',
    isCustom: false,
    code: 'TR-0001',
    name: 'Release regression run',
    status: 'in_progress',
    startedBy: 'profile-1',
    startedAt: CREATED_AT,
    completedAt: null,
    notes: null,
    environmentId: null,
    browser: null,
    device: null,
    buildVersion: null,
    release: null,
    repositoryId: null,
    pipelineId: null,
    branch: null,
    commitSha: null,
    buildNumber: null,
    ciProvider: null,
    externalRunId: null,
    createdAt: CREATED_AT,
    updatedAt: UPDATED_AT,
    ...overrides,
  };
}

export function makeTestResult(overrides: Partial<TestResult> = {}): TestResult {
  return {
    id: 'test-result-1',
    testRunId: 'test-run-1',
    testCaseId: 'test-case-1',
    testCaseSnapshot: null,
    testerId: null,
    status: 'not_run',
    executedAt: null,
    notes: null,
    automationArtifacts: [],
    createdAt: CREATED_AT,
    updatedAt: UPDATED_AT,
    ...overrides,
  };
}

export function makeIssue(overrides: Partial<Issue> = {}): Issue {
  return {
    id: 'issue-1',
    code: 'ISS-0001',
    testResultId: 'test-result-1',
    title: 'Login fails',
    description: 'Issue fixture',
    actualResult: 'An error is displayed',
    expectedResult: 'The dashboard is displayed',
    priority: 'high',
    status: 'open',
    type: 'bug',
    createdBy: 'profile-1',
    targetRoleId: null,
    externalLinks: [],
    assignedTo: null,
    createdAt: CREATED_AT,
    updatedAt: UPDATED_AT,
    ...overrides,
  };
}
