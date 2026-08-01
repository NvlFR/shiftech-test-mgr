import { useEffect, useState } from 'react';
import { useAuthContext } from './useAuth';
import { projectMemberService } from '../services/projectMemberService';
import type { ProjectMemberRole, ProjectPermissions } from '../types/domain';

// Project-scoped permission helper: single place permission rules live on the frontend.
// RLS is the real security boundary — this only drives which actions the UI offers.

export function useProjectRole(projectId: string | undefined) {
  const { isAdmin, session } = useAuthContext();
  const [role, setRole] = useState<ProjectMemberRole | null>(null);
  const [permissions, setPermissions] = useState<ProjectPermissions | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!projectId || !session?.user) {
        setRole(null);
        setLoading(false);
        return;
      }
      setLoading(true);
      const result = await projectMemberService.getOwnAccess(projectId, session.user.id);
      if (!cancelled) {
        setRole(result?.role ?? null);
        setPermissions(result?.permissions ?? null);
        setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [projectId, session?.user?.id]);

  const allowed = (permission: keyof ProjectPermissions) => isAdmin || permissions?.[permission] === true;
  const canView = allowed('view');
  const canCreateContent = allowed('create');
  const canUpdateContent = allowed('update');
  const canEditContent = canCreateContent || canUpdateContent;
  const canDeleteContent = allowed('delete');
  const canManageSettings = isAdmin || role === 'manager';
  const canRunTests = canUpdateContent;
  const canManageIssues = canUpdateContent;
  const canImport = allowed('import');
  const canExport = allowed('export');
  const canRunAutomation = allowed('run_automation');
  const canArchiveProject = isAdmin || role === 'manager';
  const canDeleteProject = isAdmin;

  return {
    loading,
    role,
    permissions,
    isAdmin,
    canView,
    canCreateContent,
    canUpdateContent,
    canEditContent,
    canDeleteContent,
    canManageSettings,
    canRunTests,
    canManageIssues,
    canImport,
    canExport,
    canRunAutomation,
    canArchiveProject,
    canDeleteProject,
  };
}
