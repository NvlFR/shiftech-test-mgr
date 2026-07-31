import { useCallback, useEffect, useState } from 'react';
import { projectRepositoryLinkService } from '../services/projectRepositoryLinkService';
import type {
  CreateProjectRepositoryInput,
  UpdateProjectRepositoryInput,
} from '../repositories/projectRepositoryLinkRepository';
import type { ProjectRepository } from '../types/domain';
import { useAuthContext } from './useAuth';
import { repositoryConnectionService } from '../services/repositoryConnectionService';

export function useProjectRepositories(projectId: string | undefined) {
  const { isAdmin, session } = useAuthContext();
  const [repositories, setRepositories] = useState<ProjectRepository[]>([]);
  const [loading, setLoading] = useState(false);
  const [testingRepositoryId, setTestingRepositoryId] = useState<string | null>(null);

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

  const testConnection = useCallback(async (repository: ProjectRepository) => {
    setTestingRepositoryId(repository.id);
    try {
      return await repositoryConnectionService.test(repository);
    } finally {
      setTestingRepositoryId(null);
    }
  }, []);

  const saveGenericToken = useCallback(async (repository: ProjectRepository, token: string) => {
    await repositoryConnectionService.saveGenericToken(repository, token);
    await reload();
  }, [reload]);

  return { repositories, loading, testingRepositoryId, reload, create, update, remove, testConnection, saveGenericToken };
}
