import type { AutomationArtifact, IssuePriority, IssueStatus, TestResultWithDetails } from './domain';

export interface AiIssueEnvironment {
  name: string | null;
  baseUrl: string | null;
  browser: string | null;
  browserVersion: string | null;
  os: string | null;
  viewport: { width: number; height: number } | null;
  buildVersion: string | null;
}

export type AiIssueSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface AiIssueDraft {
  projectId: string;
  testResultId: string;
  title: string;
  description: string;
  actualResult: string;
  expectedResult: string;
  priority: IssuePriority;
  severity: AiIssueSeverity;
  reproductionSteps: string;
  errorSummary: string;
  artifacts: AutomationArtifact[];
  environment: AiIssueEnvironment;
  commitSha: string | null;
}

export interface AiActorContext {
  userId: string;
  isApproved: boolean;
}

export interface AiIssueCandidateInput {
  id: string;
  code: string;
  testResultId: string;
  title: string;
  description: string | null;
  actualResult: string | null;
  expectedResult: string | null;
  priority: IssuePriority;
  status: IssueStatus;
}

export interface DuplicateIssueCandidate {
  issueId: string;
  confidence: number;
  reason: string;
}

export interface AiAssistantSearchRequest {
  projectId: string;
  query: string;
  entityTypes?: AiAssistantEntityType[];
  limit?: number;
}

export type AiAssistantEntityType = 'test_case' | 'test_run' | 'test_result' | 'issue' | 'requirement' | 'history';

export interface AiAssistantMatch {
  entityType: AiAssistantEntityType;
  entityId: string;
  projectId: string;
  code: string | null;
  title: string;
  snippet: string;
  score: number;
}

export interface AiAssistantSearchResult {
  answer: string | null;
  matches: AiAssistantMatch[];
}

export interface AiGatewayIssueDraftRequest {
  action: 'issue_draft';
  projectId: string;
  result: {
    id: string;
    status: TestResultWithDetails['status'];
    notes: string | null;
    errorSummary: string;
    artifacts: AutomationArtifact[];
    environment: AiIssueEnvironment;
    commitSha: string | null;
    testCase: Pick<TestResultWithDetails['testCase'], 'id' | 'projectId' | 'code' | 'title' | 'objective' | 'preconditions' | 'steps' | 'expectedResult' | 'priority'>;
  };
}

export interface AiGatewayDuplicateRequest {
  action: 'duplicate_issue_detection';
  projectId: string;
  draft: AiIssueDraft;
  candidates: AiIssueCandidateInput[];
}

export interface AiGatewayAssistantRequest extends AiAssistantSearchRequest {
  action: 'assistant_search';
}
