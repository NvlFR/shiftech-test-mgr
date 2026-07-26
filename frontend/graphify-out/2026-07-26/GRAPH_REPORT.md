# Graph Report - frontend  (2026-07-26)

## Corpus Check
- 137 files · ~46,680 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 694 nodes · 1943 edges · 28 communities (22 shown, 6 thin omitted)
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
- aiIssueService.ts
- tsconfig.json
- @hookform/resolvers
- primeflex
- react

## God Nodes (most connected - your core abstractions)
1. `react` - 59 edges
2. `useAuthContext()` - 33 edges
3. `supabase` - 26 edges
4. `useProjectRole()` - 24 edges
5. `compilerOptions` - 18 edges
6. `formatDateTime()` - 16 edges
7. `TestCaseWithDetails` - 16 edges
8. `Profile` - 15 edges
9. `compilerOptions` - 15 edges
10. `useProjectContext()` - 13 edges

## Surprising Connections (you probably didn't know these)
- `exportDashboardReportToPdf()` --references--> `jspdf`  [EXTRACTED]
  src/helpers/dashboardReportExporter.ts → package.json
- `exportTestCasesToPdf()` --references--> `jspdf`  [EXTRACTED]
  src/helpers/pdfExporter.ts → package.json
- `parseRequirementFile()` --references--> `xlsx`  [EXTRACTED]
  src/helpers/aiTestCaseParser.ts → package.json
- `exportDashboardReportToExcel()` --references--> `xlsx`  [EXTRACTED]
  src/helpers/dashboardReportExporter.ts → package.json
- `exportTestRunsToExcel()` --references--> `xlsx`  [EXTRACTED]
  src/helpers/testRunExporter.ts → package.json

## Import Cycles
- None detected.

## Communities (28 total, 6 thin omitted)

### Community 0 - "ProjectDetailPage.tsx"
Cohesion: 0.05
Nodes (65): xlsx, AiTestCaseGeneratorDialog(), maxCaseOptions, priorityOptions, Props, BulkActionsBar(), BulkActionsBarProps, toAiTestCaseSource() (+57 more)

### Community 1 - "react"
Cohesion: 0.09
Nodes (40): react, App(), AdminRoute(), ProtectedRoute(), CommentsPanel(), formatDate(), formatDateTime(), USER_ROLE_LABEL (+32 more)

### Community 2 - "ProjectsPage.tsx"
Cohesion: 0.08
Nodes (39): AppLayout(), AppLayoutInner(), AppMenu(), AppMenuitem(), AppMenuSeparator(), MenuItemModel, AppSidebar(), AppSidebarMask() (+31 more)

### Community 3 - "aiTestCaseParser.ts"
Cohesion: 0.11
Nodes (30): ReviewDraft, AiTestCaseResponseSchema, AiTestCaseSchema, AiTestCaseValidationError, AiTestCaseValidationResult, asList(), asSteps(), asText() (+22 more)

### Community 4 - "backupRetentionRepository.ts"
Cohesion: 0.18
Nodes (18): mapRestorePreviewRow(), mapRestoreResultRow(), mapRetentionCleanupPreviewRow(), mapRetentionCleanupResultRow(), mapRetentionPolicyRow(), backup(), backupRetentionRepository, cleanup() (+10 more)

### Community 5 - "DashboardReportPage.tsx"
Cohesion: 0.12
Nodes (24): exportDashboardReportToExcel(), exportDashboardReportToPdf(), safeName(), mapDashboardReportRunRow(), useDashboardReport(), useEnvironments(), useProjects(), ALL (+16 more)

### Community 6 - "compilerOptions"
Cohesion: 0.08
Nodes (23): DOM, src, vite/client, compilerOptions, allowArbitraryExtensions, allowImportingTsExtensions, erasableSyntaxOnly, jsx (+15 more)

### Community 7 - "aiTestRunAnalysis.ts"
Cohesion: 0.11
Nodes (23): riskLabel, riskSeverity, TestRunAnalysisPanel(), TestRunAnalysisPanelProps, AiTestRunAnalysisResponseContract, aiTestRunAnalysisResponseSchema, failurePatternSchema, parseAiTestRunAnalysisResponse() (+15 more)

### Community 8 - "useTheme.tsx"
Cohesion: 0.23
Nodes (11): MODE_ICON, ThemeToggle(), applyTheme(), getSystemPrefersDark(), resolve(), THEME_HREF, ThemeContext, ThemeContextValue (+3 more)

