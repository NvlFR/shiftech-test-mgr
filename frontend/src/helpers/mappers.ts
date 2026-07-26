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
  Environment,
  Requirement,
  RequirementLink,
  Comment,
  CommentMention,
  DashboardReportRun,
  ApiToken,
  Webhook,
  WebhookDelivery,
  CicdPipeline,
  AutomationRunner,
  AutomationScript,
  AutomationJob,
} from '../types/domain';
import type { Attachment } from '../types/domain';

export function mapApiTokenRow(row: any): ApiToken { return { id: row.id, projectId: row.project_id, name: row.name, tokenPrefix: row.token_prefix, scopes: row.scopes ?? [], revokedAt: row.revoked_at ?? null, createdAt: row.created_at, updatedAt: row.updated_at }; }
export function mapWebhookRow(row: any): Webhook { return { id: row.id, projectId: row.project_id, name: row.name, url: row.url, events: row.events ?? [], isActive: row.is_active, maxRetries: row.max_retries, createdAt: row.created_at, updatedAt: row.updated_at }; }
export function mapWebhookDeliveryRow(row: any): WebhookDelivery { return { id: row.id, webhookId: row.webhook_id, projectId: row.project_id, event: row.event, resourceId: row.resource_id, status: row.status, attemptCount: row.attempt_count, nextAttemptAt: row.next_attempt_at, responseStatus: row.response_status ?? null, deliveredAt: row.delivered_at ?? null, lastError: row.last_error ?? null, createdAt: row.created_at }; }
export function mapCicdPipelineRow(row: any): CicdPipeline { return { id: row.id, projectId: row.project_id, testPlanId: row.test_plan_id, name: row.name, provider: row.provider, tokenPrefix: row.token_prefix, active: row.active, lastUsedAt: row.last_used_at ?? null, createdBy: row.created_by, createdAt: row.created_at, updatedAt: row.updated_at }; }
export function mapAutomationRunnerRow(row: any): AutomationRunner { return { id: row.id, projectId: row.project_id, name: row.name, labels: row.labels ?? [], tokenPrefix: row.token_prefix, active: row.active, lastSeenAt: row.last_seen_at ?? null, createdBy: row.created_by, createdAt: row.created_at, updatedAt: row.updated_at }; }
export function mapAutomationScriptRow(row: any): AutomationScript { return { id: row.id, projectId: row.project_id, testCaseId: row.test_case_id, scriptRef: row.script_ref, runnerLabels: row.runner_labels ?? [], createdBy: row.created_by, createdAt: row.created_at, updatedAt: row.updated_at }; }
export function mapAutomationJobRow(row: any): AutomationJob { return { id: row.id, projectId: row.project_id, testRunId: row.test_run_id, testCaseId: row.test_case_id, scriptRef: row.script_ref, requiredLabels: row.required_labels ?? [], status: row.status, attempt: row.attempt, maxAttempts: row.max_attempts, runnerId: row.runner_id ?? null, artifacts: row.artifacts ?? [], errorMessage: row.error_message ?? null, queuedAt: row.queued_at, startedAt: row.started_at ?? null, finishedAt: row.finished_at ?? null, createdBy: row.created_by, createdAt: row.created_at, updatedAt: row.updated_at }; }

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

