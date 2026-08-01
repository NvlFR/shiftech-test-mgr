import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

const auth = vi.hoisted(() => ({
  useAuthContext: vi.fn(),
}));

vi.mock('../../hooks/useAuth', () => ({
  useAuthContext: auth.useAuthContext,
}));

import { ProtectedRoute } from './ProtectedRoute';

describe('ProtectedRoute RBAC invariant', () => {
  it.each([
    '/home',
    '/dashboard',
    '/projects',
    '/projects/project-1/settings',
    '/projects/project-1/integrations',
    '/projects/project-1/requirements',
    '/projects/project-1/automation',
    '/projects/project-1/data-management',
    '/test-cases',
    '/test-suites',
    '/test-plans',
    '/test-runs/run-1',
    '/test-results/result-1',
    '/issues/issue-1',
    '/admin/data-retention',
    '/users',
  ])(
    'redirects a pending user away from protected module %s',
    (path) => {
      auth.useAuthContext.mockReturnValue({
        session: { user: { id: 'pending-user' } },
        loading: false,
        isApproved: false,
        isPending: true,
      });

      render(
        <MemoryRouter initialEntries={[path]}>
          <Routes>
            <Route element={<ProtectedRoute />}>
              <Route path={path} element={<div>Protected module content</div>} />
            </Route>
            <Route path="/pending-approval" element={<div>Pending approval</div>} />
          </Routes>
        </MemoryRouter>,
      );

      expect(screen.getByText('Pending approval')).toBeTruthy();
      expect(screen.queryByText('Protected module content')).toBeNull();
    },
  );
});
