import { repositoryConnectionRepository } from '../repositories/repositoryConnectionRepository';
import type { ProjectRepository } from '../types/domain';

export interface RepositoryConnectionResult {
  name: string;
  defaultBranch: string | null;
  permissions: string[];
  warning: string | null;
}

export const repositoryConnectionService = {
  async test(repository: ProjectRepository): Promise<RepositoryConnectionResult> {
    if (repository.sourceType !== 'github_public' && repository.sourceType !== 'github_private') {
      throw new Error('Test connection saat ini hanya tersedia untuk repository GitHub');
    }
    const result = await repositoryConnectionRepository.test(repository.projectId, repository.id);
    return {
      name: result.name,
      defaultBranch: result.default_branch,
      permissions: result.permissions,
      warning: result.warning,
    };
  },
};