export function mapEnvironmentRow(row: any): Environment {
  return {
    id: row.id,
    projectId: row.project_id,
    name: row.name,
    baseUrl: row.base_url ?? null,
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
    assignedTo: row.assigned_to ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapTestCaseVersionRow(row: any) {
  return { id: row.id, testCaseId: row.test_case_id, version: row.version, steps: row.steps, expectedResult: row.expected_result, changedBy: row.changed_by, createdAt: row.created_at };
}

export function mapNotificationRow(row: any) {
  return { id: row.id, recipientId: row.recipient_id, issueId: row.issue_id, kind: row.kind, message: row.message, readAt: row.read_at, createdAt: row.created_at };
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
    environmentId: row.environment_id ?? null,
    browser: row.browser ?? null,
    device: row.device ?? null,
    buildVersion: row.build_version ?? null,
    release: row.release ?? null,
    pipelineId: row.pipeline_id ?? null,
    branch: row.branch ?? null,
    commitSha: row.commit_sha ?? null,
    buildNumber: row.build_number ?? null,
    ciProvider: row.ci_provider ?? null,
    externalRunId: row.external_run_id ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapTestRunAssignmentRow(row: any) {
  return { id: row.id, testRunId: row.test_run_id, testCaseId: row.test_case_id, testerId: row.tester_id, createdAt: row.created_at, updatedAt: row.updated_at };
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

export function mapRequirementRow(row: any): Requirement {
  return { id: row.id, projectId: row.project_id, key: row.key, title: row.title, description: row.description, status: row.status, priority: row.priority, createdBy: row.created_by ?? null, createdAt: row.created_at, updatedAt: row.updated_at };
}

export function mapRequirementLinkRow(row: any): RequirementLink {
  return { id: row.id, requirementId: row.requirement_id, type: row.type, targetId: row.target_id, targetLabel: row.target_label, createdBy: row.created_by ?? null, createdAt: row.created_at };
}

export function mapCommentMentionRow(row: any): CommentMention {
  return { commentId: row.comment_id, mentionedUserId: row.mentioned_user_id, profile: mapProfileRow(row.profile) };
}

export function mapCommentRow(row: any): Comment {
  return {
    id: row.id,
    projectId: row.project_id,
    targetType: row.target_type,
    targetId: row.target_id,
    authorId: row.author_id,
    author: row.author ? mapProfileRow(row.author) : null,
    body: row.body,
    mentions: (row.comment_mentions ?? []).map(mapCommentMentionRow),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapAttachmentRow(row: any, url: string | null = null): Attachment {
  return {
    id: row.id,
    entityKind: row.entity_kind,
    testCaseId: row.test_case_id ?? null,
    testRunId: row.test_run_id ?? null,
    fileName: row.file_name,
    storagePath: row.storage_path,
    mimeType: row.mime_type,
    sizeBytes: Number(row.size_bytes),
    uploadedBy: row.uploaded_by,
    createdAt: row.created_at,
    url,
  };
}

export function mapDashboardReportRunRow(row: any): DashboardReportRun {
  const plan = row.test_plan ?? {};
  const project = plan.project ?? {};
  const environment = row.environment ?? null;
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    projectId: plan.project_id,
    projectName: project.name ?? '',
    testPlanName: plan.name ?? '',
    environmentName: environment?.name ?? null,
    release: row.release ?? null,
    status: row.status,
    startedAt: row.started_at,
    completedAt: row.completed_at ?? null,
    total: 0,
    executed: 0,
    pass: 0,
    fail: 0,
    skip: 0,
    blocked: 0,
    notRun: 0,
    passRate: 0,
    failRate: 0,
    progressPercent: 0,
  };
}

export function mapRetentionPolicyRow(row: any) { return { id: row.id, projectId: row.project_id ?? null, retentionDays: Number(row.retention_days), attachmentRetentionDays: row.attachment_retention_days == null ? null : Number(row.attachment_retention_days), enabled: Boolean(row.enabled), createdBy: row.created_by ?? null, createdAt: row.created_at, updatedAt: row.updated_at }; }
export function mapRetentionCleanupPreviewRow(row: any) { return { projectId: row.project_id ?? null, attachmentCutoff: row.attachment_cutoff, testAttachmentCount: Number(row.test_attachment_count ?? 0), issueAttachmentCount: Number(row.issue_attachment_count ?? 0) }; }
export function mapRetentionCleanupResultRow(row: any) { return { cutoff: row.cutoff, testAttachments: Number(row.test_attachments ?? 0), issueAttachments: Number(row.issue_attachments ?? 0) }; }
export function mapRestorePreviewRow(row: any) { return { valid: Boolean(row.valid), projectName: row.project_name ?? '', modules: Number(row.modules ?? 0), tags: Number(row.tags ?? 0), testCases: Number(row.test_cases ?? 0), testPlans: Number(row.test_plans ?? 0), testRuns: Number(row.test_runs ?? 0), testResults: Number(row.test_results ?? 0), issues: Number(row.issues ?? 0), attachments: Number(row.attachments ?? 0) }; }
export function mapRestoreResultRow(row: any) { return { projectId: row.project_id, inserted: Number(row.inserted ?? 0), skipped: Number(row.skipped ?? 0) }; }
