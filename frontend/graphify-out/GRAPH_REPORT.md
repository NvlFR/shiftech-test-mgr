# Graph Report - frontend  (2026-07-26)

## Corpus Check
- 145 files · ~50,750 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 728 nodes · 2060 edges · 31 communities (26 shown, 5 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 16 edges (avg confidence: 0.5)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `f9ad9436`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- ProjectDetailPage.tsx
- react
- ProjectsPage.tsx
- aiTestCaseParser.ts
- backupRetentionRepository.ts
- DashboardReportPage.tsx
- compilerOptions
- aiTestRunAnalysis.ts
- useTheme.tsx
- domain.ts
- compilerOptions
- HomePage.tsx
- scripts
- AttachmentPanel.tsx
- TestPlanDetailPage.tsx
- dependencies
- devDependencies
- react-dom
- package.json
- plugins
- CicdIntegrationPage.tsx
- react-hook-form
- RequirementsPage.tsx
- aiIssueService.ts
- tsconfig.json
- @hookform/resolvers
- supabaseClient.ts
- primeflex
- jspdf-autotable
- react

## God Nodes (most connected - your core abstractions)
1. `react` - 63 edges
2. `useAuthContext()` - 35 edges
3. `supabase` - 27 edges
4. `useProjectRole()` - 26 edges
5. `compilerOptions` - 18 edges
6. `formatDateTime()` - 16 edges
7. `TestCaseWithDetails` - 16 edges
8. `Profile` - 15 edges
9. `compilerOptions` - 15 edges
10. `useProjectContext()` - 13 edges

## Surprising Connections (you probably didn't know these)
- `exportDashboardReportToPdf()` --references--> `jspdf`  [EXTRACTED]
  src/helpers/dashboardReportExporter.ts → package.json
- `parseRequirementFile()` --references--> `xlsx`  [EXTRACTED]
  src/helpers/aiTestCaseParser.ts → package.json
- `exportDashboardReportToExcel()` --references--> `xlsx`  [EXTRACTED]
  src/helpers/dashboardReportExporter.ts → package.json
- `parseTestCaseExcel()` --references--> `xlsx`  [EXTRACTED]
  src/helpers/testCaseExcel.ts → package.json
- `exportTestCasesToPdf()` --references--> `jspdf`  [EXTRACTED]
  src/helpers/pdfExporter.ts → package.json

## Import Cycles
- None detected.

## Communities (31 total, 5 thin omitted)

### Community 0 - "ProjectDetailPage.tsx"
Cohesion: 0.05
Nodes (69): Props, BulkActionsBar(), BulkActionsBarProps, RowActionsMenu(), RowActionsMenuProps, mapTestPlanRow(), ISSUE_STATUS_SEVERITY, PROJECT_MEMBER_ROLE_LABEL (+61 more)

### Community 1 - "react"
Cohesion: 0.07
Nodes (55): react, AdminRoute(), ProtectedRoute(), useBreadcrumbContext(), Breadcrumb(), BreadcrumbItem, BreadcrumbProps, CommentsPanel() (+47 more)

### Community 2 - "ProjectsPage.tsx"
Cohesion: 0.10
Nodes (24): AppLayout(), AppLayoutInner(), AppMenu(), AppMenuitem(), AppMenuSeparator(), MenuItemModel, AppSidebar(), AppSidebarMask() (+16 more)

### Community 3 - "aiTestCaseParser.ts"
Cohesion: 0.10
Nodes (37): AiTestCaseGeneratorDialog(), maxCaseOptions, priorityOptions, ReviewDraft, AiTestCaseResponseSchema, AiTestCaseSchema, AiTestCaseValidationError, AiTestCaseValidationResult (+29 more)

### Community 4 - "backupRetentionRepository.ts"
Cohesion: 0.21
Nodes (16): mapRestorePreviewRow(), mapRestoreResultRow(), mapRetentionCleanupPreviewRow(), mapRetentionCleanupResultRow(), mapRetentionPolicyRow(), backup(), cleanup(), cleanupPreview() (+8 more)

### Community 5 - "DashboardReportPage.tsx"
Cohesion: 0.09
Nodes (31): exportDashboardReportToExcel(), exportDashboardReportToPdf(), safeName(), mapDashboardReportRunRow(), useDashboardReport(), useProfiles(), useProjects(), ALL (+23 more)

### Community 6 - "compilerOptions"
Cohesion: 0.08
Nodes (23): DOM, src, vite/client, compilerOptions, allowArbitraryExtensions, allowImportingTsExtensions, erasableSyntaxOnly, jsx (+15 more)

### Community 7 - "aiTestRunAnalysis.ts"
Cohesion: 0.10
Nodes (23): riskLabel, riskSeverity, TestRunAnalysisPanel(), TestRunAnalysisPanelProps, AiTestRunAnalysisResponseContract, aiTestRunAnalysisResponseSchema, failurePatternSchema, parseAiTestRunAnalysisResponse() (+15 more)

### Community 8 - "useTheme.tsx"
Cohesion: 0.17
Nodes (14): App(), MODE_ICON, ThemeToggle(), AuthProvider(), applyTheme(), getSystemPrefersDark(), resolve(), THEME_HREF (+6 more)

### Community 9 - "domain.ts"
Cohesion: 0.14
Nodes (23): mapApiTokenRow(), mapWebhookDeliveryRow(), mapWebhookRow(), useIntegrations(), eventOptions, IntegrationsPage(), scopeOptions, integrationRepository (+15 more)

### Community 10 - "compilerOptions"
Cohesion: 0.10
Nodes (19): node, vite.config.ts, compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection (+11 more)

### Community 11 - "HomePage.tsx"
Cohesion: 0.10
Nodes (28): jspdf, jspdf, xlsx, formatDate(), downloadTestCaseImportTemplate(), exportTestCasesToExcel(), exportTestCasesToPdf(), exportTestRunsToExcel() (+20 more)

### Community 12 - "scripts"
Cohesion: 0.33
Nodes (6): scripts, build, dev, lint, preview, test

### Community 13 - "AttachmentPanel.tsx"
Cohesion: 0.23
Nodes (14): AttachmentPanel(), AttachmentPanelProps, formatFileSize(), mapAttachmentRow(), useAttachments(), attachmentRepository, findAll(), pathFor() (+6 more)

### Community 14 - "TestPlanDetailPage.tsx"
Cohesion: 0.21
Nodes (11): mapTestRunAssignmentRow(), mapTestRunRow(), EMPTY_FILTERS, TestRunWithSummary, testCaseRepository, testResultRepository, TestRunFilters, testRunRepository (+3 more)

### Community 15 - "dependencies"
Cohesion: 0.12
Nodes (17): dependencies, primeicons, react, react-dom, react-hook-form, react-router-dom, @supabase/supabase-js, @tanstack/react-query (+9 more)

### Community 16 - "devDependencies"
Cohesion: 0.12
Nodes (17): oxlint, devDependencies, oxlint, @types/node, @types/react, @types/react-dom, typescript, vite (+9 more)

### Community 17 - "react-dom"
Cohesion: 0.15
Nodes (23): mapCommentMentionRow(), mapCommentRow(), mapIssueRow(), mapModuleRow(), mapProfileRow(), mapProjectMemberRow(), mapProjectMemberWithProfileRow(), mapProjectRow() (+15 more)

### Community 18 - "package.json"
Cohesion: 0.40
Nodes (4): name, private, type, version

### Community 19 - "plugins"
Cohesion: 0.22
Nodes (8): plugins, rules, react/only-export-components, react/rules-of-hooks, $schema, oxc, typescript, warn

### Community 20 - "CicdIntegrationPage.tsx"
Cohesion: 0.22
Nodes (12): mapCicdPipelineRow(), useCicdPipelines(), useTestPlans(), CicdIntegrationPage(), providerOptions, cicdRepository, cicdService, CicdIngestPayload (+4 more)

### Community 21 - "react-hook-form"
Cohesion: 0.17
Nodes (15): mapAutomationJobRow(), mapAutomationRunnerRow(), mapAutomationScriptRow(), useAutomation(), AutomationPage(), jobSeverity, runnerOnline(), automationRepository (+7 more)

### Community 22 - "RequirementsPage.tsx"
Cohesion: 0.17
Nodes (17): mapRequirementLinkRow(), mapRequirementRow(), useRequirements(), Option, PRIORITIES, RequirementsPage(), STATUSES, TYPES (+9 more)

### Community 23 - "aiIssueService.ts"
Cohesion: 0.07
Nodes (44): AiAssistantPanel(), AiIssueDraftDialog(), priorities, Props, aiIssueDraftSchema, assistantEntityTypeSchema, assistantMatchSchema, assistantResponseSchema (+36 more)

### Community 26 - "supabaseClient.ts"
Cohesion: 0.18
Nodes (10): supabase, mapEnvironmentRow(), environmentRepository, issueAttachmentRepository, mapRow(), withSignedUrl(), profileRepository, issueAttachmentService (+2 more)

## Knowledge Gaps
- **163 isolated node(s):** `$schema`, `typescript`, `oxc`, `react/rules-of-hooks`, `warn` (+158 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `dependencies` connect `dependencies` to `HomePage.tsx`, `package.json`, `@hookform/resolvers`, `primeflex`, `jspdf-autotable`, `react`?**
  _High betweenness centrality (0.127) - this node is a cross-community bridge._
- **Why does `react` connect `react` to `ProjectDetailPage.tsx`, `ProjectsPage.tsx`, `aiTestCaseParser.ts`, `DashboardReportPage.tsx`, `useTheme.tsx`, `domain.ts`, `HomePage.tsx`, `AttachmentPanel.tsx`, `TestPlanDetailPage.tsx`, `plugins`, `CicdIntegrationPage.tsx`, `react-hook-form`, `RequirementsPage.tsx`, `aiIssueService.ts`?**
  _High betweenness centrality (0.108) - this node is a cross-community bridge._
- **Why does `xlsx` connect `HomePage.tsx` to `ProjectDetailPage.tsx`, `aiTestCaseParser.ts`, `DashboardReportPage.tsx`, `dependencies`?**
  _High betweenness centrality (0.091) - this node is a cross-community bridge._
- **What connects `$schema`, `typescript`, `oxc` to the rest of the system?**
  _163 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `ProjectDetailPage.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.05 - nodes in this community are weakly interconnected._
- **Should `react` be split into smaller, more focused modules?**
  _Cohesion score 0.06788128122245078 - nodes in this community are weakly interconnected._
- **Should `ProjectsPage.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.10338680926916222 - nodes in this community are weakly interconnected._