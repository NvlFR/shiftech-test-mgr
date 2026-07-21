import type {
  TestPlan,
  TestCase,
  TestPlanCase,
  Project,
  Profile,
  Module,
  Tag,
  TestRun,
  TestResult,
  Issue,
  ProjectMember,
  ProjectMemberWithProfile,
} from '../types/domain';

// Supabase columns are snake_case; domain types are camelCase.
// Repositories map raw rows through these functions before returning to services.

export function mapProjectRow(row: any): Project {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapProjectMemberRow(row: any): ProjectMember {
  return {
    id: row.id,
    projectId: row.project_id,
    userId: row.user_id,
    role: row.role,
    createdAt: row.created_at,
  };
}

export function mapProjectMemberWithProfileRow(row: any): ProjectMemberWithProfile {
  return {
    ...mapProjectMemberRow(row),
    profile: mapProfileRow(row.profile),
  };
}

export function mapModuleRow(row: any): Module {
  return {
    id: row.id,
    projectId: row.project_id,
    code: row.code,
    name: row.name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapTagRow(row: any): Tag {
  return {
    id: row.id,
    projectId: row.project_id,
    name: row.name,
    createdAt: row.created_at,
  };
}

export function mapTestPlanRow(row: any): TestPlan {
  return {
    id: row.id,
    projectId: row.project_id,
    code: row.code,
    name: row.name,
    description: row.description,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapTestCaseRow(row: any): TestCase {
  return {
    id: row.id,
    projectId: row.project_id,
    moduleId: row.module_id,
    code: row.code,
    title: row.title,
    objective: row.objective,
    preconditions: row.preconditions,
    steps: row.steps,
    expectedResult: row.expected_result,
    priority: row.priority,
    status: row.status,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapTestPlanCaseRow(row: any): TestPlanCase {
  return {
    id: row.id,
    testPlanId: row.test_plan_id,
    testCaseId: row.test_case_id,
    order: row.order,
  };
}

export function mapTestRunRow(row: any): TestRun {
  return {
    id: row.id,
    testPlanId: row.test_plan_id,
    code: row.code,
    name: row.name,
    status: row.status,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapTestResultRow(row: any): TestResult {
  return {
    id: row.id,
    testRunId: row.test_run_id,
    testCaseId: row.test_case_id,
    testerId: row.tester_id,
    status: row.status,
    executedAt: row.executed_at,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapIssueRow(row: any): Issue {
  return {
    id: row.id,
    code: row.code,
    testResultId: row.test_result_id,
    title: row.title,
    description: row.description,
    actualResult: row.actual_result,
    expectedResult: row.expected_result,
    priority: row.priority,
    status: row.status,
    assignedTo: row.assigned_to,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapProfileRow(row: any): Profile {
  return {
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    avatarUrl: row.avatar_url,
    role: row.role,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
}
