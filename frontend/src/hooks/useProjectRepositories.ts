import { useCallback, useEffect, useState } from 'react';
import { projectRepositoryLinkService } from '../services/projectRepositoryLinkService';
import type {
  CreateProjectRepositoryInput,
  UpdateProjectRepositoryInput,
} from '../repositories/projectRepositoryLinkRepository';
import type { ProjectRepository } from '../types/domain';
import { useAuthContext } from './useAuth';

export function useProjectRepositories(projectId: string | undefined) {
  const { isAdmin, session } = useAuthContext();
  const [repositories, setRepositories] = useState<ProjectRepository[]>([]);
  const [loading, setLoading] = useState(false);

  const reload = useCallback(async () => {
    if (!projectId) {
      setRepositories([]);
      return;
    }

    setLoading(true);
    try {
      setRepositories(await projectRepositoryLinkService.listByProject(projectId));
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const getActor = useCallback(() => {
    const userId = session?.user.id;
    if (!userId) throw new Error('User tidak terautentikasi');
    return { userId, isAdmin };
  }, [isAdmin, session?.user.id]);

  const create = useCallback(
    async (input: Omit<CreateProjectRepositoryInput, 'projectId'>) => {
      if (!projectId) throw new Error('Project wajib dipilih');
      const repository = await projectRepositoryLinkService.create({ ...input, projectId }, getActor());
      await reload();
      return repository;
    },
    [getActor, projectId, reload],
  );

  const update = useCallback(
    async (id: string, changes: UpdateProjectRepositoryInput) => {
      const repository = await projectRepositoryLinkService.update(id, changes, getActor());
      await reload();
      return repository;
    },
    [getActor, reload],
  );

  const remove = useCallback(
    async (id: string) => {
      await projectRepositoryLinkService.remove(id, getActor());
      await reload();
    },
    [getActor, reload],
  );

  return { repositories, loading, reload, create, update, remove };
}
