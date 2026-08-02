export type UserRole = 'pending' | 'rejected' | 'user' | 'admin';

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
export type ProjectVisibility = 'private' | 'unlisted' | 'public';
export type ProjectSortField = 'name' | 'createdAt' | 'updatedAt';

export interface TestPlanSchedule {
  id: string; projectId: string; testPlanId: string; name: string;
  nextRunAt: string; intervalDays: number; environmentId: string | null;
  browser: AutomationBrowser; deviceProfile: string | null; maxAttempts: number;
  pauseOnFailure: boolean; active: boolean; lastEnqueuedAt: string | null;
  createdAt: string; updatedAt: string;
}
export type SortDirection = 'asc' | 'desc';

export interface Project {
  id: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  ownerId: string | null;
  visibility: ProjectVisibility;
  createdAt: string;
  updatedAt: string;
}

export type ProjectRepositorySourceType = 'local_path' | 'github_public' | 'github_private' | 'git_url';

export interface ProjectRepository {
  id: string;
  projectId: string;
  name: string;
  sourceType: ProjectRepositorySourceType;
  urlOrPath: string;
  defaultBranch: string | null;
  credentialId: string | null;
  credentialMask: string | null;
  credentialCreatedAt: string | null;
  credentialExpiresAt: string | null;
  subdirectory: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type TestSuiteVisibility = 'private' | 'unlisted' | 'public';

export interface TestSuite {
  id: string;
  ownerId: string;
  name: string;
  description: string | null;
  visibility: TestSuiteVisibility;
  createdAt: string;
  updatedAt: string;
}

export interface TestSuiteItem {
  id: string;
  suiteId: string;
  moduleName: string | null;
  title: string;
  objective: string | null;
  preconditions: string | null;
  steps: string;
  expectedResult: string;
  priority: TestCasePriority;
  stepType: TestCaseStepType;
  targetRole: string | null;
  tagNames: string[];
  orderIndex: number;
  createdAt: string;
  updatedAt: string;
}

export type TestCaseStepType = 'simple' | 'detailed';

export interface TestSuiteItemStep {
  id: string;
  suiteItemId: string;
  stepNumber: number;
  action: string;
  expectedResult: string | null;
}

export interface TestSuiteItemWithSteps extends TestSuiteItem {
  detailedSteps: TestSuiteItemStep[];
}

export type ProjectMemberRole = 'manager' | 'supervisor' | 'tester' | 'member';
export type ProjectPermission = 'view' | 'create' | 'update' | 'delete' | 'import' | 'export' | 'run_automation';
export type ProjectPermissions = Record<ProjectPermission, boolean>;
export type ProjectMemberStatus = 'invited' | 'accepted' | 'declined';

export type ApiTokenScope = 'read:project' | 'write:test-runs' | 'write:test-results' | 'write:issues';
export interface ApiToken { id: string; projectId: string; name: string; tokenPrefix: string; scopes: ApiTokenScope[]; revokedAt: string | null; expiresAt: string | null; lastUsedAt: string | null; createdAt: string; updatedAt: string; }
export interface CreatedApiToken extends ApiToken { token: string; }
export type WebhookEvent = 'test_run.created' | 'test_run.updated' | 'test_result.updated' | 'issue.created' | 'issue.updated' | 'issue.resolved';
export interface Webhook { id: string; projectId: string; name: string; url: string; events: WebhookEvent[]; isActive: boolean; maxRetries: number; createdAt: string; updatedAt: string; }
export interface CreatedWebhook extends Webhook { secret: string; }
export type WebhookDeliveryStatus = 'pending' | 'delivered' | 'retrying' | 'failed';
export interface WebhookDelivery { id: string; webhookId: string; projectId: string; event: WebhookEvent; resourceId: string; status: WebhookDeliveryStatus; attemptCount: number; nextAttemptAt: string; responseStatus: number | null; deliveredAt: string | null; lastError: string | null; createdAt: string; }

export interface ProjectMember {
  id: string;
  projectId: string;
  userId: string;
  role: ProjectMemberRole;
  permissions: ProjectPermissions;
  status: ProjectMemberStatus;
  invitedBy: string | null;
  invitedAt: string | null;
  acceptedAt: string | null;
  createdAt: string;
}

export interface ProjectMemberWithProfile extends ProjectMember {
  profile: Profile;
}

export interface Team {
  id: string;
  name: string;
  description: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TeamWithMembers extends Team { members: Profile[]; }
export interface ProjectTeam {
  id: string;
  projectId: string;
  teamId: string;
  role: ProjectMemberRole;
  permissions: ProjectPermissions;
  createdAt: string;
  team: Team;
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

// Role inside the application under test (for example Admin, Manager, or Member).
// This is intentionally separate from the TestManager project/user roles.
export interface TestRole {
  id: string;
  projectId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export type TestPlanStatus = 'draft' | 'active' | 'completed' | 'archived';

export interface TestPlan {
  id: string;
  projectId: string;
  code: string;
  name: string;
  description: string | null;
  status: TestPlanStatus;
  createdBy?: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Environment {
  id: string;
  projectId: string;
  name: string;
  baseUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

// Test Case is a reusable template — it never stores a pass/fail result itself.
// Results live on TestResult, one row per (TestRun x TestCase).
export type TestCasePriority = 'low' | 'medium' | 'high' | 'critical';
export type TestCaseStatus = 'draft' | 'active' | 'archived';
export type TestCaseSource = 'manual' | 'ai';
export type TestCaseReviewDecision = 'approved' | 'rejected';

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
  stepType: TestCaseStepType;
  priority: TestCasePriority;
  status: TestCaseStatus;
  source: TestCaseSource;
  aiBatchId: string | null;
  reviewDecision: TestCaseReviewDecision | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  notes: string | null;
  assignedTo: string | null;
  targetRoleId?: string | null;
  createdBy?: string | null;
  externalLinks?: ExternalLink[];
  createdAt: string;
  updatedAt: string;
}

export interface TestCaseVersion {
  id: string;
  testCaseId: string;
  version: number;
  steps: string;
  expectedResult: string;
  changedBy: string | null;
  createdAt: string;
}

export interface TestCaseStep {
  id: string;
  testCaseId: string;
  stepNumber: number;
  action: string;
  expectedResult: string | null;
  createdAt: string;
  updatedAt: string;
}

export type TestCaseFilters = {
  moduleId?: string | null;
  tagId?: string | null;
  priority?: TestCasePriority | null;
  status?: TestCaseStatus | null;
  assignedTo?: string | null;
};

export interface TestCaseWithDetails extends TestCase {
  module: Module | null;
  tags: Tag[];
  targetRole?: TestRole | null;
}

export type CommentTargetType = 'test_case' | 'issue';

export interface CommentMention {
  commentId: string;
  mentionedUserId: string;
  profile: Profile;
}

export interface Comment {
  id: string;
  projectId: string;
  targetType: CommentTargetType;
  targetId: string;
  authorId: string;
  author: Profile | null;
  body: string;
  mentions: CommentMention[];
  createdAt: string;
  updatedAt: string;
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
  testPlanId: string | null;
  projectId: string | null;
  isCustom: boolean;
  code: string;
  name: string;
  status: TestRunStatus;
  startedBy?: string | null;
  startedAt: string;
  completedAt: string | null;
  notes: string | null;
  environmentId: string | null;
  browser: string | null;
  device: string | null;
  buildVersion: string | null;
  release: string | null;
  repositoryId: string | null;
  pipelineId: string | null;
  branch: string | null;
  commitSha: string | null;
  buildNumber: string | null;
  ciProvider: string | null;
  externalRunId: string | null;
  createdAt: string;
  updatedAt: string;
}

export type CicdProvider = 'github_actions' | 'gitlab_ci' | 'jenkins' | 'runner_internal' | 'generic';

export interface CicdPipeline {
  id: string;
  projectId: string;
  testPlanId: string;
  name: string;
  provider: CicdProvider;
  tokenPrefix: string;
  active: boolean;
  lastUsedAt: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CicdPipelineSecret { pipeline: CicdPipeline; token: string; }
export type CicdIngestStatus = Exclude<TestResultStatus, 'not_run'>;
export interface CicdIngestResultInput { testCaseId?: string; testCaseCode?: string; status: CicdIngestStatus; notes?: string; executedAt?: string; }
export interface CicdIngestPayload { name?: string; branch?: string; commitSha?: string; buildNumber?: string; externalRunId?: string; environmentId?: string; buildVersion?: string; release?: string; results: CicdIngestResultInput[]; }
export interface CicdIngestResponse { runId: string; runCode: string; status: TestRunStatus; provider: CicdProvider; summary: { total: number; pass: number; fail: number; skip: number; blocked: number; notRun: number; progressPercent: number }; }

// --- Automation: Playwright Local Runner ---
// Browsers run on a local runner (separate CLI/agent), never on the central
// server. The server only stores mappings, enqueues jobs, and records results.
export type AutomationJobStatus = 'queued' | 'running' | 'passed' | 'failed' | 'canceled';
export type AutomationBrowser = 'chromium' | 'firefox' | 'webkit';
export type AutomationStepCommand = 'next' | 'continue';

export interface AutomationRunner {
  id: string;
  projectId: string;
  name: string;
  labels: string[];
  tokenPrefix: string;
  active: boolean;
  lastSeenAt: string | null;
  version: string | null;
  os: string | null;
  startedAt: string | null;
  scriptRefs: string[];
  browsers: AutomationBrowser[];
  lastJob: AutomationRunnerLastJob | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}
export interface AutomationRunnerLastJob { id: string; status: AutomationJobStatus; browser: AutomationBrowser; finishedAt: string | null; startedAt: string | null; queuedAt: string; }
export interface AutomationRunnerHeartbeat { runnerId: string; version: string; os: string | null; startedAt: string | null; scriptRefs: string[]; }
export interface AutomationRunnerSecret { runner: AutomationRunner; token: string; }
export interface AutomationRunnerDiagnostic {
  id: string; runnerId: string; status: 'queued' | 'running' | 'passed' | 'failed'; baseUrl: string | null;
  baseUrlReachable: boolean | null; browserInstalled: boolean | null; playwrightVersion: string | null;
  diskFreeBytes: number | null; errorMessage: string | null; requestedAt: string; finishedAt: string | null;
}

export interface AutomationScript {
  id: string;
  projectId: string;
  testCaseId: string;
  scriptRef: string;
  runnerLabels: string[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface AutomationArtifact { type: 'screenshot' | 'video' | 'trace' | 'log' | 'network' | 'dom'; url: string; name?: string; path?: string; bucket?: string; }

export interface ViewableAutomationArtifact extends AutomationArtifact {
  viewUrl: string | null;
  textContent: string | null;
  traceViewerUrl: string | null;
}

export interface TestResultScreenshotHistory {
  testResultId: string;
  testRunId: string;
  runCode: string;
  runName: string;
  startedAt: string;
  artifacts: AutomationArtifact[];
}

export interface ScreenshotComparison {
  before: Omit<TestResultScreenshotHistory, 'artifacts'> & { artifacts: ViewableAutomationArtifact[] };
  after: Omit<TestResultScreenshotHistory, 'artifacts'> & { artifacts: ViewableAutomationArtifact[] };
}

export interface AutomationJob {
  id: string;
  projectId: string;
  testRunId: string;
  testCaseId: string;
  scriptRef: string;
  requiredLabels: string[];
  status: AutomationJobStatus;
  attempt: number;
  maxAttempts: number;
  browser: AutomationBrowser;
  deviceProfile: string | null;
  pauseOnFailure: boolean;
  runnerId: string | null;
  artifacts: AutomationArtifact[];
  errorMessage: string | null;
  queuedAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  testPlanId: string | null;
  environmentId: string | null;
  testResultId: string | null;
  currentStep: string | null;
  estimatedDurationMs: number | null;
}

export type AutomationJobLogStream = 'stdout' | 'stderr' | 'system';
export interface AutomationJobLog {
  id: number;
  projectId: string;
  jobId: string;
  attempt: number;
  sequence: number;
  stream: AutomationJobLogStream;
  content: string;
  createdAt: string;
}

// --- Admin observability ---
export type OperationalHealthStatus = 'healthy' | 'warning' | 'down';
export type OperationalSource = 'worker' | 'queue' | 'storage' | 'integration';
export interface OperationalHealthComponent { name: OperationalSource; label: string; status: OperationalHealthStatus; summary: string; details: Record<string, unknown>; }
export interface OperationalHealth { checkedAt: string; components: OperationalHealthComponent[]; }
export interface OperationalErrorLog {
  id: number;
  source: OperationalSource;
  severity: 'warning' | 'error' | 'critical';
  code: string | null;
  message: string;
  projectId: string | null;
  resourceType: string | null;
  resourceId: string | null;
  context: Record<string, unknown>;
  occurredAt: string;
  resolvedAt: string | null;
}

export interface AutomationEnqueueResponse { runId: string; runCode: string; jobCount: number; }
export interface AutomationLocalRunResponse { runId: string; runCode: string; jobId: string; }

export type TestResultStatus = 'pass' | 'fail' | 'skip' | 'blocked' | 'not_run';

export interface TestRunSummary {
  total: number;
  executed: number;
  progressPercent: number;
  pass: number;
  fail: number;
  skip: number;
  blocked: number;
  notRun: number;
}

export interface TestResult {
  id: string;
  testRunId: string;
  testCaseId: string;
  /** Immutable test-case content captured when this result was seeded. */
  testCaseSnapshot: TestResultSnapshot | null;
  testerId: string | null;
  status: TestResultStatus;
  executedAt: string | null;
  notes: string | null;
  automationArtifacts: AutomationArtifact[];
  createdAt: string;
  updatedAt: string;
}

export interface TestResultSnapshot {
  code: string | null;
  title: string | null;
  objective: string | null;
  preconditions: string | null;
  steps: string | null;
  expectedResult: string | null;
  priority: string | null;
}

export type TestResultStepStatus = 'pass' | 'fail' | 'not_run';
export interface TestResultStep {
  id: string;
  testResultId: string;
  testCaseStepId: string;
  stepNumber: number;
  action: string;
  expectedResult: string | null;
  status: TestResultStepStatus;
  notes: string | null;
  updatedAt: string;
}

export interface TestRunAssignment {
  id: string;
  testRunId: string;
  testCaseId: string;
  testerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface TestResultWithDetails extends TestResult {
  testCase: TestCase;
  tester: Profile | null;
}

export type IssuePriority = 'low' | 'medium' | 'high' | 'critical';
export type IssueStatus = 'draft' | 'backlog' | 'open' | 'in_progress' | 'resolved' | 'verified' | 'closed' | 'rejected' | 'duplicate';
export type IssueType = 'bug' | 'feature' | 'improvement' | 'task';
export interface ExternalLink { label: string; url: string; }

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
  type?: IssueType;
  createdBy?: string | null;
  targetRoleId?: string | null;
  externalLinks?: ExternalLink[];
  fixReferenceUrl?: string | null;
  verifiedTestRunId?: string | null;
  assignedTo: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface IssueWithDetails extends Issue {
  assignee: Profile | null;
  module?: Module | null;
  targetRole?: TestRole | null;
  tags?: Tag[];
  /** Local schema has one direct test_result_id, unlike source-new's junction table. */
  linkedTestResults?: {
    id: string;
    testRunId: string;
    testCaseCode: string | null;
    testCaseTitle: string;
    testRun: { id: string; code: string; name: string } | null;
  }[];
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
  verifiedTestRun?: { id: string; code: string; name: string } | null;
}

export interface IssueCodeContext {
  repository: ProjectRepository;
  branch: string | null;
  commitSha: string | null;
  filePath: string | null;
  repositoryUrl: string | null;
  commitUrl: string | null;
  fileUrl: string | null;
}

export interface IssueAttachment {
  id: string;
  issueId: string;
  fileName: string;
  storagePath: string;
  mimeType: string;
  sizeBytes: number;
  uploadedBy: string;
  createdAt: string;
  url: string | null;
}

export type AttachmentEntityKind = 'test_case' | 'test_run';

export interface Attachment {
  id: string;
  entityKind: AttachmentEntityKind;
  testCaseId: string | null;
  testRunId: string | null;
  fileName: string;
  storagePath: string;
  mimeType: string;
  sizeBytes: number;
  uploadedBy: string;
  createdAt: string;
  url: string | null;
}

export interface Notification {
  id: string;
  recipientId: string;
  issueId: string | null;
  commentId: string | null;
  commentTargetType: CommentTargetType | null;
  commentTargetId: string | null;
  testCaseId: string | null;
  testRunId: string | null;
  automationJobId: string | null;
  projectId: string | null;
  kind: 'issue_assigned' | 'issue_status_changed' | 'comment_mentioned' | 'test_case_assigned' | 'test_case_status_changed' | 'test_run_assigned' | 'test_run_status_changed' | 'automation_completed';
  message: string;
  readAt: string | null;
  createdAt: string;
}

export type ActivityAction = 'created' | 'updated' | 'deleted';
export type ActivityActorType = 'human' | 'agent' | 'system';
export interface ActivityEvent {
  id: string;
  projectId: string;
  tableName: string;
  recordId: string | null;
  action: ActivityAction;
  changedBy: string | null;
  actorType: ActivityActorType;
  actor: Profile | null;
  oldData: Record<string, unknown> | null;
  newData: Record<string, unknown> | null;
  createdAt: string;
}

export type RequirementStatus = 'draft' | 'approved' | 'deprecated';
export type RequirementPriority = TestCasePriority;
export type RequirementLinkType = 'test_case' | 'test_plan' | 'test_result' | 'issue';
export interface Requirement { id: string; projectId: string; key: string; title: string; description: string | null; status: RequirementStatus; priority: RequirementPriority; createdBy: string | null; createdAt: string; updatedAt: string; }
export interface RequirementLink { id: string; requirementId: string; type: RequirementLinkType; targetId: string; targetLabel: string; createdBy: string | null; createdAt: string; }
export interface RequirementWithLinks extends Requirement { links: RequirementLink[]; }
export interface RequirementCoverage { total: number; covered: number; uncovered: number; percentage: number; }

export interface DashboardStats {
  projects: number;
  activeProjects: number;
  testCases: number;
  activeTestCases: number;
  testPlans: number;
  activeTestPlans: number;
  testRuns: number;
  inProgressRuns: number;
  completedRuns: number;
  results: Record<TestResultStatus, number>;
  issues: Record<IssueStatus, number>;
}

export interface DashboardReportFilters {
  projectId?: string | null;
  release?: string | null;
  environmentId?: string | null;
  testerId?: string | null;
  dateFrom?: string | null;
  dateTo?: string | null;
}

export interface DashboardReportRun {
  id: string;
  code: string;
  name: string;
  projectId: string;
  projectName: string;
  testPlanName: string;
  environmentName: string | null;
  release: string | null;
  status: TestRunStatus;
  startedAt: string;
  completedAt: string | null;
  total: number;
  executed: number;
  pass: number;
  fail: number;
  skip: number;
  blocked: number;
  notRun: number;
  passRate: number;
  failRate: number;
  progressPercent: number;
}

export interface DashboardIssueAging {
  total: number;
  open: number;
  inProgress: number;
  resolved: number;
  closed: number;
  averageDays: number;
  oldestDays: number;
}

export interface DashboardQaLoopAudit {
  issueId: string;
  testRunId: string;
  action: 'entered' | 'verified' | 'reopened';
  createdAt: string;
}

export interface DashboardQaLoop {
  entered: number;
  verified: number;
  reopened: number;
  reopenRate: number;
}

export interface DashboardReport {
  generatedAt: string;
  filters: DashboardReportFilters;
  runs: DashboardReportRun[];
  totals: {
    totalRuns: number;
    totalResults: number;
    executed: number;
    pass: number;
    fail: number;
    skip: number;
    blocked: number;
    notRun: number;
    passRate: number;
    failRate: number;
    progressPercent: number;
  };
  issueAging: DashboardIssueAging;
  qaLoop: DashboardQaLoop;
}

export interface RetentionPolicy { id: string; projectId: string | null; retentionDays: number; attachmentRetentionDays: number | null; enabled: boolean; createdBy: string | null; createdAt: string; updatedAt: string; }
export interface RetentionCleanupPreview { projectId: string | null; attachmentCutoff: string; testAttachmentCount: number; issueAttachmentCount: number; }
export interface RetentionCleanupResult { testAttachments: number; issueAttachments: number; cutoff: string; }
export interface RestorePreview { valid: boolean; projectName: string; modules: number; tags: number; testCases: number; testPlans: number; testRuns: number; testResults: number; issues: number; attachments: number; storageObjects: number; }
export interface RestoreResult { projectId: string; inserted: number; skipped: number; storageRestored: number; storageSkipped: number; }

export interface McpUsageEvent {
  usedAt: string;
}

export interface BackupStorageObject {
  bucket: 'test-attachments' | 'issue-attachments';
  path: string;
  mimeType: string;
  sizeBytes: number;
  base64: string;
}
