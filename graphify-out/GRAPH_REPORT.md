# Graph Report - shiftech-test-mgr  (2026-07-26)

## Corpus Check
- 240 files · ~160,110 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1445 nodes · 2901 edges · 119 communities (96 shown, 23 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 18 edges (avg confidence: 0.53)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `f9ad9436`
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
- schema.sql
- Coding Conventions
- schema_auth.sql
- graphify reference: query, path, explain
- graphify reference: query, path, explain
- design-review-test-management-v2.md
- TestManager (shiftech-test-mgr)
- schema_013_p1_collaboration.sql
- schema_project_roles.sql
- schema_requirement_traceability.sql
- primereact
- react-hook-form
- schema_011_attachments_archive.sql
- schema_project_lifecycle.sql
- TODO — Sprint Board Aktif
- graphify reference: add a URL and watch a folder
- graphify reference: commit hook and native CLAUDE.md integration
- graphify reference: incremental update and cluster-only
- graphify reference: add a URL and watch a folder
- graphify reference: commit hook and native CLAUDE.md integration
- graphify reference: incremental update and cluster-only
- schema_project_members.sql
- graphify reference: GitHub clone and cross-repo merge
- graphify reference: transcribe video and audio
- graphify reference: GitHub clone and cross-repo merge
- graphify reference: transcribe video and audio
- schema_012_test_run_assignments.sql
- schema_issue_attachments.sql
- extraction-spec.md
- extraction-spec.md
- backupRetentionRepository.ts
- CLAUDE.md
- schema_020_p2_cicd.sql
- package.json
- schema_issue_code.sql
- schema_test_run_notes.sql
- scripts
- schema_021_p2_backup_retention.sql
- schema_022_p2_security_hardening.sql
- primeflex
- contract.ts
- primereact
- Coding Conventions
- handler.ts
- testRunRepository.ts
- security.ts
- CLAUDE.md
- Kontrak Integrasi CI/CD
- contract.test.ts
- AI Gateway Edge Function
- ProjectsPage.tsx
- UserManagementPage.tsx
- domain.ts
- dashboardReportRepository.ts
- supabaseClient.ts
- schema_023_p3_ai_integration.sql
- package.json
- scripts
- primeflex
- primeicons
- primereact
- ProjectsPage.tsx
- domain.ts
- AppMenu.tsx
- DashboardReportPage.tsx
- AI Integration
- primeicons
- react-router-dom
- primereact
- @tanstack/react-query
- .mcp.json
- schema_028_webhook_dispatch.sql

## God Nodes (most connected - your core abstractions)
1. `react` - 63 edges
2. `useAuthContext()` - 35 edges
3. `2026-07-22` - 28 edges
4. `supabase` - 27 edges
5. `useProjectRole()` - 26 edges
6. `Worklog` - 24 edges
7. `handleAiGateway()` - 20 edges
8. `compilerOptions` - 18 edges
9. `formatDateTime()` - 16 edges
10. `TestCaseWithDetails` - 16 edges

## Surprising Connections (you probably didn't know these)
- `useAiAssistant()` --indirect_call--> `query()`  [INFERRED]
  frontend/src/hooks/useAiAssistant.ts → supabase/functions/ai-gateway/handler.ts
- `completeWithRetry()` --indirect_call--> `resolve()`  [INFERRED]
  supabase/functions/ai-gateway/handler.ts → frontend/src/hooks/useTheme.tsx
- `AiRetestRecommendation` --references--> `TestCasePriority`  [EXTRACTED]
  frontend/src/types/aiTestRunAnalysis.ts → frontend/src/types/domain.ts
- `exportDashboardReportToPdf()` --references--> `jspdf`  [EXTRACTED]
  frontend/src/helpers/dashboardReportExporter.ts → frontend/package.json
- `exportTestCasesToPdf()` --references--> `jspdf`  [EXTRACTED]
  frontend/src/helpers/pdfExporter.ts → frontend/package.json

## Import Cycles
- None detected.

## Communities (119 total, 23 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.53
Nodes (5): requirement_links, requirements, trg_requirements_updated_at, trg_validate_requirement_link_project, validate_requirement_link_project()

### Community 1 - "Community 1"
Cohesion: 0.12
Nodes (25): mapApiTokenRow(), mapWebhookDeliveryRow(), mapWebhookRow(), useIntegrations(), eventOptions, IntegrationsPage(), scopeOptions, integrationRepository (+17 more)

### Community 2 - "Community 2"
Cohesion: 0.20
Nodes (11): PageHeader(), PageHeaderProps, formatDate(), mapTestPlanRow(), ProjectsPage(), TEST_PLAN_STATUS_OPTIONS, TestPlansPage(), testPlanRepository (+3 more)

### Community 3 - "Community 3"
Cohesion: 0.16
Nodes (14): supabase, mapIssueRow(), mapModuleRow(), mapTagRow(), mapRow(), withSignedUrl(), issueRepository, mapTestCaseSummary() (+6 more)

### Community 4 - "Community 4"
Cohesion: 0.12
Nodes (17): dependencies, @hookform/resolvers, jspdf, jspdf-autotable, primeflex, react, react-dom, react-hook-form (+9 more)

### Community 5 - "Community 5"
Cohesion: 0.08
Nodes (32): AppLayout(), AppLayoutInner(), AppSidebar(), AppSidebarMask(), AppTopbar(), BreadcrumbContext, BreadcrumbContextValue, BreadcrumbItem (+24 more)

### Community 6 - "Community 6"
Cohesion: 0.12
Nodes (17): devDependencies, oxlint, @types/node, @types/react, @types/react-dom, typescript, vite, @vitejs/plugin-react (+9 more)

### Community 7 - "Community 7"
Cohesion: 0.10
Nodes (23): xlsx, RowActionsMenu(), RowActionsMenuProps, downloadTestCaseImportTemplate(), exportTestCasesToExcel(), exportTestCasesToPdf(), ImportedTestCaseRow, normalizeHeader() (+15 more)

### Community 8 - "Community 8"
Cohesion: 0.08
Nodes (23): compilerOptions, allowArbitraryExtensions, allowImportingTsExtensions, erasableSyntaxOnly, jsx, lib, module, moduleDetection (+15 more)

### Community 9 - "Community 9"
Cohesion: 0.10
Nodes (23): riskLabel, riskSeverity, TestRunAnalysisPanel(), TestRunAnalysisPanelProps, AiTestRunAnalysisResponseContract, aiTestRunAnalysisResponseSchema, failurePatternSchema, parseAiTestRunAnalysisResponse() (+15 more)

### Community 10 - "Community 10"
Cohesion: 0.10
Nodes (19): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection, noEmit, noFallthroughCasesInSwitch (+11 more)

### Community 11 - "Community 11"
Cohesion: 0.08
Nodes (24): For /graphify add and --watch, For /graphify query, For the commit hook and native CLAUDE.md integration, For --update and --cluster-only, /graphify, Honesty Rules, Interpreter guard for subcommands, Part A - Structural extraction for code files (+16 more)

### Community 12 - "Community 12"
Cohesion: 0.22
Nodes (8): plugins, rules, react/only-export-components, react/rules-of-hooks, $schema, oxc, typescript, warn

### Community 13 - "Community 13"
Cohesion: 0.17
Nodes (17): mapRequirementLinkRow(), mapRequirementRow(), useRequirements(), Option, PRIORITIES, RequirementsPage(), STATUSES, TYPES (+9 more)

### Community 17 - "What You Must Do When Invoked"
Cohesion: 0.08
Nodes (24): For /graphify add and --watch, For /graphify query, For the commit hook and native CLAUDE.md integration, For --update and --cluster-only, /graphify, Honesty Rules, Interpreter guard for subcommands, Part A - Structural extraction for code files (+16 more)

### Community 18 - "3. Konsep Test Management"
Cohesion: 0.08
Nodes (25): 1. Latar Belakang & Tujuan, 2. Target Pengguna, 3. Konsep Test Management, 4.1 Projects, 4.2 Modules & Tags, 4.3 Test Cases, 4.4 Test Plans, 4.5 Test Runs & Test Results (+17 more)

### Community 19 - "2026-07-22"
Cohesion: 0.07
Nodes (28): 2026-07-22, 2026-07-22 — Sub-agent 1: P2 Dashboard Trend dan Reporting, 2026-07-22 — Sub-agent 5: Security, RLS, migration review, integration QA, 2026-07-26 — Audit potensi bug (read-only, tanpa perubahan kode), 2026-07-26 — Fix bug #3: paginasi agregasi (batas 1000 baris PostgREST), 2026-07-26 — Fix bug #5, #6, #7 (footgun hook + business rule), 2026-07-26 — Fix bug hasil audit (HIGH + race guard), 2026-07-26 — Sub-agent 5: Frontend AI Issue dan Assistant Contract (+20 more)

### Community 20 - "ARCHITECTURE — TestManager (shiftech-test-mgr)"
Cohesion: 0.09
Nodes (23): 1.1 Architectural Style, 1.2 Kenapa layer ini dan bukan "fetch langsung di komponen"?, 1. System Architecture, 2.1 Repository (`repositories/*.ts`), 2.2 Service (`services/*.ts`), 2.3 Helper (`src/helpers/*.ts`), 2.4 Hook / Composable (`src/hooks/*.ts`), 2.5 Component & Page (`src/components/`, `src/pages/`) (+15 more)

### Community 21 - "Feature Backlog — TestManager"
Cohesion: 0.06
Nodes (30): 1. Fitur yang sudah selesai, 2. Prioritas P1 — Workflow inti, 3. Prioritas P2 — Reporting dan integrasi, 4. AI Integration, 5. Automation dan Playwright, 6. Administrasi dan kolaborasi, 7. Urutan implementasi yang disarankan, 8. Catatan keputusan teknis (+22 more)

### Community 22 - "Architecture"
Cohesion: 0.22
Nodes (9): Architecture, Auth & RBAC (Google Login), Domain Model — Test Management Workflow, Kenapa tidak ada Controller/API layer?, Konvensi Judul Halaman, Layered structure (`frontend/src/`), Module Creation Order (untuk fitur/modul baru), Naming & Convention (+1 more)

### Community 23 - "AttachmentPanel.tsx"
Cohesion: 0.23
Nodes (14): AttachmentPanel(), AttachmentPanelProps, formatFileSize(), mapAttachmentRow(), useAttachments(), attachmentRepository, findAll(), pathFor() (+6 more)

### Community 25 - "ProjectSettingsPage.tsx"
Cohesion: 0.50
Nodes (3): environments, test_runs, trg_environments_updated_at

### Community 26 - "TestCaseDetailPage.tsx"
Cohesion: 0.20
Nodes (12): api_token_rate_limits, api_tokens, create_api_token(), create_webhook(), queue_issue_webhook(), queue_test_result_webhook(), queue_test_run_webhook(), trg_p2_webhook_issue (+4 more)

### Community 27 - "statusLabels.ts"
Cohesion: 0.09
Nodes (32): AppMenu(), AppMenuitem(), AppMenuSeparator(), MenuItemModel, exportDashboardReportToExcel(), exportDashboardReportToPdf(), safeName(), mapDashboardReportRunRow() (+24 more)

### Community 28 - "schema_entity_codes.sql"
Cohesion: 0.19
Nodes (11): entity_code_sequences, modules, set_module_code(), set_test_case_code(), set_test_plan_code(), test_cases, test_plans, test_runs (+3 more)

### Community 29 - "schema_test_management_v2.sql"
Cohesion: 0.22
Nodes (12): issues, modules, tags, test_case_tags, test_cases, test_plan_cases, test_results, test_runs (+4 more)

### Community 30 - "TASKS — TestManager (shiftech-test-mgr)"
Cohesion: 0.17
Nodes (12): E01 — Fondasi Arsitektur, E02 — Modul Projects, E03 — Modul Test Cases, E04 — Modul Test Plans, E05 — Polish (opsional, sesuai kebutuhan validasi arsitektur), E06 — Auth & RBAC (Google Login + User Management), E07 — Project Lifecycle (search, filter, sort, status, hapus permanen, detail), E08 — Test Management v2 (Module, Tag, Test Run, Test Result, Issue) (+4 more)

### Community 31 - "shiftech-test-mgr (TestManager) — OpenCode Project Rules"
Cohesion: 0.20
Nodes (9): Directory Structure, Domain Model — Test Management Workflow, graphify, Important Commands, Internal Documentation, Key Packages, shiftech-test-mgr (TestManager) — OpenCode Project Rules, Tech Stack (+1 more)

### Community 32 - "FEATURES — Status Checklist"
Cohesion: 0.20
Nodes (10): FEATURES — Status Checklist, Infrastruktur, Issues, Kode Entity (Module, Test Case, Test Plan, Test Run), Modules & Tags, Projects, Test Cases, Test Plans (+2 more)

### Community 33 - "schema_p2_workflow.sql"
Cohesion: 0.29
Nodes (8): audit_logs, notifications, notify_issue_changes(), record_test_case_version(), test_case_versions, test_cases, trg_issue_notifications, trg_test_case_version

### Community 34 - "graphify reference: extra exports and benchmark"
Cohesion: 0.22
Nodes (8): graphify reference: extra exports and benchmark, Step 6b - Wiki (only if --wiki flag), Step 7 - Neo4j export (only if --neo4j or --neo4j-push flag), Step 7a - FalkorDB export (only if --falkordb or --falkordb-push flag), Step 7b - SVG export (only if --svg flag), Step 7c - GraphML export (only if --graphml flag), Step 7d - MCP server (only if --mcp flag), Step 8 - Token reduction benchmark (only if total_words > 5000)

### Community 35 - "graphify reference: extra exports and benchmark"
Cohesion: 0.22
Nodes (8): graphify reference: extra exports and benchmark, Step 6b - Wiki (only if --wiki flag), Step 7 - Neo4j export (only if --neo4j or --neo4j-push flag), Step 7a - FalkorDB export (only if --falkordb or --falkordb-push flag), Step 7b - SVG export (only if --svg flag), Step 7c - GraphML export (only if --graphml flag), Step 7d - MCP server (only if --mcp flag), Step 8 - Token reduction benchmark (only if total_words > 5000)

### Community 36 - "schema.sql"
Cohesion: 0.42
Nodes (8): projects, set_updated_at(), test_cases, test_plan_cases, test_plans, trg_projects_updated_at, trg_test_cases_updated_at, trg_test_plans_updated_at

### Community 37 - "Coding Conventions"
Cohesion: 0.16
Nodes (17): Props, Breadcrumb(), TEST_CASE_PRIORITY_LABEL, TEST_CASE_PRIORITY_SEVERITY, TEST_CASE_STATUS_LABEL, TEST_CASE_STATUS_SEVERITY, PRIORITY_OPTIONS, priorities (+9 more)

### Community 39 - "schema_auth.sql"
Cohesion: 0.43
Nodes (6): handle_new_user(), is_admin(), is_approved(), profiles, trg_on_auth_user_created, trg_profiles_updated_at

### Community 40 - "graphify reference: query, path, explain"
Cohesion: 0.33
Nodes (5): For /graphify explain, For /graphify path, graphify reference: query, path, explain, Step 0 — Constrained query expansion (REQUIRED before traversal), Step 1 — Traversal

### Community 41 - "graphify reference: query, path, explain"
Cohesion: 0.33
Nodes (5): For /graphify explain, For /graphify path, graphify reference: query, path, explain, Step 0 — Constrained query expansion (REQUIRED before traversal), Step 1 — Traversal

### Community 42 - "design-review-test-management-v2.md"
Cohesion: 0.33
Nodes (5): Keputusan yang sudah dikunci, Mengapa berubah, Skema tabel, Urutan pengerjaan yang diusulkan, Yang masih perlu keputusanmu

### Community 43 - "TestManager (shiftech-test-mgr)"
Cohesion: 0.33
Nodes (6): Dokumentasi, Getting Started, Scripts, Stack, Struktur Repo, TestManager (shiftech-test-mgr)

### Community 44 - "schema_013_p1_collaboration.sql"
Cohesion: 0.31
Nodes (6): comment_mentions, comments, set_comment_updated_at(), trg_comments_updated_at, trg_validate_comment_target_project, validate_comment_target_project()

### Community 45 - "schema_project_roles.sql"
Cohesion: 0.60
Nodes (5): can_delete_project_content(), can_edit_project_content(), can_manage_issues(), can_run_tests(), project_members

### Community 46 - "schema_requirement_traceability.sql"
Cohesion: 0.07
Nodes (48): AiAssistantPanel(), AiIssueDraftDialog(), priorities, Props, aiIssueDraftSchema, assistantEntityTypeSchema, assistantMatchSchema, assistantResponseSchema (+40 more)

### Community 47 - "primereact"
Cohesion: 0.25
Nodes (7): @playwright/test, description, devDependencies, @playwright/test, name, private, version

### Community 48 - "react-hook-form"
Cohesion: 0.09
Nodes (42): App(), AdminRoute(), ProtectedRoute(), CommentsPanel(), formatDateTime(), ISSUE_PRIORITY_LABEL, ISSUE_PRIORITY_SEVERITY, ISSUE_STATUS_LABEL (+34 more)

### Community 49 - "schema_011_attachments_archive.sql"
Cohesion: 0.08
Nodes (23): 2026-07-22 — Apply migration P1 dan checklist, 2026-07-22 — Integrasi P1 dan QA final, 2026-07-22 — P1 Duplicate Test Case dan Comment/Mention, 2026-07-22 — P1 Requirement Traceability, 2026-07-22 — P2 API Token dan Webhook (sub-agent 2), 2026-07-22 — P2 Backup/Restore dan Data Retention (sub-agent 4), 2026-07-22 — P2 Integrasi CI/CD (sub-agent 3), 2026-07-22 — P2 Reporting, Integrasi, Backup, Retention, dan QA final (+15 more)

### Community 50 - "schema_project_lifecycle.sql"
Cohesion: 0.60
Nodes (4): is_admin(), is_approved(), profiles, projects

### Community 51 - "TODO — Sprint Board Aktif"
Cohesion: 0.40
Nodes (5): Diblokir, Sedang Dikerjakan, Selesai (recent), Siap Dikerjakan (next up), TODO — Sprint Board Aktif

### Community 52 - "graphify reference: add a URL and watch a folder"
Cohesion: 0.50
Nodes (3): For /graphify add, For --watch, graphify reference: add a URL and watch a folder

### Community 53 - "graphify reference: commit hook and native CLAUDE.md integration"
Cohesion: 0.50
Nodes (3): For git commit hook, For native CLAUDE.md integration, graphify reference: commit hook and native CLAUDE.md integration

### Community 54 - "graphify reference: incremental update and cluster-only"
Cohesion: 0.50
Nodes (3): For --cluster-only, For --update (incremental re-extraction), graphify reference: incremental update and cluster-only

### Community 55 - "graphify reference: add a URL and watch a folder"
Cohesion: 0.50
Nodes (3): For /graphify add, For --watch, graphify reference: add a URL and watch a folder

### Community 56 - "graphify reference: commit hook and native CLAUDE.md integration"
Cohesion: 0.50
Nodes (3): For git commit hook, For native CLAUDE.md integration, graphify reference: commit hook and native CLAUDE.md integration

### Community 57 - "graphify reference: incremental update and cluster-only"
Cohesion: 0.50
Nodes (3): For --cluster-only, For --update (incremental re-extraction), graphify reference: incremental update and cluster-only

### Community 59 - "schema_project_members.sql"
Cohesion: 0.83
Nodes (3): has_project_access(), is_project_manager(), project_members

### Community 69 - "backupRetentionRepository.ts"
Cohesion: 0.14
Nodes (20): mapRestorePreviewRow(), mapRestoreResultRow(), mapRetentionCleanupPreviewRow(), mapRetentionCleanupResultRow(), mapRetentionPolicyRow(), backup(), backupRetentionRepository, cleanup() (+12 more)

### Community 70 - "CLAUDE.md"
Cohesion: 0.10
Nodes (37): AiTestCaseGeneratorDialog(), maxCaseOptions, priorityOptions, ReviewDraft, AiTestCaseResponseSchema, AiTestCaseSchema, AiTestCaseValidationError, AiTestCaseValidationResult (+29 more)

### Community 71 - "schema_020_p2_cicd.sql"
Cohesion: 0.43
Nodes (7): cicd_ingest_attempts, cicd_pipelines, create_cicd_pipeline(), test_runs, trg_cicd_pipeline_plan, trg_cicd_pipelines_updated_at, validate_cicd_pipeline_plan()

### Community 72 - "package.json"
Cohesion: 0.22
Nodes (12): mapCicdPipelineRow(), useCicdPipelines(), useTestPlans(), CicdIntegrationPage(), providerOptions, cicdRepository, cicdService, CicdIngestPayload (+4 more)

### Community 76 - "scripts"
Cohesion: 0.14
Nodes (13): ActionOutput, ProviderAction, AiProvider, createProvider(), fetchJson(), GeminiProvider, jsonObjectFromPrompt(), MockProvider (+5 more)

### Community 79 - "primeflex"
Cohesion: 0.17
Nodes (14): exportTestRunsToExcel(), exportTestRunsToPdf(), fileName(), TestRunExportRow, useDashboard(), useProjectContext(), downloadCsv(), HomePage() (+6 more)

### Community 80 - "contract.ts"
Cohesion: 0.11
Nodes (19): AnalysisOutputSchema, AnalysisRequest, AssistantOutputSchema, AssistantRequest, computeDuplicateConfidence(), DuplicateOutputSchema, DuplicateRequest, GenerateOutputSchema (+11 more)

### Community 81 - "primereact"
Cohesion: 0.16
Nodes (16): ISSUE_STATUS_SEVERITY, PROJECT_MEMBER_ROLE_SEVERITY, TagSeverity, TEST_PLAN_STATUS_LABEL, TEST_PLAN_STATUS_SEVERITY, TEST_RESULT_STATUS_LABEL, TEST_RESULT_STATUS_SEVERITY, TEST_RUN_STATUS_LABEL (+8 more)

### Community 82 - "Coding Conventions"
Cohesion: 0.24
Nodes (13): mapProjectRow(), ProjectContext, ProjectContextValue, ProjectProvider(), STATUS_OPTIONS, ProjectQuery, projectRepository, SORT_COLUMN (+5 more)

### Community 83 - "handler.ts"
Cohesion: 0.18
Nodes (19): canonicalAction, ErrorEnvelope, GatewayRequest, requestInput(), RequestSchema, SuccessEnvelope, analysisResponse(), completeWithRetry() (+11 more)

### Community 85 - "testRunRepository.ts"
Cohesion: 0.16
Nodes (14): mapTestCaseVersionRow(), mapTestPlanCaseRow(), mapTestRunAssignmentRow(), mapTestRunRow(), EMPTY_FILTERS, TestRunWithSummary, testCaseRepository, TestRunFilters (+6 more)

### Community 86 - "security.ts"
Cohesion: 0.17
Nodes (11): GatewayErrorCode, allowedOrigin(), authenticate(), corsHeaders(), envNumber(), GatewayHttpError, getBearerToken(), InMemoryRateLimiter (+3 more)

### Community 87 - "CLAUDE.md"
Cohesion: 0.22
Nodes (8): Commands, Database (Supabase), Development, Dokumentasi Tambahan, Project Overview, Struktur repo, Wajib Menggunakan Graphify, Worklog Wajib

### Community 88 - "Kontrak Integrasi CI/CD"
Cohesion: 0.50
Nodes (3): Batasan deployment, Ingest, Kontrak Integrasi CI/CD

### Community 89 - "contract.test.ts"
Cohesion: 0.25
Nodes (10): useAutomation(), AutomationPage(), jobSeverity, runnerOnline(), automationRepository, automationService, AutomationJob, AutomationRunner (+2 more)

### Community 90 - "AI Gateway Edge Function"
Cohesion: 0.50
Nodes (3): AI Gateway Edge Function, Local, Secret/config

### Community 91 - "ProjectsPage.tsx"
Cohesion: 0.18
Nodes (11): automation_jobs, automation_runners, automation_scripts, enqueue_automation_jobs(), poll_automation_job(), report_automation_job(), trg_automation_jobs_updated_at, trg_automation_runners_updated_at (+3 more)

### Community 92 - "UserManagementPage.tsx"
Cohesion: 0.25
Nodes (8): Architecture Pattern (WAJIB diikuti, urutan layer tidak boleh dilompati), Auth & RBAC, Coding Conventions, Data Mapping, Judul Halaman (`PageHeader`), Module Creation Order (fitur/modul baru), Naming, PrimeReact Usage

### Community 93 - "domain.ts"
Cohesion: 0.33
Nodes (6): scripts, build, dev, lint, preview, test

### Community 94 - "dashboardReportRepository.ts"
Cohesion: 0.40
Nodes (4): name, private, type, version

### Community 95 - "supabaseClient.ts"
Cohesion: 0.18
Nodes (15): mapAutomationJobRow(), mapAutomationRunnerRow(), mapAutomationScriptRow(), mapCommentMentionRow(), mapCommentRow(), mapProfileRow(), mapProjectMemberRow(), mapProjectMemberWithProfileRow() (+7 more)

### Community 97 - "package.json"
Cohesion: 0.43
Nodes (4): mapEnvironmentRow(), environmentRepository, environmentService, Environment

### Community 98 - "scripts"
Cohesion: 0.10
Nodes (27): ApiError, AutomationApi, AutomationJob, JobResult, ReportArtifact, ReportPayload, classify(), collectArtifacts() (+19 more)

### Community 99 - "primeflex"
Cohesion: 0.10
Nodes (19): src/**/*.ts, compilerOptions, declaration, esModuleInterop, forceConsistentCasingInFileNames, lib, module, moduleResolution (+11 more)

### Community 101 - "primereact"
Cohesion: 0.10
Nodes (19): bin, tm-runner, description, devDependencies, @types/node, typescript, engines, node (+11 more)

### Community 102 - "ProjectsPage.tsx"
Cohesion: 0.20
Nodes (11): BulkActionsBar(), BulkActionsBarProps, PROJECT_MEMBER_ROLE_LABEL, PROJECT_STATUS_LABEL, PROJECT_STATUS_SEVERITY, MEMBER_ROLE_OPTIONS, projectMemberRepository, projectMemberService (+3 more)

### Community 103 - "domain.ts"
Cohesion: 0.40
Nodes (4): Error details, Instructions, Test info, Test source

### Community 104 - "AppMenu.tsx"
Cohesion: 0.40
Nodes (4): Error details, Instructions, Test info, Test source

### Community 106 - "AI Integration"
Cohesion: 0.29
Nodes (6): AI Integration, Fitur dan contract, Local development, Mengganti provider, Secret Edge Function, Security dan privacy

### Community 117 - "schema_028_webhook_dispatch.sql"
Cohesion: 0.38
Nodes (3): dispatch_pending_webhooks(), reconcile_webhook_deliveries(), webhook_deliveries

## Knowledge Gaps
- **535 isolated node(s):** `supabase`, `$schema`, `typescript`, `oxc`, `react/rules-of-hooks` (+530 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **23 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `useAiAssistant()` connect `schema_requirement_traceability.sql` to `react-hook-form`, `handler.ts`, `primeflex`?**
  _High betweenness centrality (0.037) - this node is a cross-community bridge._
- **Why does `dependencies` connect `Community 4` to `primeicons`, `Community 7`, `primeicons`, `react-router-dom`, `primereact`, `@tanstack/react-query`, `dashboardReportRepository.ts`?**
  _High betweenness centrality (0.033) - this node is a cross-community bridge._
- **Why does `query()` connect `handler.ts` to `schema_requirement_traceability.sql`?**
  _High betweenness centrality (0.032) - this node is a cross-community bridge._
- **What connects `supabase`, `$schema`, `typescript` to the rest of the system?**
  _535 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.12413793103448276 - nodes in this community are weakly interconnected._
- **Should `Community 4` be split into smaller, more focused modules?**
  _Cohesion score 0.11764705882352941 - nodes in this community are weakly interconnected._
- **Should `Community 5` be split into smaller, more focused modules?**
  _Cohesion score 0.08246225319396051 - nodes in this community are weakly interconnected._