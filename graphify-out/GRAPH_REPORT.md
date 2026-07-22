# Graph Report - shiftech-test-mgr  (2026-07-22)

## Corpus Check
- 174 files · ~91,732 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1023 nodes · 2095 edges · 85 communities (70 shown, 15 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 12 edges (avg confidence: 0.5)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `c33cb41f`
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
- primereact
- Coding Conventions
- testRunRepository.ts
- Kontrak Integrasi CI/CD

## God Nodes (most connected - your core abstractions)
1. `react` - 54 edges
2. `useAuthContext()` - 29 edges
3. `useProjectRole()` - 24 edges
4. `supabase` - 23 edges
5. `2026-07-22` - 23 edges
6. `compilerOptions` - 18 edges
7. `formatDateTime()` - 16 edges
8. `Profile` - 15 edges
9. `compilerOptions` - 15 edges
10. `profileService` - 12 edges

## Surprising Connections (you probably didn't know these)
- `exportDashboardReportToPdf()` --references--> `jspdf`  [EXTRACTED]
  frontend/src/helpers/dashboardReportExporter.ts → frontend/package.json
- `exportDashboardReportToExcel()` --references--> `xlsx`  [EXTRACTED]
  frontend/src/helpers/dashboardReportExporter.ts → frontend/package.json
- `exportTestRunsToExcel()` --references--> `xlsx`  [EXTRACTED]
  frontend/src/helpers/testRunExporter.ts → frontend/package.json
- `AppLayoutInner()` --calls--> `useLayoutContext()`  [EXTRACTED]
  frontend/src/components/layout/AppLayout.tsx → frontend/src/components/layout/LayoutContext.tsx
- `AppMenu()` --calls--> `useAuthContext()`  [EXTRACTED]
  frontend/src/components/layout/AppMenu.tsx → frontend/src/hooks/useAuth.tsx

## Import Cycles
- None detected.

## Communities (85 total, 15 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.53
Nodes (5): requirement_links, requirements, trg_requirements_updated_at, trg_validate_requirement_link_project, validate_requirement_link_project()

### Community 1 - "Community 1"
Cohesion: 0.17
Nodes (17): mapApiTokenRow(), mapWebhookDeliveryRow(), mapWebhookRow(), useIntegrations(), eventOptions, IntegrationsPage(), scopeOptions, integrationRepository (+9 more)

### Community 2 - "Community 2"
Cohesion: 0.17
Nodes (19): AdminRoute(), ProtectedRoute(), formatDate(), useAuthContext(), useBackupRetention(), useIssuesByTestRun(), useProjectRole(), useTestRunDetail() (+11 more)

### Community 3 - "Community 3"
Cohesion: 0.14
Nodes (20): supabase, mapCommentMentionRow(), mapCommentRow(), mapEnvironmentRow(), mapNotificationRow(), mapProfileRow(), mapProjectMemberRow(), mapProjectMemberWithProfileRow() (+12 more)

### Community 4 - "Community 4"
Cohesion: 0.06
Nodes (34): dependencies, @hookform/resolvers, jspdf-autotable, primeflex, primeicons, primereact, react, react-dom (+26 more)

### Community 5 - "Community 5"
Cohesion: 0.08
Nodes (38): AppLayout(), AppLayoutInner(), AppMenu(), AppMenuitem(), AppMenuSeparator(), MenuItemModel, AppSidebar(), AppSidebarMask() (+30 more)

### Community 6 - "Community 6"
Cohesion: 0.08
Nodes (24): devDependencies, oxlint, @types/node, @types/react, @types/react-dom, typescript, vite, @vitejs/plugin-react (+16 more)

### Community 7 - "Community 7"
Cohesion: 0.10
Nodes (27): TEST_CASE_PRIORITY_LABEL, TEST_CASE_STATUS_LABEL, TEST_CASE_STATUS_SEVERITY, ISSUE_PRIORITY_OPTIONS, ISSUE_STATUS_OPTIONS, PRIORITY_OPTIONS, projectCache, ProjectTabData (+19 more)

### Community 8 - "Community 8"
Cohesion: 0.08
Nodes (23): compilerOptions, allowArbitraryExtensions, allowImportingTsExtensions, erasableSyntaxOnly, jsx, lib, module, moduleDetection (+15 more)

### Community 9 - "Community 9"
Cohesion: 0.14
Nodes (17): jspdf, exportTestCasesToPdf(), exportTestRunsToExcel(), exportTestRunsToPdf(), fileName(), TestRunExportRow, useDashboard(), useProjectContext() (+9 more)

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
Cohesion: 0.06
Nodes (33): 2026-07-22, 2026-07-22 — Apply migration P1 dan checklist, 2026-07-22 — Integrasi P1 dan QA final, 2026-07-22 — P1 Duplicate Test Case dan Comment/Mention, 2026-07-22 — P1 Requirement Traceability, 2026-07-22 — P2 API Token dan Webhook (sub-agent 2), 2026-07-22 — P2 Backup/Restore dan Data Retention (sub-agent 4), 2026-07-22 — P2 Integrasi CI/CD (sub-agent 3) (+25 more)

### Community 20 - "ARCHITECTURE — TestManager (shiftech-test-mgr)"
Cohesion: 0.09
Nodes (23): 1.1 Architectural Style, 1.2 Kenapa layer ini dan bukan "fetch langsung di komponen"?, 1. System Architecture, 2.1 Repository (`repositories/*.ts`), 2.2 Service (`services/*.ts`), 2.3 Helper (`src/helpers/*.ts`), 2.4 Hook / Composable (`src/hooks/*.ts`), 2.5 Component & Page (`src/components/`, `src/pages/`) (+15 more)

### Community 21 - "Feature Backlog — TestManager"
Cohesion: 0.10
Nodes (19): 1. Fitur yang sudah selesai, 2. Prioritas P1 — Workflow inti, 3. Prioritas P2 — Reporting dan integrasi, 4. AI Integration, 5. Automation dan Playwright, 6. Administrasi dan kolaborasi, 7. Urutan implementasi yang disarankan, 8. Catatan keputusan teknis (+11 more)

### Community 22 - "Architecture"
Cohesion: 0.11
Nodes (17): Architecture, Auth & RBAC (Google Login), Commands, Database (Supabase), Development, Dokumentasi Tambahan, Domain Model — Test Management Workflow, Kenapa tidak ada Controller/API layer? (+9 more)

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
Cohesion: 0.11
Nodes (25): exportDashboardReportToExcel(), exportDashboardReportToPdf(), safeName(), mapDashboardReportRunRow(), useDashboardReport(), useEnvironments(), useProjects(), ALL (+17 more)

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
Cohesion: 0.52
Nodes (4): commentRepository, commentService, Comment, CommentTargetType

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
Cohesion: 0.24
Nodes (9): mapIssueRow(), mapModuleRow(), mapTagRow(), issueRepository, mapTestCaseSummary(), issueService, Issue, IssuePriority (+1 more)

### Community 47 - "primereact"
Cohesion: 0.17
Nodes (14): App(), MODE_ICON, ThemeToggle(), AuthProvider(), applyTheme(), getSystemPrefersDark(), resolve(), THEME_HREF (+6 more)

### Community 48 - "react-hook-form"
Cohesion: 0.12
Nodes (24): PageHeader(), PageHeaderProps, RowActionsMenu(), RowActionsMenuProps, ISSUE_PRIORITY_LABEL, ISSUE_PRIORITY_SEVERITY, ISSUE_STATUS_LABEL, ISSUE_STATUS_SEVERITY (+16 more)

### Community 49 - "schema_011_attachments_archive.sql"
Cohesion: 0.38
Nodes (5): issueAttachmentRepository, mapRow(), withSignedUrl(), issueAttachmentService, IssueAttachment

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
Cohesion: 0.21
Nodes (12): mapTestCaseVersionRow(), mapTestPlanCaseRow(), TestCaseDetail, CicdIngestResultInput, CicdIngestStatus, RequirementCoverage, TestCase, TestCaseVersion (+4 more)

### Community 71 - "schema_020_p2_cicd.sql"
Cohesion: 0.43
Nodes (7): cicd_ingest_attempts, cicd_pipelines, create_cicd_pipeline(), test_runs, trg_cicd_pipeline_plan, trg_cicd_pipelines_updated_at, validate_cicd_pipeline_plan()

### Community 72 - "package.json"
Cohesion: 0.22
Nodes (12): mapCicdPipelineRow(), useCicdPipelines(), useTestPlans(), CicdIntegrationPage(), providerOptions, cicdRepository, cicdService, CicdIngestPayload (+4 more)

### Community 76 - "scripts"
Cohesion: 0.27
Nodes (8): BulkActionsBar(), BulkActionsBarProps, useTestPlanDetail(), useTestRuns(), PRIORITY_OPTIONS, TEST_PLAN_STATUS_OPTIONS, TEST_RUN_STATUS_OPTIONS, TestPlanDetailPage()

### Community 79 - "primeflex"
Cohesion: 0.23
Nodes (10): Breadcrumb(), PROJECT_MEMBER_ROLE_LABEL, PROJECT_STATUS_LABEL, PROJECT_STATUS_SEVERITY, MEMBER_ROLE_OPTIONS, projectMemberRepository, projectMemberService, ProjectMember (+2 more)

### Community 81 - "primereact"
Cohesion: 0.22
Nodes (16): CommentsPanel(), formatDateTime(), USER_ROLE_LABEL, USER_ROLE_SEVERITY, AuthContext, AuthContextValue, useComments(), useProfiles() (+8 more)

### Community 82 - "Coding Conventions"
Cohesion: 0.25
Nodes (8): Architecture Pattern (WAJIB diikuti, urutan layer tidak boleh dilompati), Auth & RBAC, Coding Conventions, Data Mapping, Judul Halaman (`PageHeader`), Module Creation Order (fitur/modul baru), Naming, PrimeReact Usage

### Community 85 - "testRunRepository.ts"
Cohesion: 0.20
Nodes (12): mapTestRunAssignmentRow(), mapTestRunRow(), Summary, EMPTY_FILTERS, TestRunWithSummary, testCaseRepository, TestRunFilters, testRunRepository (+4 more)

### Community 88 - "Kontrak Integrasi CI/CD"
Cohesion: 0.50
Nodes (3): Batasan deployment, Ingest, Kontrak Integrasi CI/CD

## Knowledge Gaps
- **396 isolated node(s):** `$schema`, `typescript`, `oxc`, `react/rules-of-hooks`, `warn` (+391 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **15 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `dependencies` connect `Community 4` to `Community 9`, `Community 6`?**
  _High betweenness centrality (0.049) - this node is a cross-community bridge._
- **Why does `react` connect `primereact` to `Community 1`, `Community 2`, `Community 5`, `backupRetentionRepository.ts`, `Coding Conventions`, `package.json`, `Community 9`, `Community 7`, `scripts`, `Community 12`, `schema_requirement_traceability.sql`, `primereact`, `react-hook-form`, `primeflex`, `Community 13`, `testRunRepository.ts`, `AttachmentPanel.tsx`, `statusLabels.ts`?**
  _High betweenness centrality (0.043) - this node is a cross-community bridge._
- **Why does `xlsx` connect `Community 4` to `Community 9`, `statusLabels.ts`?**
  _High betweenness centrality (0.030) - this node is a cross-community bridge._
- **What connects `$schema`, `typescript`, `oxc` to the rest of the system?**
  _396 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 3` be split into smaller, more focused modules?**
  _Cohesion score 0.14153846153846153 - nodes in this community are weakly interconnected._
- **Should `Community 4` be split into smaller, more focused modules?**
  _Cohesion score 0.06190476190476191 - nodes in this community are weakly interconnected._
- **Should `Community 5` be split into smaller, more focused modules?**
  _Cohesion score 0.07692307692307693 - nodes in this community are weakly interconnected._