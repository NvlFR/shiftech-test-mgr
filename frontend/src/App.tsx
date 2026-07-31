import { Routes, Route } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { AdminRoute } from './components/auth/AdminRoute';
import { LoginPage } from './pages/auth/LoginPage';
import { PendingApprovalPage } from './pages/auth/PendingApprovalPage';
import { HomePage } from './pages/home/HomePage';
import { ProjectsPage } from './pages/projects/ProjectsPage';
import { ProjectDetailPage } from './pages/projects/ProjectDetailPage';
import { ProjectSettingsPage } from './pages/projects/ProjectSettingsPage';
import { TestPlansPage } from './pages/test-plans/TestPlansPage';
import { TestPlanDetailPage } from './pages/test-plans/TestPlanDetailPage';
import { TestCasesPage } from './pages/test-cases/TestCasesPage';
import { TestSuitesPage } from './pages/test-suites/TestSuitesPage';
import { TestSuiteDetailPage } from './pages/test-suites/TestSuiteDetailPage';
import { TestCaseDetailPage } from './pages/test-cases/TestCaseDetailPage';
import { TestRunDetailPage } from './pages/test-runs/TestRunDetailPage';
import { TestRunIssuesPage } from './pages/test-runs/TestRunIssuesPage';
import { CustomTestRunPage } from './pages/test-runs/CustomTestRunPage';
import { IssueDetailPage } from './pages/issues/IssueDetailPage';
import { UserManagementPage } from './pages/users/UserManagementPage';
import { UserDetailPage } from './pages/users/UserDetailPage';
import { RequirementsPage } from './pages/requirements/RequirementsPage';
import { CicdIntegrationPage } from './pages/integrations/CicdIntegrationPage';
import { IntegrationsPage } from './pages/integrations/IntegrationsPage';
import { AutomationPage } from './pages/automation/AutomationPage';
import { ProjectDataManagementPage } from './pages/projects/ProjectDataManagementPage';
import { DashboardReportPage } from './pages/dashboard/DashboardReportPage';

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/pending-approval" element={<PendingApprovalPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<ProjectsPage />} />
          <Route path="/home" element={<HomePage />} />
          <Route path="/dashboard" element={<DashboardReportPage />} />
          <Route path="/projects/:id" element={<ProjectDetailPage />} />
          <Route path="/projects/:id/settings" element={<ProjectSettingsPage />} />
          <Route path="/projects/:id/integrations" element={<IntegrationsPage />} />
          <Route path="/projects/:id/requirements" element={<RequirementsPage />} />
          <Route path="/projects/:id/integrations/cicd" element={<CicdIntegrationPage />} />
          <Route path="/projects/:id/automation" element={<AutomationPage />} />
          <Route path="/projects/:id/data-management" element={<ProjectDataManagementPage />} />
          <Route path="/projects/:id/test-runs/new" element={<CustomTestRunPage />} />
          <Route path="/test-plans" element={<TestPlansPage />} />
          <Route path="/test-plans/:id" element={<TestPlanDetailPage />} />
          <Route path="/test-cases" element={<TestCasesPage />} />
          <Route path="/test-suites" element={<TestSuitesPage />} />
          <Route path="/test-suites/:id" element={<TestSuiteDetailPage />} />
          <Route path="/test-cases/:id" element={<TestCaseDetailPage />} />
          <Route path="/test-runs/:id" element={<TestRunDetailPage />} />
          <Route path="/test-runs/:id/issues" element={<TestRunIssuesPage />} />
          <Route path="/issues/:id" element={<IssueDetailPage />} />

          <Route element={<AdminRoute />}>
            <Route path="/admin/data-retention" element={<ProjectDataManagementPage />} />
            <Route path="/users" element={<UserManagementPage />} />
            <Route path="/users/:id" element={<UserDetailPage />} />
          </Route>
        </Route>
      </Route>
    </Routes>
  );
}

export default App;