### Community 9 - "domain.ts"
Cohesion: 0.05
Nodes (72): supabase, mapApiTokenRow(), mapCommentMentionRow(), mapCommentRow(), mapEnvironmentRow(), mapIssueRow(), mapModuleRow(), mapNotificationRow() (+64 more)

### Community 10 - "compilerOptions"
Cohesion: 0.10
Nodes (19): node, vite.config.ts, compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection (+11 more)

### Community 11 - "HomePage.tsx"
Cohesion: 0.16
Nodes (14): jspdf, jspdf, exportTestRunsToExcel(), exportTestRunsToPdf(), fileName(), TestRunExportRow, useDashboard(), downloadCsv() (+6 more)

### Community 12 - "scripts"
Cohesion: 0.40
Nodes (5): scripts, build, dev, lint, preview

### Community 13 - "AttachmentPanel.tsx"
Cohesion: 0.23
Nodes (14): AttachmentPanel(), AttachmentPanelProps, formatFileSize(), mapAttachmentRow(), useAttachments(), attachmentRepository, findAll(), pathFor() (+6 more)

### Community 14 - "TestPlanDetailPage.tsx"
Cohesion: 0.07
Nodes (42): PageHeader(), PageHeaderProps, RowActionsMenu(), RowActionsMenuProps, mapTestPlanRow(), mapTestRunAssignmentRow(), mapTestRunRow(), TEST_PLAN_STATUS_LABEL (+34 more)

### Community 15 - "dependencies"
Cohesion: 0.13
Nodes (15): jspdf-autotable, dependencies, jspdf-autotable, primeicons, primereact, react-router-dom, @supabase/supabase-js, @tanstack/react-query (+7 more)

### Community 16 - "devDependencies"
Cohesion: 0.13
Nodes (15): oxlint, devDependencies, oxlint, @types/node, @types/react, @types/react-dom, typescript, vite (+7 more)

### Community 18 - "package.json"
Cohesion: 0.40
Nodes (4): name, private, type, version

### Community 19 - "plugins"
Cohesion: 0.22
Nodes (8): plugins, rules, react/only-export-components, react/rules-of-hooks, $schema, oxc, typescript, warn

### Community 20 - "CicdIntegrationPage.tsx"
Cohesion: 0.22
Nodes (12): mapCicdPipelineRow(), useCicdPipelines(), useTestPlans(), CicdIntegrationPage(), providerOptions, cicdRepository, cicdService, CicdIngestPayload (+4 more)

### Community 23 - "aiIssueService.ts"
Cohesion: 0.09
Nodes (40): aiIssueDraftSchema, assistantEntityTypeSchema, assistantMatchSchema, assistantResponseSchema, buildDuplicateReason(), calculateDuplicateConfidence(), duplicateCandidateSchema, duplicateResponseSchema (+32 more)

## Knowledge Gaps
- **157 isolated node(s):** `$schema`, `typescript`, `oxc`, `react/rules-of-hooks`, `warn` (+152 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `dependencies` connect `dependencies` to `ProjectDetailPage.tsx`, `HomePage.tsx`, `react-dom`, `package.json`, `react-hook-form`, `@hookform/resolvers`, `primeflex`, `react`?**
  _High betweenness centrality (0.125) - this node is a cross-community bridge._
- **Why does `react` connect `react` to `ProjectDetailPage.tsx`, `ProjectsPage.tsx`, `aiTestCaseParser.ts`, `DashboardReportPage.tsx`, `aiTestRunAnalysis.ts`, `useTheme.tsx`, `domain.ts`, `HomePage.tsx`, `AttachmentPanel.tsx`, `TestPlanDetailPage.tsx`, `plugins`, `CicdIntegrationPage.tsx`, `aiIssueService.ts`?**
  _High betweenness centrality (0.109) - this node is a cross-community bridge._
- **Why does `xlsx` connect `ProjectDetailPage.tsx` to `HomePage.tsx`, `aiTestCaseParser.ts`, `DashboardReportPage.tsx`, `dependencies`?**
  _High betweenness centrality (0.089) - this node is a cross-community bridge._
- **What connects `$schema`, `typescript`, `oxc` to the rest of the system?**
  _157 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `ProjectDetailPage.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.05266106442577031 - nodes in this community are weakly interconnected._
- **Should `react` be split into smaller, more focused modules?**
  _Cohesion score 0.08870056497175141 - nodes in this community are weakly interconnected._
- **Should `ProjectsPage.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.07617051013277429 - nodes in this community are weakly interconnected._