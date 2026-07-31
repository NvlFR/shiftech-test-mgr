# Graph Report - shiftech-test-mgr  (2026-07-31)

## Corpus Check
- 317 files · ~202,039 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1898 nodes · 3757 edges · 163 communities (132 shown, 31 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 27 edges (avg confidence: 0.61)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `9c8fe335`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Community 0
- Community 1
- Community 2
- Community 3
- Community 4
- Community 5
- Community 6
- Community 7
- Community 8
- Community 9
- Community 10
- Community 11
- Community 12
- Community 13
- Community 14
- Community 15
- Community 16
- What You Must Do When Invoked
- 3. Konsep Test Management
- 2026-07-22
- ARCHITECTURE — TestManager (shiftech-test-mgr)
- Feature Backlog — TestManager
- Architecture
- AttachmentPanel.tsx
- testRunService.ts
- ProjectSettingsPage.tsx
- TestCaseDetailPage.tsx
- statusLabels.ts
- schema_entity_codes.sql
- schema_test_management_v2.sql
- TASKS — TestManager (shiftech-test-mgr)
- shiftech-test-mgr (TestManager) — OpenCode Project Rules
- FEATURES — Status Checklist
- schema_p2_workflow.sql
- graphify reference: extra exports and benchmark
- graphify reference: extra exports and benchmark
- Coding Conventions
- README.md
- schema_auth.sql
- graphify reference: query, path, explain
- graphify reference: query, path, explain
- useTheme.tsx
- TestManager (shiftech-test-mgr)
- schema_013_p1_collaboration.sql
- schema_project_roles.sql
- schema_requirement_traceability.sql
- primereact
- react-hook-form
- AppTopbar.tsx
- schema_project_lifecycle.sql
- testSuiteRepository.ts
- scripts
- graphify reference: commit hook and native CLAUDE.md integration
- graphify reference: incremental update and cluster-only
- issueAttachmentRepository.ts
- graphify reference: commit hook and native CLAUDE.md integration
- graphify reference: incremental update and cluster-only
- schema_016_p1_security_hardening.sql
- schema_project_members.sql
- graphify reference: GitHub clone and cross-repo merge
- graphify reference: transcribe video and audio
- graphify reference: GitHub clone and cross-repo merge
- testCaseExcel.ts
- TODO — Sprint Board Aktif
- schema_issue_attachments.sql
- extraction-spec.md
- extraction-spec.md
- schema_017_p1_rpc_hardening.sql
- backupRetentionRepository.ts
- useAuthContext
- useScreenSize.ts
- 3. Konsep Test Management
- schema_issue_code.sql
- schema_test_run_notes.sql
- seed.sql
- scripts
- schema_021_p2_backup_retention.sql
- schema_022_p2_security_hardening.sql
- primeflex
- useStoredState.ts
- 2026-07-26
- Coding Conventions
- handler.ts
- schema_018_p2_dashboard_reporting.sql
- testRunRepository.ts
- security.ts
- csvImport.ts
- Kontrak Integrasi CI/CD
- primeicons
- package.json
- ProjectsPage.tsx
- UserManagementPage.tsx
- domain.ts
- activityDescribe.ts
- supabaseClient.ts
- schema_023_p3_ai_integration.sql
- TestRunDetailPage.tsx
- @tanstack/react-query
- 2026-07-31 — FIX-00b error TypeScript ProjectDetailPage
- DashboardReportPage.tsx
- primereact
- ProjectsPage.tsx
- domain.ts
- AppMenu.tsx
- DashboardReportPage.tsx
- AI Integration
- AppMenu.tsx
- react-router-dom
- PageHeader.tsx
- schema_030_test_suite_library.sql
- .mcp.json
- schema_025_fix_pgcrypto_and_audit.sql
- playwright.config.ts
- broken.spec.ts
- smoke.spec.ts
- schema_026_automation_artifacts_storage.sql
- react-dom
- schema_027_fix_attachment_helper_grants.sql
- zod
- schema_041_profile_rejected_role.sql
- react-router-dom
- jspdf
- useScreenSize.ts
- schema_031_structured_steps_custom_runs.sql
- jspdf
- testCaseStepRepository.ts
- notificationRepository.ts
- primeflex
- react-hook-form
- @supabase/supabase-js
- package.json
- tsconfig.json
- schema_012_test_run_assignments.sql
- schema_030_test_suite_library.sql
- schema_issue_attachments.sql
- CLAUDE.md
- extraction-spec.md
- Breadcrumb.tsx
- .mcp.json
- schema_035_test_result_snapshot.sql
- schema_036_test_result_order_snapshot.sql
- schema_issue_code.sql
- schema_test_run_notes.sql
- react-markdown
- @supabase/supabase-js
- ProjectSettingsPage.tsx
- 2026-07-31 — SRC-04 penyelesaian notification center
- schema_042_issue_attachment_storage_cleanup.sql

## God Nodes (most connected - your core abstractions)
1. `react` - 83 edges
2. `2026-07-22` - 52 edges
3. `useAuthContext()` - 43 edges
4. `supabase` - 35 edges
5. `Worklog` - 32 edges
6. `useProjectRole()` - 26 edges
7. `formatDateTime()` - 22 edges
8. `handleAiGateway()` - 20 edges
9. `useScreenSize()` - 19 edges
10. `TestCaseWithDetails` - 18 edges

## Surprising Connections (you probably didn't know these)
- `useAiAssistant()` --indirect_call--> `query()`  [INFERRED]
  frontend/src/hooks/useAiAssistant.ts → supabase/functions/ai-gateway/handler.ts
- `completeWithRetry()` --indirect_call--> `resolve()`  [INFERRED]
  supabase/functions/ai-gateway/handler.ts → frontend/src/hooks/useTheme.tsx
- `ProjectTestCaseTab()` --indirect_call--> `query()`  [INFERRED]
  frontend/src/pages/projects/ProjectTestCaseTab.tsx → supabase/functions/ai-gateway/handler.ts
- `TestRunDetailPage()` --indirect_call--> `query()`  [INFERRED]
  frontend/src/pages/test-runs/TestRunDetailPage.tsx → supabase/functions/ai-gateway/handler.ts
- `TestCasesPage()` --indirect_call--> `query()`  [INFERRED]
  frontend/src/pages/test-cases/TestCasesPage.tsx → supabase/functions/ai-gateway/handler.ts

## Import Cycles
- None detected.

## Communities (163 total, 31 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.09
Nodes (39): AiTestCaseGeneratorDialog(), maxCaseOptions, priorityOptions, ReviewDraft, CustomTestRunDialog(), CustomTestRunDialogProps, AiTestCaseResponseSchema, AiTestCaseSchema (+31 more)

### Community 1 - "Community 1"
Cohesion: 0.06
Nodes (50): AiIssueDraftDialog(), priorities, Props, IssueEditor(), IssueFormData, PRIORITY_OPTIONS, STATUS_OPTIONS, TYPE_OPTIONS (+42 more)

### Community 2 - "Community 2"
Cohesion: 0.04
Nodes (52): 2026-07-22, 2026-07-22 — Sub-agent 1: P2 Dashboard Trend dan Reporting, 2026-07-22 — Sub-agent 5: Security, RLS, migration review, integration QA, 2026-07-26 — Audit potensi bug (read-only, tanpa perubahan kode), 2026-07-26 — Benchmark penghematan token Graphify, 2026-07-26 — Fix bug #3: paginasi agregasi (batas 1000 baris PostgREST), 2026-07-26 — Fix bug #5, #6, #7 (footgun hook + business rule), 2026-07-26 — Fix bug hasil audit (HIGH + race guard) (+44 more)

### Community 3 - "Community 3"
Cohesion: 0.10
Nodes (27): ApiError, AutomationApi, AutomationJob, JobResult, ReportArtifact, ReportPayload, classify(), collectArtifacts() (+19 more)

### Community 4 - "Community 4"
Cohesion: 0.08
Nodes (34): AppMenu(), AppMenuitem(), AppMenuSeparator(), MenuItemModel, exportDashboardReportToExcel(), exportDashboardReportToPdf(), safeName(), mapProjectRow() (+26 more)

### Community 5 - "Community 5"
Cohesion: 0.06
Nodes (32): compilerOptions, allowArbitraryExtensions, allowImportingTsExtensions, erasableSyntaxOnly, jsx, lib, module, moduleDetection (+24 more)

### Community 6 - "Community 6"
Cohesion: 0.09
Nodes (26): ProfileViewProps, describeSystemEvent(), EVENT_TYPE_LABEL, STATUS_LABEL_BY_ENTITY, statusLabel(), ISSUE_STATUS_LABEL, ISSUE_STATUS_SEVERITY, PROJECT_MEMBER_ROLE_LABEL (+18 more)

### Community 7 - "Community 7"
Cohesion: 0.13
Nodes (15): CredentialAction, CredentialRequest, CredentialResponse, maskCredential(), parseCredentialRequest(), projectCredentialResponse(), corsHeaders, createRepoCredentialsHandler() (+7 more)

### Community 8 - "Community 8"
Cohesion: 0.15
Nodes (16): TestSuiteDialog(), dataTablePaginatorProps, dataTablePaginatorTemplate, FilterToolbar(), FilterToolbarProps, SearchInput(), SearchInputProps, PROJECT_STATUS_SEVERITY (+8 more)

### Community 9 - "Community 9"
Cohesion: 0.21
Nodes (10): IssueEditorProps, mapTestRoleRow(), projectMemberRepository, testRoleRepository, projectMemberService, testRoleService, ProjectMember, ProjectMemberRole (+2 more)

### Community 10 - "Community 10"
Cohesion: 0.07
Nodes (34): riskLabel, riskSeverity, TestRunAnalysisPanel(), TestRunAnalysisPanelProps, AiTestRunAnalysisResponseContract, aiTestRunAnalysisResponseSchema, failurePatternSchema, parseAiTestRunAnalysisResponse() (+26 more)

### Community 11 - "Community 11"
Cohesion: 0.40
Nodes (5): 2026-07-31 — REPO-06 Test Connection GitHub, 2026-07-31 — SRC-01 aktivasi dialog source-new, 2026-07-31 — SRC-02 integrasi komponen Issue, 2026-07-31 — SRC-06 audit dan port shared UI, 2026-07-31 — SRC-08 sinkronisasi hooks-new

### Community 12 - "Community 12"
Cohesion: 0.14
Nodes (20): mapRestorePreviewRow(), mapRestoreResultRow(), mapRetentionCleanupPreviewRow(), mapRetentionCleanupResultRow(), mapRetentionPolicyRow(), backup(), backupRetentionRepository, cleanup() (+12 more)

### Community 13 - "Community 13"
Cohesion: 0.07
Nodes (29): 2026-07-22 — Apply migration P1 dan checklist, 2026-07-22 — Integrasi P1 dan QA final, 2026-07-22 — P1 Duplicate Test Case dan Comment/Mention, 2026-07-22 — P1 Requirement Traceability, 2026-07-22 — P2 API Token dan Webhook (sub-agent 2), 2026-07-22 — P2 Backup/Restore dan Data Retention (sub-agent 4), 2026-07-22 — P2 Integrasi CI/CD (sub-agent 3), 2026-07-22 — P2 Reporting, Integrasi, Backup, Retention, dan QA final (+21 more)

### Community 14 - "Community 14"
Cohesion: 0.08
Nodes (24): For /graphify add and --watch, For /graphify query, For the commit hook and native CLAUDE.md integration, For --update and --cluster-only, /graphify, Honesty Rules, Interpreter guard for subcommands, Part A - Structural extraction for code files (+16 more)

### Community 15 - "Community 15"
Cohesion: 0.08
Nodes (24): For /graphify add and --watch, For /graphify query, For the commit hook and native CLAUDE.md integration, For --update and --cluster-only, /graphify, Honesty Rules, Interpreter guard for subcommands, Part A - Structural extraction for code files (+16 more)

### Community 16 - "Community 16"
Cohesion: 0.08
Nodes (25): 1. Latar Belakang & Tujuan, 2. Target Pengguna, 3. Konsep Test Management, 4.1 Projects, 4.2 Modules & Tags, 4.3 Test Cases, 4.4 Test Plans, 4.5 Test Runs & Test Results (+17 more)

### Community 17 - "What You Must Do When Invoked"
Cohesion: 0.30
Nodes (7): supabase, mapNotificationRow(), commentRepository, notificationRepository, commentService, Comment, CommentTargetType

### Community 18 - "3. Konsep Test Management"
Cohesion: 0.43
Nodes (4): mapEnvironmentRow(), environmentRepository, environmentService, Environment

### Community 19 - "2026-07-22"
Cohesion: 0.18
Nodes (11): 1.1 Architectural Style, 1.2 Kenapa layer ini dan bukan "fetch langsung di komponen"?, 1. System Architecture, 3. Data Flow Example — Menambah Test Plan Baru, 4.0 Test Management Workflow (mengapa modelnya begini), 4.1 Auth & RBAC, 4.-1 Kode Entity Auto-Generate (MOD-####, TC-####, TP-####, TR-####), 4. Database Schema (Supabase / Postgres) (+3 more)

### Community 20 - "ARCHITECTURE — TestManager (shiftech-test-mgr)"
Cohesion: 0.33
Nodes (6): 2.1 Repository (`repositories/*.ts`), 2.2 Service (`services/*.ts`), 2.3 Helper (`src/helpers/*.ts`), 2.4 Hook / Composable (`src/hooks/*.ts`), 2.5 Component & Page (`src/components/`, `src/pages/`), 2. Layer Detail

### Community 21 - "Feature Backlog — TestManager"
Cohesion: 0.16
Nodes (16): mapAutomationJobRow(), mapAutomationRunnerRow(), mapAutomationScriptRow(), useAutomation(), useEnvironments(), AutomationPage(), jobSeverity, runnerOnline() (+8 more)

### Community 22 - "Architecture"
Cohesion: 0.08
Nodes (33): mapActivityEventRow(), mapCommentMentionRow(), mapCommentRow(), mapIssueRow(), mapModuleRow(), mapProfileRow(), mapProjectMemberRow(), mapProjectMemberWithProfileRow() (+25 more)

### Community 23 - "AttachmentPanel.tsx"
Cohesion: 0.39
Nodes (5): mapIssueAttachmentRow(), issueAttachmentRepository, withSignedUrl(), issueAttachmentService, IssueAttachment

### Community 24 - "testRunService.ts"
Cohesion: 0.09
Nodes (21): AnalysisOutputSchema, AnalysisRequest, AssistantOutputSchema, AssistantRequest, DuplicateOutputSchema, DuplicateRequest, ErrorEnvelope, GatewayRequest (+13 more)

### Community 25 - "ProjectSettingsPage.tsx"
Cohesion: 0.08
Nodes (25): dependencies, @hookform/resolvers, jspdf-autotable, primeflex, primeicons, primereact, react-dom, react-markdown (+17 more)

### Community 26 - "TestCaseDetailPage.tsx"
Cohesion: 0.09
Nodes (27): TestSuiteDialogMode, TestSuiteDialogProps, VISIBILITY_OPTIONS, AttachmentPanel(), AttachmentPanelProps, formatFileSize(), CharacterCount(), CharacterCountProps (+19 more)

### Community 27 - "statusLabels.ts"
Cohesion: 0.17
Nodes (17): mapApiTokenRow(), mapWebhookDeliveryRow(), mapWebhookRow(), useIntegrations(), eventOptions, IntegrationsPage(), scopeOptions, integrationRepository (+9 more)

### Community 28 - "schema_entity_codes.sql"
Cohesion: 0.11
Nodes (22): BulkActionsBar(), BulkActionsBarProps, RowActionsMenu(), RowActionsMenuProps, downloadTestCaseImportTemplate(), exportTestCasesToExcel(), exportTestCasesToPdf(), ISSUE_PRIORITY_OPTIONS (+14 more)

### Community 29 - "schema_test_management_v2.sql"
Cohesion: 0.33
Nodes (6): 6.1 Auth Architecture Detail, 6.2 Modul User Management (`src/pages/users/UserManagementPage.tsx`, `UserDetailPage.tsx`), 6.3 Modul Test Run, Test Result, Issue, 6.4 Modul Module & Tag, 6.5 Modul Project Lifecycle (`src/pages/projects/ProjectsPage.tsx`, `ProjectDetailPage.tsx`), 6. Cross-Cutting Concerns

### Community 30 - "TASKS — TestManager (shiftech-test-mgr)"
Cohesion: 0.10
Nodes (19): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection, noEmit, noFallthroughCasesInSwitch (+11 more)

### Community 31 - "shiftech-test-mgr (TestManager) — OpenCode Project Rules"
Cohesion: 0.10
Nodes (19): src/**/*.ts, compilerOptions, declaration, esModuleInterop, forceConsistentCasingInFileNames, lib, module, moduleResolution (+11 more)

### Community 32 - "FEATURES — Status Checklist"
Cohesion: 0.10
Nodes (19): bin, tm-runner, description, devDependencies, @types/node, typescript, engines, node (+11 more)

### Community 33 - "schema_p2_workflow.sql"
Cohesion: 0.14
Nodes (12): ActionOutput, ProviderAction, AiProvider, fetchJson(), GeminiProvider, jsonObjectFromPrompt(), MockProvider, OpenAiProvider (+4 more)

### Community 34 - "graphify reference: extra exports and benchmark"
Cohesion: 0.14
Nodes (17): mapCicdPipelineRow(), cicdRepository, testResultStepRepository, testResultStepService, ActivityAction, AutomationArtifact, CicdIngestPayload, CicdIngestResponse (+9 more)

### Community 35 - "graphify reference: extra exports and benchmark"
Cohesion: 0.23
Nodes (17): canonicalAction, requestInput(), RequestSchema, analysisResponse(), completeWithRetry(), env, errorResponse(), handleAiGateway() (+9 more)

### Community 37 - "Coding Conventions"
Cohesion: 0.16
Nodes (13): computeDuplicateConfidence(), GatewayErrorCode, parseProviderJson(), validateActionOutput(), allowedOrigin(), authenticate(), corsHeaders(), GatewayHttpError (+5 more)

### Community 38 - "README.md"
Cohesion: 0.12
Nodes (17): devDependencies, oxlint, @types/node, @types/react, @types/react-dom, typescript, vite, @vitejs/plugin-react (+9 more)

### Community 39 - "schema_auth.sql"
Cohesion: 0.11
Nodes (22): AiAssistantPanel(), Props, ImportCasesDialogProps, TEST_CASE_PRIORITY_LABEL, TEST_CASE_STATUS_SEVERITY, useAiAssistant(), PRIORITY_OPTIONS, TestCaseDetailPage() (+14 more)

### Community 40 - "graphify reference: query, path, explain"
Cohesion: 0.12
Nodes (24): STATUS_OPTIONS, TestPlanDialog(), TestPlanDialogProps, ActivityPanel(), TABLE_LABELS, formatDateTime(), mapTestPlanRow(), TEST_PLAN_STATUS_LABEL (+16 more)

### Community 41 - "graphify reference: query, path, explain"
Cohesion: 0.18
Nodes (11): automation_jobs, automation_runners, automation_scripts, enqueue_automation_jobs(), poll_automation_job(), report_automation_job(), trg_automation_jobs_updated_at, trg_automation_runners_updated_at (+3 more)

### Community 42 - "useTheme.tsx"
Cohesion: 0.22
Nodes (8): Commands, Database (Supabase), Development, Dokumentasi Tambahan, Project Overview, Struktur repo, Wajib Menggunakan Graphify, Worklog Wajib

### Community 43 - "TestManager (shiftech-test-mgr)"
Cohesion: 0.14
Nodes (15): mapDashboardReportRunRow(), mapTestResultRow(), mapTestResultStepRow(), DashboardReportIssueRow, DashboardReportResultRow, countRows(), countStatuses(), dashboardRepository (+7 more)

### Community 44 - "schema_013_p1_collaboration.sql"
Cohesion: 0.20
Nodes (12): api_token_rate_limits, api_tokens, create_api_token(), create_webhook(), queue_issue_webhook(), queue_test_result_webhook(), queue_test_run_webhook(), trg_p2_webhook_issue (+4 more)

### Community 45 - "schema_project_roles.sql"
Cohesion: 0.26
Nodes (12): extractIssueCodes(), extractMentionUsernames(), extractTestCaseCodes(), extractUniqueValues(), findReferences(), KnownRefs, linkifyMentionsMarkdown(), REF_PATTERNS (+4 more)

### Community 46 - "schema_requirement_traceability.sql"
Cohesion: 0.19
Nodes (11): entity_code_sequences, modules, set_module_code(), set_test_case_code(), set_test_plan_code(), test_cases, test_plans, test_runs (+3 more)

### Community 47 - "primereact"
Cohesion: 0.22
Nodes (12): issues, modules, tags, test_case_tags, test_cases, test_plan_cases, test_results, test_runs (+4 more)

### Community 48 - "react-hook-form"
Cohesion: 0.17
Nodes (12): E01 — Fondasi Arsitektur, E02 — Modul Projects, E03 — Modul Test Cases, E04 — Modul Test Plans, E05 — Polish (opsional, sesuai kebutuhan validasi arsitektur), E06 — Auth & RBAC (Google Login + User Management), E07 — Project Lifecycle (search, filter, sort, status, hapus permanen, detail), E08 — Test Management v2 (Module, Tag, Test Run, Test Result, Issue) (+4 more)

### Community 49 - "AppTopbar.tsx"
Cohesion: 0.19
Nodes (11): mapProjectRepositoryRow(), CreateProjectRepositoryInput, projectRepositoryLinkRepository, UpdateProjectRepositoryInput, isAbsolutePath(), projectRepositoryLinkService, ProjectRepositoryMutationActor, RepositoryLocation (+3 more)

### Community 50 - "schema_project_lifecycle.sql"
Cohesion: 0.18
Nodes (9): Artifact, Cara kerja, Docker, Kenapa runner terpisah?, Konfigurasi (`.env`), Label / routing, Prasyarat, Setup (+1 more)

### Community 51 - "testSuiteRepository.ts"
Cohesion: 0.33
Nodes (4): DescribableActivityEntry, ACTIVITY_ENTITY_LABEL, ACTIVITY_ENTITY_ROUTE, ActivityEntityType

### Community 52 - "scripts"
Cohesion: 0.18
Nodes (10): name, private, scripts, build, dev, lint, preview, test (+2 more)

### Community 53 - "graphify reference: commit hook and native CLAUDE.md integration"
Cohesion: 0.20
Nodes (10): 11.1 Tahap 1 — Requirement → Test Case CSV, 11.2 Tahap 2 — Import & review manusia (gate wajib), 11.3 Tahap 3 — Test Plan disetujui → Test Run dijalankan AI, 11.4 Tahap 4 — Kegagalan → bukti lengkap, 11.5 Tahap 5 — AI membuat Issue, 11.6 Tahap 6 — Developer memperbaiki, 11.7 Tahap 7 — Regression selektif, 11.8 Tahap 8 — Verifikasi (+2 more)

### Community 54 - "graphify reference: incremental update and cluster-only"
Cohesion: 0.18
Nodes (11): FEATURES — Status Checklist, Infrastruktur, Integrasi source-new (hasil akhir), Issues, Kode Entity (Module, Test Case, Test Plan, Test Run), Modules & Tags, Projects, Test Cases (+3 more)

### Community 55 - "issueAttachmentRepository.ts"
Cohesion: 0.21
Nodes (12): mapTestRunAssignmentRow(), mapTestRunRow(), EMPTY_FILTERS, TestRunWithSummary, testCaseRepository, testResultRepository, TestRunFilters, testRunRepository (+4 more)

### Community 56 - "graphify reference: commit hook and native CLAUDE.md integration"
Cohesion: 0.29
Nodes (8): audit_logs, notifications, notify_issue_changes(), record_test_case_version(), test_case_versions, test_cases, trg_issue_notifications, trg_test_case_version

### Community 57 - "graphify reference: incremental update and cluster-only"
Cohesion: 0.20
Nodes (9): Directory Structure, Domain Model — Test Management Workflow, graphify, Important Commands, Internal Documentation, Key Packages, shiftech-test-mgr (TestManager) — OpenCode Project Rules, Tech Stack (+1 more)

### Community 58 - "schema_016_p1_security_hardening.sql"
Cohesion: 0.22
Nodes (8): graphify reference: extra exports and benchmark, Step 6b - Wiki (only if --wiki flag), Step 7 - Neo4j export (only if --neo4j or --neo4j-push flag), Step 7a - FalkorDB export (only if --falkordb or --falkordb-push flag), Step 7b - SVG export (only if --svg flag), Step 7c - GraphML export (only if --graphml flag), Step 7d - MCP server (only if --mcp flag), Step 8 - Token reduction benchmark (only if total_words > 5000)

### Community 59 - "schema_project_members.sql"
Cohesion: 0.22
Nodes (9): Architecture, Auth & RBAC (Google Login), Domain Model — Test Management Workflow, Kenapa tidak ada Controller/API layer?, Konvensi Judul Halaman, Layered structure (`frontend/src/`), Module Creation Order (untuk fitur/modul baru), Naming & Convention (+1 more)

### Community 60 - "graphify reference: GitHub clone and cross-repo merge"
Cohesion: 0.22
Nodes (8): graphify reference: extra exports and benchmark, Step 6b - Wiki (only if --wiki flag), Step 7 - Neo4j export (only if --neo4j or --neo4j-push flag), Step 7a - FalkorDB export (only if --falkordb or --falkordb-push flag), Step 7b - SVG export (only if --svg flag), Step 7c - GraphML export (only if --graphml flag), Step 7d - MCP server (only if --mcp flag), Step 8 - Token reduction benchmark (only if total_words > 5000)

### Community 61 - "graphify reference: transcribe video and audio"
Cohesion: 0.22
Nodes (8): plugins, rules, react/only-export-components, react/rules-of-hooks, $schema, oxc, typescript, warn

### Community 62 - "graphify reference: GitHub clone and cross-repo merge"
Cohesion: 0.17
Nodes (16): mapRequirementLinkRow(), mapRequirementRow(), useRequirements(), Option, PRIORITIES, STATUSES, TYPES, mapLink() (+8 more)

### Community 64 - "TODO — Sprint Board Aktif"
Cohesion: 0.40
Nodes (5): Diblokir, Sedang Dikerjakan, Selesai (recent), Siap Dikerjakan (next up), TODO — Sprint Board Aktif

### Community 65 - "schema_issue_attachments.sql"
Cohesion: 0.42
Nodes (8): projects, set_updated_at(), test_cases, test_plan_cases, test_plans, trg_projects_updated_at, trg_test_cases_updated_at, trg_test_plans_updated_at

### Community 66 - "extraction-spec.md"
Cohesion: 0.31
Nodes (6): comment_mentions, comments, set_comment_updated_at(), trg_comments_updated_at, trg_validate_comment_target_project, validate_comment_target_project()

### Community 67 - "extraction-spec.md"
Cohesion: 0.36
Nodes (7): xlsx, ImportedTestCaseRow, normalizeHeader(), normalizePriority(), parseTestCaseExcel(), valueFrom(), xlsx

### Community 68 - "schema_017_p1_rpc_hardening.sql"
Cohesion: 0.22
Nodes (9): 2026-07-26, 2026-07-26 — Audit fungsional semua fitur FEATURE_BACKLOG, 2026-07-26 — Coordinator: integrasi AI Integration, 2026-07-26 — Final integration verification AI, 2026-07-26 — Fix AI_INVALID_OUTPUT ai-gateway (schema hint untuk provider nyata), 2026-07-26 — Fix CORS ai-gateway (browser blokir POST), 2026-07-26 — Section 3: webhook HTTP delivery (schema_028) — FUNGSIONAL, 2026-07-26 — Section 4: deploy Edge Function ai-gateway — FUNGSIONAL (+1 more)

### Community 69 - "backupRetentionRepository.ts"
Cohesion: 0.25
Nodes (8): Architecture Pattern (WAJIB diikuti, urutan layer tidak boleh dilompati), Auth & RBAC, Coding Conventions, Data Mapping, Judul Halaman (`PageHeader`), Module Creation Order (fitur/modul baru), Naming, PrimeReact Usage

### Community 70 - "useAuthContext"
Cohesion: 0.12
Nodes (22): ProfileView(), Breadcrumb(), BreadcrumbItem, BreadcrumbProps, CommentsPanel(), ISSUE_PRIORITY_SEVERITY, ISSUE_TYPE_SEVERITY, AuthContext (+14 more)

### Community 71 - "useScreenSize.ts"
Cohesion: 0.12
Nodes (29): AdminRoute(), ProtectedRoute(), ImportCasesDialog(), formatDate(), useAuthContext(), useBackupRetention(), useCicdPipelines(), useProjectBreadcrumbItems() (+21 more)

### Community 72 - "3. Konsep Test Management"
Cohesion: 0.14
Nodes (16): IssueDialog(), IssueDialogProps, PageHeader(), PageHeaderProps, ISSUE_PRIORITY_LABEL, useIssuesByTestRun(), useTestRunAnalysis(), useTestRunDetail() (+8 more)

### Community 73 - "schema_issue_code.sql"
Cohesion: 0.25
Nodes (7): @playwright/test, description, devDependencies, @playwright/test, name, private, version

### Community 74 - "schema_test_run_notes.sql"
Cohesion: 0.43
Nodes (7): cicd_ingest_attempts, cicd_pipelines, create_cicd_pipeline(), test_runs, trg_cicd_pipeline_plan, trg_cicd_pipelines_updated_at, validate_cicd_pipeline_plan()

### Community 76 - "scripts"
Cohesion: 0.43
Nodes (5): has_project_access(), is_project_manager(), is_project_owner(), project_members, projects

### Community 77 - "schema_021_p2_backup_retention.sql"
Cohesion: 0.32
Nodes (6): audit_logs, comments, notifications, notify_comment_mentions(), trg_audit_log_comments, trg_comment_mention_notifications

### Community 78 - "schema_022_p2_security_hardening.sql"
Cohesion: 0.29
Nodes (6): AI Integration, Fitur dan contract, Local development, Mengganti provider, Secret Edge Function, Security dan privacy

### Community 79 - "primeflex"
Cohesion: 0.29
Nodes (7): 10.1 Model data, 10.2 Mode `local_path`, 10.3 Mode GitHub (public & private), 10.4 Penyimpanan kredensial (kritis), 10.5 Pemanfaatan, 10.6 UI, 10. Link repository (GitHub / local path / private repo)

### Community 80 - "useStoredState.ts"
Cohesion: 0.05
Nodes (46): App(), AppLayout(), AppLayoutInner(), AppSidebar(), AppSidebarMask(), AppTopbar(), BreadcrumbContext, BreadcrumbContextValue (+38 more)

### Community 81 - "2026-07-26"
Cohesion: 0.38
Nodes (3): dispatch_pending_webhooks(), reconcile_webhook_deliveries(), webhook_deliveries

### Community 82 - "Coding Conventions"
Cohesion: 0.43
Nodes (6): handle_new_user(), is_admin(), is_approved(), profiles, trg_on_auth_user_created, trg_profiles_updated_at

### Community 83 - "handler.ts"
Cohesion: 0.17
Nodes (12): 2026-07-31, Antrean Codex lengkap + renumber FEATURE_BACKLOG, Audit fitur repo pembanding, Build hijau kembali + perbaikan desain gate codex-loop, Codex task loop (otomasi antrean task), Commit porting source-new + ignore aset *-new, E08-T15 — Verifikasi dan pelengkapan Attachment Issue end-to-end, Penambahan roadmap: MCP server, Playwright interaktif, link repository (+4 more)

### Community 84 - "schema_018_p2_dashboard_reporting.sql"
Cohesion: 0.33
Nodes (5): For /graphify explain, For /graphify path, graphify reference: query, path, explain, Step 0 — Constrained query expansion (REQUIRED before traversal), Step 1 — Traversal

### Community 85 - "testRunRepository.ts"
Cohesion: 0.33
Nodes (5): For /graphify explain, For /graphify path, graphify reference: query, path, explain, Step 0 — Constrained query expansion (REQUIRED before traversal), Step 1 — Traversal

### Community 86 - "security.ts"
Cohesion: 0.33
Nodes (5): Keputusan yang sudah dikunci, Mengapa berubah, Skema tabel, Urutan pengerjaan yang diusulkan, Yang masih perlu keputusanmu

### Community 87 - "csvImport.ts"
Cohesion: 0.33
Nodes (6): 12. Urutan implementasi yang disarankan, 13. Catatan keputusan teknis, 1. Fitur yang sudah selesai, 4. AI Integration, 6. Administrasi dan kolaborasi, Feature Backlog — TestManager

### Community 88 - "Kontrak Integrasi CI/CD"
Cohesion: 0.33
Nodes (6): 9.1 Mode eksekusi interaktif (sisi runner), 9.2 Authoring & codegen, 9.3 Observability saat gagal (paket bukti lengkap), 9.4 Viewer di aplikasi, 9.5 Interaktivitas terarah, 9. Playwright lokal yang lebih interaktif

### Community 89 - "primeicons"
Cohesion: 0.38
Nodes (6): jspdf, exportTestRunsToExcel(), exportTestRunsToPdf(), fileName(), TestRunExportRow, jspdf

### Community 91 - "ProjectsPage.tsx"
Cohesion: 0.33
Nodes (6): Dokumentasi, Getting Started, Scripts, Stack, Struktur Repo, TestManager (shiftech-test-mgr)

### Community 92 - "UserManagementPage.tsx"
Cohesion: 0.53
Nodes (5): requirement_links, requirements, trg_requirements_updated_at, trg_validate_requirement_link_project, validate_requirement_link_project()

### Community 94 - "activityDescribe.ts"
Cohesion: 0.60
Nodes (5): can_delete_project_content(), can_edit_project_content(), can_manage_issues(), can_run_tests(), project_members

### Community 95 - "supabaseClient.ts"
Cohesion: 0.40
Nodes (5): 2. Prioritas P1 — Workflow inti, Environment Management, Requirement Traceability, Test Case Productivity, Test Run Enhancement

### Community 96 - "schema_023_p3_ai_integration.sql"
Cohesion: 0.40
Nodes (5): 3. Prioritas P2 — Reporting dan integrasi, API dan Webhook, Backup dan Retention, Dashboard dan Reporting, Integrasi CI/CD

### Community 97 - "TestRunDetailPage.tsx"
Cohesion: 0.40
Nodes (5): 5. Automation dan Playwright, Model arsitektur — Local Runner (WAJIB dibaca dulu), Orkestrasi job (sisi server pusat), Playwright Local Runner (sisi mesin lokal), Skalabilitas & keamanan

### Community 98 - "@tanstack/react-query"
Cohesion: 0.22
Nodes (8): 2026-07-31 — FIX-00a duplikasi domain TestCase, 2026-07-31 — FIX-00b error TypeScript ProjectDetailPage, 2026-07-31 — Integrasi compile-safe dialogs, notifications, dan profile, 2026-07-31 — Membuat task integrasi penuh source-new, 2026-07-31 — SRC-07 port helper source-new, 2026-07-31 — SRC-10 sinkronisasi repository source-new, 2026-07-31 — SRC-11 sinkronisasi business rule service source-new, 2026-07-31 — SRC-12 konsolidasi domain aktif

### Community 99 - "2026-07-31 — FIX-00b error TypeScript ProjectDetailPage"
Cohesion: 0.25
Nodes (8): useDashboard(), ProjectContext, ProjectContextValue, ProjectProvider(), useProjectContext(), downloadCsv(), HomePage(), projectService

### Community 100 - "DashboardReportPage.tsx"
Cohesion: 0.40
Nodes (4): Error details, Instructions, Test info, Test source

### Community 101 - "primereact"
Cohesion: 0.40
Nodes (4): Error details, Instructions, Test info, Test source

### Community 105 - "DashboardReportPage.tsx"
Cohesion: 0.60
Nodes (4): test_case_steps, test_result_steps, test_run_cases, test_runs

### Community 106 - "AI Integration"
Cohesion: 0.40
Nodes (4): issues, test_cases, test_plans, test_runs

### Community 107 - "AppMenu.tsx"
Cohesion: 0.60
Nodes (4): is_admin(), is_approved(), profiles, projects

### Community 108 - "react-router-dom"
Cohesion: 0.50
Nodes (3): For /graphify add, For --watch, graphify reference: add a URL and watch a folder

### Community 109 - "PageHeader.tsx"
Cohesion: 0.50
Nodes (3): For git commit hook, For native CLAUDE.md integration, graphify reference: commit hook and native CLAUDE.md integration

### Community 110 - "schema_030_test_suite_library.sql"
Cohesion: 0.50
Nodes (3): For --cluster-only, For --update (incremental re-extraction), graphify reference: incremental update and cluster-only

### Community 111 - ".mcp.json"
Cohesion: 0.50
Nodes (3): For /graphify add, For --watch, graphify reference: add a URL and watch a folder

### Community 112 - "schema_025_fix_pgcrypto_and_audit.sql"
Cohesion: 0.50
Nodes (3): For git commit hook, For native CLAUDE.md integration, graphify reference: commit hook and native CLAUDE.md integration

### Community 113 - "playwright.config.ts"
Cohesion: 0.50
Nodes (3): For --cluster-only, For --update (incremental re-extraction), graphify reference: incremental update and cluster-only

### Community 114 - "broken.spec.ts"
Cohesion: 0.50
Nodes (3): Batasan deployment, Ingest, Kontrak Integrasi CI/CD

### Community 115 - "smoke.spec.ts"
Cohesion: 0.50
Nodes (4): 7. Integrasi penuh source-new ke aplikasi aktif, Checklist per folder, Definition of Done, Tujuan

### Community 116 - "schema_026_automation_artifacts_storage.sql"
Cohesion: 0.50
Nodes (4): 8.1 Fondasi MCP server, 8.2 Katalog tools, 8.3 Guardrail, 8. MCP Server TestManager (multi-tool)

### Community 118 - "schema_027_fix_attachment_helper_grants.sql"
Cohesion: 0.67
Nodes (3): OwnerProjectLabel(), OwnerProjectLabelProps, truncate()

### Community 121 - "react-router-dom"
Cohesion: 0.50
Nodes (3): AI Gateway Edge Function, Local, Secret/config

### Community 122 - "jspdf"
Cohesion: 0.50
Nodes (3): environments, test_runs, trg_environments_updated_at

### Community 123 - "useScreenSize.ts"
Cohesion: 0.50
Nodes (3): test_cases, test_roles, trg_test_roles_updated_at

### Community 124 - "schema_031_structured_steps_custom_runs.sql"
Cohesion: 0.67
Nodes (3): test_cases, test_suite_item_steps, test_suite_items

### Community 125 - "jspdf"
Cohesion: 0.83
Nodes (3): has_project_access(), is_project_manager(), project_members

### Community 162 - "ProjectSettingsPage.tsx"
Cohesion: 0.19
Nodes (10): useProjectRepositories(), MEMBER_ROLE_OPTIONS, ProjectSettingsPage(), REPOSITORY_SOURCE_LABEL, REPOSITORY_SOURCE_OPTIONS, VISIBILITY_OPTIONS, repositoryConnectionRepository, RepositoryConnectionResultRow (+2 more)

### Community 166 - "2026-07-31 — SRC-04 penyelesaian notification center"
Cohesion: 0.20
Nodes (10): 2026-07-31 — E03-T06 audit filter priority dan status Test Case, 2026-07-31 — E06-T14 status rejected approval user, 2026-07-31 — REPO-03 service dan hook project repository, 2026-07-31 — REPO-05 Edge Function kredensial repository, 2026-07-31 — SRC-04 penyelesaian notification center, 2026-07-31 — SRC-05 aktivasi profile view lokal, 2026-07-31 — SRC-09a port halaman utama batch 1, 2026-07-31 — SRC-09c port halaman utama batch 3 (+2 more)

## Knowledge Gaps
- **729 isolated node(s):** `2026-07-31 — REPO-04 tab Repository di Project Settings`, `2026-07-31 — REPO-02 domain, mapper, dan CRUD project repository links`, `2026-07-31 — REPO-01 project repositories migration`, `E08-T15 — Verifikasi dan pelengkapan Attachment Issue end-to-end`, `SRC-DOC — Sinkronisasi dokumentasi akhir integrasi source-new` (+724 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **31 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `dependencies` connect `ProjectSettingsPage.tsx` to `extraction-spec.md`, `Breadcrumb.tsx`, `scripts`, `primeicons`, `@supabase/supabase-js`?**
  _High betweenness centrality (0.044) - this node is a cross-community bridge._
- **Why does `query()` connect `useScreenSize.ts` to `3. Konsep Test Management`, `graphify reference: extra exports and benchmark`, `schema_entity_codes.sql`, `schema_auth.sql`?**
  _High betweenness centrality (0.037) - this node is a cross-community bridge._
- **Why does `xlsx` connect `extraction-spec.md` to `Community 0`, `primeicons`, `Community 4`, `ProjectSettingsPage.tsx`, `schema_entity_codes.sql`?**
  _High betweenness centrality (0.032) - this node is a cross-community bridge._
- **What connects `2026-07-31 — REPO-04 tab Repository di Project Settings`, `2026-07-31 — REPO-02 domain, mapper, dan CRUD project repository links`, `2026-07-31 — REPO-01 project repositories migration` to the rest of the system?**
  _729 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.08865248226950355 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.06398809523809523 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.038461538461538464 - nodes in this community are weakly interconnected._