import { describe, expect, it } from 'vitest';
import * as mappers from './mappers';

type Mapper = (row: Record<string, unknown>, url?: string | null) => unknown;

const timestamps = {
  created_at: '2026-08-01T10:00:00.000Z',
  updated_at: '2026-08-01T11:00:00.000Z',
};

function camelizeKey(key: string): string {
  return key.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());
}

function camelizeRow(row: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(row).map(([key, value]) => [camelizeKey(key), value]));
}

function expectLosslessMapping(mapper: Mapper, row: Record<string, unknown>, expected = camelizeRow(row)) {
  expect(mapper(row)).toEqual(expected);
}

describe('mappers', () => {
  it('menguji setiap mapper yang diekspor agar penambahan mapper baru tidak luput', () => {
    expect(Object.keys(mappers).sort()).toEqual([
      'mapActivityEventRow', 'mapApiTokenRow', 'mapAttachmentRow', 'mapAutomationJobLogRow',
      'mapAutomationJobRow', 'mapAutomationRunnerRow', 'mapAutomationScriptRow', 'mapCicdPipelineRow',
      'mapCommentMentionRow', 'mapCommentRow', 'mapDashboardQaLoopAuditRow', 'mapDashboardReportRunRow', 'mapEnvironmentRow',
      'mapIssueAttachmentRow', 'mapIssueRow', 'mapModuleRow', 'mapNotificationRow', 'mapOperationalErrorLogRow',
      'mapOperationalHealth', 'mapProfileRow',
      'mapProjectMemberRow', 'mapProjectMemberWithProfileRow', 'mapProjectRepositoryRow', 'mapProjectRow',
      'mapProjectTeamRow', 'mapRequirementLinkRow', 'mapRequirementRow', 'mapRestorePreviewRow', 'mapRestoreResultRow',
      'mapRetentionCleanupPreviewRow', 'mapRetentionCleanupResultRow', 'mapRetentionPolicyRow', 'mapTagRow',
      'mapTeamRow', 'mapTeamWithMembersRow',
      'mapTestCaseRow', 'mapTestCaseStepRow', 'mapTestCaseVersionRow', 'mapTestPlanCaseRow',
      'mapTestPlanRow', 'mapTestPlanScheduleRow', 'mapTestResultRow', 'mapTestResultScreenshotHistoryRow', 'mapTestResultStepRow',
      'mapTestRoleRow', 'mapTestRunAssignmentRow', 'mapTestRunRow', 'mapTestSuiteItemRow',
      'mapTestSuiteItemStepRow', 'mapTestSuiteRow', 'mapWebhookDeliveryRow', 'mapWebhookRow',
    ]);
  });

  describe('mapper langsung snake_case ke camelCase', () => {
    const cases: Array<[string, Mapper, Record<string, unknown>]> = [
      ['API token', mappers.mapApiTokenRow, { id: 'token-1', project_id: 'project-1', name: 'CI', token_prefix: 'tm_123', scopes: ['read:project'], revoked_at: null, ...timestamps }],
      ['webhook', mappers.mapWebhookRow, { id: 'webhook-1', project_id: 'project-1', name: 'Run hook', url: 'https://example.test/hook', events: ['test_run.created'], is_active: true, max_retries: 3, ...timestamps }],
      ['webhook delivery', mappers.mapWebhookDeliveryRow, { id: 'delivery-1', webhook_id: 'webhook-1', project_id: 'project-1', event: 'issue.created', resource_id: 'issue-1', status: 'retrying', attempt_count: 2, next_attempt_at: '2026-08-02T10:00:00Z', response_status: null, delivered_at: null, last_error: null, created_at: timestamps.created_at }],
      ['CI/CD pipeline', mappers.mapCicdPipelineRow, { id: 'pipeline-1', project_id: 'project-1', test_plan_id: 'plan-1', name: 'Main', provider: 'github_actions', token_prefix: 'ci_123', active: true, last_used_at: null, created_by: 'user-1', ...timestamps }],
      ['automation runner', mappers.mapAutomationRunnerRow, { id: 'runner-1', project_id: 'project-1', name: 'Local', labels: ['linux'], token_prefix: 'runner_1', active: true, last_seen_at: null, created_by: 'user-1', ...timestamps }],
      ['automation script', mappers.mapAutomationScriptRow, { id: 'script-1', project_id: 'project-1', test_case_id: 'case-1', script_ref: 'tests/login.spec.ts', runner_labels: ['linux'], created_by: 'user-1', ...timestamps }],
      ['automation job', mappers.mapAutomationJobRow, { id: 'job-1', project_id: 'project-1', test_run_id: 'run-1', test_case_id: 'case-1', script_ref: 'tests/login.spec.ts', required_labels: ['linux'], status: 'queued', attempt: 1, max_attempts: 3, browser: 'firefox', device_profile: null, pause_on_failure: false, runner_id: null, artifacts: [], error_message: null, queued_at: timestamps.created_at, started_at: null, finished_at: null, created_by: 'user-1', ...timestamps }],
      ['project', mappers.mapProjectRow, { id: 'project-1', name: 'TestManager', description: null, status: 'active', owner_id: null, visibility: 'private', ...timestamps }],
      ['project repository', mappers.mapProjectRepositoryRow, { id: 'repository-1', project_id: 'project-1', name: 'Frontend', source_type: 'github_private', url_or_path: 'org/repo', default_branch: null, credential_id: null, credential_mask: null, credential_created_at: null, credential_expires_at: null, subdirectory: null, is_active: true, ...timestamps }],
      ['test suite', mappers.mapTestSuiteRow, { id: 'suite-1', owner_id: 'user-1', name: 'Public suite', description: null, visibility: 'public', ...timestamps }],
      ['test suite item', mappers.mapTestSuiteItemRow, { id: 'item-1', suite_id: 'suite-1', module_name: null, title: 'Login', objective: null, preconditions: null, steps: 'Open login', expected_result: 'Form visible', priority: 'high', step_type: 'simple', target_role: null, tag_names: ['smoke'], order_index: 1, ...timestamps }],
      ['test suite item step', mappers.mapTestSuiteItemStepRow, { id: 'suite-step-1', suite_item_id: 'item-1', step_number: 1, action: 'Open login', expected_result: null }],
      ['project member', mappers.mapProjectMemberRow, { id: 'member-1', project_id: 'project-1', user_id: 'user-1', role: 'tester', status: 'accepted', invited_by: null, invited_at: null, accepted_at: null, created_at: timestamps.created_at }],
      ['module', mappers.mapModuleRow, { id: 'module-1', project_id: 'project-1', code: 'MOD-0001', name: 'Auth', ...timestamps }],
      ['tag', mappers.mapTagRow, { id: 'tag-1', project_id: 'project-1', name: 'smoke', created_at: timestamps.created_at }],
      ['test role', mappers.mapTestRoleRow, { id: 'role-1', project_id: 'project-1', name: 'Administrator', ...timestamps }],
      ['test plan', mappers.mapTestPlanRow, { id: 'plan-1', project_id: 'project-1', code: 'TP-0001', name: 'Release', description: null, status: 'draft', created_by: null, approved_by: null, approved_at: null, ...timestamps }],
      ['test plan schedule', mappers.mapTestPlanScheduleRow, { id: 'schedule-1', project_id: 'project-1', test_plan_id: 'plan-1', name: 'Nightly', next_run_at: timestamps.created_at, interval_days: 1, environment_id: null, browser: 'chromium', device_profile: null, max_attempts: 2, pause_on_failure: true, active: true, last_enqueued_at: null, ...timestamps }],
      ['environment', mappers.mapEnvironmentRow, { id: 'environment-1', project_id: 'project-1', name: 'Staging', base_url: null, ...timestamps }],
      ['operational error log', mappers.mapOperationalErrorLogRow, { id: 42, source: 'queue', severity: 'error', code: 'FAILED', message: 'Job failed', project_id: 'project-1', resource_type: 'automation_job', resource_id: 'job-1', context: {}, occurred_at: timestamps.created_at, resolved_at: null }],
      ['test case', mappers.mapTestCaseRow, { id: 'case-1', project_id: 'project-1', module_id: null, code: 'TC-0001', title: 'Login', objective: null, preconditions: null, steps: 'Submit form', expected_result: 'Dashboard', step_type: 'simple', priority: 'critical', status: 'draft', source: 'ai', ai_batch_id: null, review_decision: null, reviewed_by: null, reviewed_at: null, notes: null, assigned_to: null, target_role_id: null, created_by: null, external_links: [], ...timestamps }],
      ['test case version', mappers.mapTestCaseVersionRow, { id: 'version-1', test_case_id: 'case-1', version: 2, steps: 'Updated step', expected_result: 'Updated result', changed_by: null, created_at: timestamps.created_at }],
      ['test plan case', mappers.mapTestPlanCaseRow, { id: 'plan-case-1', test_plan_id: 'plan-1', test_case_id: 'case-1', order: 4 }],
      ['test run', mappers.mapTestRunRow, { id: 'run-1', test_plan_id: null, project_id: 'project-1', is_custom: true, code: 'TR-0001', name: 'Custom run', status: 'in_progress', started_by: null, started_at: timestamps.created_at, completed_at: null, notes: null, environment_id: null, browser: null, device: null, build_version: null, release: null, repository_id: null, pipeline_id: null, branch: null, commit_sha: null, build_number: null, ci_provider: null, external_run_id: null, ...timestamps }],
      ['test case step', mappers.mapTestCaseStepRow, { id: 'step-1', test_case_id: 'case-1', step_number: 1, action: 'Open page', expected_result: null, ...timestamps }],
      ['test result step', mappers.mapTestResultStepRow, { id: 'result-step-1', test_result_id: 'result-1', test_case_step_id: 'step-1', step_number: 1, action: 'Open page', expected_result: null, status: 'not_run', notes: null, updated_at: timestamps.updated_at }],
      ['test run assignment', mappers.mapTestRunAssignmentRow, { id: 'assignment-1', test_run_id: 'run-1', test_case_id: 'case-1', tester_id: 'user-1', ...timestamps }],
      ['issue', mappers.mapIssueRow, { id: 'issue-1', code: 'ISS-0001', test_result_id: 'result-1', title: 'Login fails', description: null, actual_result: null, expected_result: null, priority: 'high', status: 'open', assigned_to: null, type: 'bug', created_by: null, target_role_id: null, external_links: [], fix_reference_url: null, verified_test_run_id: null, ...timestamps }],
      ['profile', mappers.mapProfileRow, { id: 'user-1', email: 'user@example.test', full_name: null, avatar_url: null, role: 'user', created_at: timestamps.created_at, updated_at: timestamps.updated_at, deleted_at: null }],
      ['team', mappers.mapTeamRow, { id: 'team-1', name: 'QA', description: null, created_by: null, ...timestamps }],
      ['requirement', mappers.mapRequirementRow, { id: 'requirement-1', project_id: 'project-1', key: 'REQ-1', title: 'Login', description: null, status: 'approved', priority: 'high', created_by: null, ...timestamps }],
      ['requirement link', mappers.mapRequirementLinkRow, { id: 'link-1', requirement_id: 'requirement-1', type: 'test_case', target_id: 'case-1', target_label: 'TC-0001', created_by: null, created_at: timestamps.created_at }],
    ];

    it.each(cases)('%s mempertahankan seluruh field dan nilai nullable', (_, mapper, row) => {
      expectLosslessMapping(mapper, row);
    });
  });

  describe('mapper dengan konversi, nested row, atau bentuk domain khusus', () => {
    const profileRow = { id: 'user-1', email: 'user@example.test', full_name: null, avatar_url: null, role: 'user', created_at: timestamps.created_at, updated_at: timestamps.updated_at, deleted_at: null };
    const profile = camelizeRow(profileRow);

    it('memetakan payload health operasional dan mempertahankan detail komponen', () => {
      expect(mappers.mapOperationalHealth({
        checked_at: timestamps.created_at,
        components: [{ name: 'worker', label: 'Worker', status: 'healthy', summary: '1 runner online', details: { online: 1 } }],
      })).toEqual({
        checkedAt: timestamps.created_at,
        components: [{ name: 'worker', label: 'Worker', status: 'healthy', summary: '1 runner online', details: { online: 1 } }],
      });
    });

    it('memetakan project member beserta profile nullable secara utuh', () => {
      const row = { id: 'member-1', project_id: 'project-1', user_id: 'user-1', role: 'tester', status: 'accepted', invited_by: null, invited_at: null, accepted_at: null, created_at: timestamps.created_at, profile: profileRow };
      expect(mappers.mapProjectMemberWithProfileRow(row)).toEqual({ ...camelizeRow(row), profile });
    });

    it('memetakan anggota team dan akses team project beserta relasi nested', () => {
      const teamRow = { id: 'team-1', name: 'QA', description: null, created_by: 'user-1', ...timestamps };
      expect(mappers.mapTeamWithMembersRow({ ...teamRow, team_members: [{ profile: profileRow }] })).toEqual({ ...camelizeRow(teamRow), members: [profile] });
      expect(mappers.mapProjectTeamRow({ id: 'access-1', project_id: 'project-1', team_id: 'team-1', role: 'tester', permissions: { view: true }, created_at: timestamps.created_at, team: teamRow })).toEqual({ id: 'access-1', projectId: 'project-1', teamId: 'team-1', role: 'tester', permissions: { view: true }, createdAt: timestamps.created_at, team: camelizeRow(teamRow) });
    });

    it('memetakan notification dan target comment nested yang nullable', () => {
      const row = { id: 'notification-1', recipient_id: 'user-1', issue_id: null, comment_id: 'comment-1', comment: { target_type: 'issue', target_id: 'issue-1' }, kind: 'comment_mentioned', message: 'Mentioned', read_at: null, created_at: timestamps.created_at };
      expect(mappers.mapNotificationRow(row)).toEqual({ id: 'notification-1', recipientId: 'user-1', issueId: null, commentId: 'comment-1', commentTargetType: 'issue', commentTargetId: 'issue-1', testCaseId: null, testRunId: null, automationJobId: null, projectId: null, kind: 'comment_mentioned', message: 'Mentioned', readAt: null, createdAt: timestamps.created_at });
    });

    it('memetakan activity actor nested dan nullable', () => {
      const row = { id: 'activity-1', project_id: 'project-1', table_name: 'issues', record_id: null, action: 'updated', changed_by: null, actor: profileRow, old_data: { status: 'open' }, new_data: { status: 'resolved' }, created_at: timestamps.created_at };
      expect(mappers.mapActivityEventRow(row)).toEqual({ id: 'activity-1', projectId: 'project-1', tableName: 'issues', recordId: null, action: 'updated', changedBy: null, actorType: 'system', actor: profile, oldData: { status: 'open' }, newData: { status: 'resolved' }, createdAt: timestamps.created_at });
      expect(mappers.mapActivityEventRow({ ...row, actor: null }).actor).toBeNull();
      expect(mappers.mapActivityEventRow({ ...row, actor_type: 'agent' }).actorType).toBe('agent');
      expect(mappers.mapActivityEventRow({ ...row, changed_by: 'user-1' }).actorType).toBe('human');
    });

    it('memetakan comment, author, mentions, dan profile nested', () => {
      const row = { id: 'comment-1', project_id: 'project-1', target_type: 'issue', target_id: 'issue-1', author_id: 'user-1', author: profileRow, body: 'Hello', comment_mentions: [{ comment_id: 'comment-1', mentioned_user_id: 'user-2', profile: { ...profileRow, id: 'user-2' } }], ...timestamps };
      expect(mappers.mapCommentRow(row)).toEqual({ id: 'comment-1', projectId: 'project-1', targetType: 'issue', targetId: 'issue-1', authorId: 'user-1', author: profile, body: 'Hello', mentions: [{ commentId: 'comment-1', mentionedUserId: 'user-2', profile: { ...profile, id: 'user-2' } }], createdAt: timestamps.created_at, updatedAt: timestamps.updated_at });
      expect(mappers.mapCommentMentionRow(row.comment_mentions[0])).toEqual({ commentId: 'comment-1', mentionedUserId: 'user-2', profile: { ...profile, id: 'user-2' } });
    });

    it('memetakan snapshot test result lengkap dan mempertahankan nullable', () => {
      const row = { id: 'result-1', test_run_id: 'run-1', test_case_id: 'case-1', test_case_code: 'TC-0001', test_case_title: 'Login', test_case_objective: null, test_case_preconditions: null, test_case_steps: 'Submit', test_case_expected_result: 'Dashboard', test_case_priority: 'high', tester_id: null, status: 'not_run', executed_at: null, notes: null, automation_artifacts: [], ...timestamps };
      expect(mappers.mapTestResultRow(row)).toEqual({ id: 'result-1', testRunId: 'run-1', testCaseId: 'case-1', testCaseSnapshot: { code: 'TC-0001', title: 'Login', objective: null, preconditions: null, steps: 'Submit', expectedResult: 'Dashboard', priority: 'high' }, testerId: null, status: 'not_run', executedAt: null, notes: null, automationArtifacts: [], createdAt: timestamps.created_at, updatedAt: timestamps.updated_at });
    });

    it('menghasilkan snapshot null bila seluruh kolom snapshot tidak tersedia', () => {
      const row = { id: 'result-1', test_run_id: 'run-1', test_case_id: 'case-1', tester_id: null, status: 'not_run', executed_at: null, notes: null, ...timestamps };
      expect(mappers.mapTestResultRow(row)).toEqual({ id: 'result-1', testRunId: 'run-1', testCaseId: 'case-1', testCaseSnapshot: null, testerId: null, status: 'not_run', executedAt: null, notes: null, automationArtifacts: [], createdAt: timestamps.created_at, updatedAt: timestamps.updated_at });
    });

    it('menyaring hanya artifact screenshot dari riwayat hasil', () => {
      const screenshot = { type: 'screenshot', url: 'https://example.test/screenshot.png' };
      const row = { id: 'result-1', test_run_id: 'run-1', test_run: { code: 'TR-0001', name: 'Regression', started_at: timestamps.created_at }, automation_artifacts: [screenshot, { type: 'video', url: 'https://example.test/video.webm' }] };
      expect(mappers.mapTestResultScreenshotHistoryRow(row)).toEqual({ testResultId: 'result-1', testRunId: 'run-1', runCode: 'TR-0001', runName: 'Regression', startedAt: timestamps.created_at, artifacts: [screenshot] });
    });

    it('mengubah id log dan ukuran attachment dari representasi database menjadi number', () => {
      expect(mappers.mapAutomationJobLogRow({ id: '42', project_id: 'project-1', job_id: 'job-1', attempt: 1, sequence: 2, stream: 'stdout', content: 'ok', created_at: timestamps.created_at })).toEqual({ id: 42, projectId: 'project-1', jobId: 'job-1', attempt: 1, sequence: 2, stream: 'stdout', content: 'ok', createdAt: timestamps.created_at });
      const attachment = { id: 'attachment-1', entity_kind: 'test_case', test_case_id: 'case-1', test_run_id: null, file_name: 'proof.png', storage_path: 'project/proof.png', mime_type: 'image/png', size_bytes: '2048', uploaded_by: 'user-1', created_at: timestamps.created_at };
      expect(mappers.mapAttachmentRow(attachment, 'https://example.test/proof.png')).toEqual({ ...camelizeRow(attachment), sizeBytes: 2048, url: 'https://example.test/proof.png' });
      const issueAttachment = { id: 'attachment-2', issue_id: 'issue-1', file_name: 'proof.png', storage_path: 'issue/proof.png', mime_type: 'image/png', size_bytes: '1024', uploaded_by: 'user-1', created_at: timestamps.created_at };
      expect(mappers.mapIssueAttachmentRow(issueAttachment)).toEqual({ ...camelizeRow(issueAttachment), sizeBytes: 1024, url: null });
    });

    it('memetakan dashboard report dari relasi nested dan menginisialisasi summary', () => {
      const row = { id: 'run-1', code: 'TR-0001', name: 'Regression', test_plan: { project_id: 'project-1', name: 'Release', project: { name: 'TestManager' } }, environment: null, release: null, status: 'completed', started_at: timestamps.created_at, completed_at: null };
      expect(mappers.mapDashboardReportRunRow(row)).toEqual({ id: 'run-1', code: 'TR-0001', name: 'Regression', projectId: 'project-1', projectName: 'TestManager', testPlanName: 'Release', environmentName: null, release: null, status: 'completed', startedAt: timestamps.created_at, completedAt: null, total: 0, executed: 0, pass: 0, fail: 0, skip: 0, blocked: 0, notRun: 0, passRate: 0, failRate: 0, progressPercent: 0 });
    });

    it('memetakan audit siklus QA dan custom regression run', () => {
      expect(mappers.mapDashboardQaLoopAuditRow({ table_name: 'mcp.automation.rerun_failed', record_id: 'run-1', new_data: { issue_id: 'issue-1' }, created_at: timestamps.created_at })).toEqual({ issueId: 'issue-1', testRunId: 'run-1', action: 'entered', createdAt: timestamps.created_at });
      expect(mappers.mapDashboardQaLoopAuditRow({ table_name: 'mcp.automation.verify_regression', record_id: 'issue-1', new_data: { issue_id: 'issue-1', test_run_id: 'run-1', agent_action: 'issue_verified' }, created_at: timestamps.created_at })).toEqual({ issueId: 'issue-1', testRunId: 'run-1', action: 'verified', createdAt: timestamps.created_at });
      expect(mappers.mapDashboardReportRunRow({ id: 'run-1', code: 'TR-0001', name: 'Regression', custom_project_id: 'project-1', custom_project: { name: 'TestManager' }, environment: null, release: null, status: 'completed', started_at: timestamps.created_at, completed_at: timestamps.updated_at })).toMatchObject({ projectId: 'project-1', projectName: 'TestManager', testPlanName: 'Custom regression' });
    });

    it('memetakan retention dan restore serta menjaga null dan konversi number', () => {
      expect(mappers.mapRetentionPolicyRow({ id: 'policy-1', project_id: null, retention_days: '30', attachment_retention_days: null, enabled: 1, created_by: null, ...timestamps })).toEqual({ id: 'policy-1', projectId: null, retentionDays: 30, attachmentRetentionDays: null, enabled: true, createdBy: null, createdAt: timestamps.created_at, updatedAt: timestamps.updated_at });
      expect(mappers.mapRetentionCleanupPreviewRow({ project_id: null, attachment_cutoff: timestamps.created_at, test_attachment_count: '2', issue_attachment_count: '3' })).toEqual({ projectId: null, attachmentCutoff: timestamps.created_at, testAttachmentCount: 2, issueAttachmentCount: 3 });
      expect(mappers.mapRetentionCleanupResultRow({ cutoff: timestamps.created_at, test_attachments: '4', issue_attachments: '5' })).toEqual({ cutoff: timestamps.created_at, testAttachments: 4, issueAttachments: 5 });
      expect(mappers.mapRestorePreviewRow({ valid: 1, project_name: 'Restored', modules: '1', tags: '2', test_cases: '3', test_plans: '4', test_runs: '5', test_results: '6', issues: '7', attachments: '8', storage_objects: '9' })).toEqual({ valid: true, projectName: 'Restored', modules: 1, tags: 2, testCases: 3, testPlans: 4, testRuns: 5, testResults: 6, issues: 7, attachments: 8, storageObjects: 9 });
      expect(mappers.mapRestoreResultRow({ project_id: 'project-1', inserted: '9', skipped: '10', storage_restored: '11', storage_skipped: '12' })).toEqual({ projectId: 'project-1', inserted: 9, skipped: 10, storageRestored: 11, storageSkipped: 12 });
    });
  });

  describe('fallback untuk field nullable atau array yang tidak dikirim database', () => {
    it('menggunakan default domain tanpa mengubah nilai falsy yang valid', () => {
      expect(mappers.mapWebhookRow({ id: 'w', project_id: 'p', name: 'n', url: 'u', is_active: false, max_retries: 0, ...timestamps }).events).toEqual([]);
      expect(mappers.mapAutomationJobRow({ id: 'j', project_id: 'p', test_run_id: 'r', test_case_id: 'c', script_ref: 's', status: 'queued', attempt: 0, max_attempts: 0, queued_at: timestamps.created_at, created_by: 'u', ...timestamps })).toMatchObject({ requiredLabels: [], browser: 'chromium', deviceProfile: null, pauseOnFailure: false, runnerId: null, artifacts: [], errorMessage: null, startedAt: null, finishedAt: null });
      expect(mappers.mapTestSuiteItemRow({ id: 'i', suite_id: 's', title: 't', steps: 's', expected_result: 'e', priority: 'low', order_index: 0, ...timestamps })).toMatchObject({ moduleName: null, objective: null, preconditions: null, stepType: 'simple', targetRole: null, tagNames: [] });
      expect(mappers.mapProjectRow({ id: 'p', name: 'n', description: null, status: 'active', ...timestamps })).toMatchObject({ ownerId: null, visibility: 'private' });
      expect(mappers.mapTestCaseRow({ id: 'c', project_id: 'p', module_id: null, code: 'TC-1', title: 't', objective: null, preconditions: null, steps: 's', expected_result: 'e', priority: 'low', status: 'draft', notes: null, ...timestamps })).toMatchObject({ stepType: 'simple', source: 'manual', aiBatchId: null, reviewDecision: null, reviewedBy: null, reviewedAt: null, assignedTo: null, targetRoleId: null, createdBy: null, externalLinks: [] });
    });

    it('membedakan undefined opsional issue dari null relasional', () => {
      const issue = mappers.mapIssueRow({ id: 'i', code: 'ISS-1', test_result_id: 'r', title: 't', description: null, actual_result: null, expected_result: null, priority: 'low', status: 'draft', assigned_to: null, ...timestamps });
      expect(issue).toMatchObject({ type: undefined, createdBy: null, targetRoleId: null, externalLinks: [], assignedTo: null });
    });
  });
});
