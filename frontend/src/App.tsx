import { Routes, Route } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { AdminRoute } from './components/auth/AdminRoute';
import { LoginPage } from './pages/auth/LoginPage';
import { PendingApprovalPage } from './pages/auth/PendingApprovalPage';
import { ProjectsPage } from './pages/projects/ProjectsPage';
import { ProjectDetailPage } from './pages/projects/ProjectDetailPage';
import { TestPlansPage } from './pages/test-plans/TestPlansPage';
import { TestPlanDetailPage } from './pages/test-plans/TestPlanDetailPage';
import { TestCasesPage } from './pages/test-cases/TestCasesPage';
import { TestRunsPage } from './pages/test-runs/TestRunsPage';
import { TestRunDetailPage } from './pages/test-runs/TestRunDetailPage';
import { TestRunIssuesPage } from './pages/test-runs/TestRunIssuesPage';
import { UserManagementPage } from './pages/users/UserManagementPage';
import { UserDetailPage } from './pages/users/UserDetailPage';

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/pending-approval" element={<PendingApprovalPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<ProjectsPage />} />
          <Route path="/projects/:id" element={<ProjectDetailPage />} />
          <Route path="/test-plans" element={<TestPlansPage />} />
          <Route path="/test-plans/:id" element={<TestPlanDetailPage />} />
          <Route path="/test-cases" element={<TestCasesPage />} />
          <Route path="/test-runs" element={<TestRunsPage />} />
          <Route path="/test-runs/:id" element={<TestRunDetailPage />} />
          <Route path="/test-runs/:id/issues" element={<TestRunIssuesPage />} />

          <Route element={<AdminRoute />}>
            <Route path="/users" element={<UserManagementPage />} />
            <Route path="/users/:id" element={<UserDetailPage />} />
          </Route>
        </Route>
      </Route>
    </Routes>
  );
}

export default App;
