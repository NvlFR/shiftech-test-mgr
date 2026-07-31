import { useCallback, useEffect, useState } from 'react';
import { projectMemberService } from '../services/projectMemberService';
import { testRoleService } from '../services/testRoleService';
import type { ProjectMemberWithProfile, TestRole } from '../types/domain';

export function useIssueEditorOptions(projectId: string | null) {
  const [testRoles, setTestRoles] = useState<TestRole[]>([]);
  const [projectMembers, setProjectMembers] = useState<ProjectMemberWithProfile[]>([]);

  const reload = useCallback(async () => {
    if (!projectId) {
      setTestRoles([]);
      setProjectMembers([]);
      return;
    }
    const [roles, members] = await Promise.all([
      testRoleService.listByProject(projectId),
      projectMemberService.listByProject(projectId),
    ]);
    setTestRoles(roles);
    setProjectMembers(members);
  }, [projectId]);

  useEffect(() => { void reload(); }, [reload]);

  return { testRoles, projectMembers, reload };
}
