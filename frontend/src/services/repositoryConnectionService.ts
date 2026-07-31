import { repositoryConnectionRepository } from '../repositories/repositoryConnectionRepository';
import type { ProjectRepository } from '../types/domain';

export interface RepositoryConnectionResult {
  name: string;
  defaultBranch: string | null;
  permissions: string[];
  warning: string | null;
}

export const repositoryConnectionService = {
  async saveGenericToken(repository: ProjectRepository, token: string): Promise<void> {
    if (repository.sourceType !== 'git_url') throw new Error('Token generik hanya berlaku untuk sumber Git URL');
    const normalizedToken = token.trim();
    if (normalizedToken.length < 8) throw new Error('Token generik minimal 8 karakter');
    await repositoryConnectionRepository.saveCredential(
      repository.credentialId ? 'rotate' : 'store',
      repository.projectId,
      repository.id,
      normalizedToken,
    );
  },

  async test(repository: ProjectRepository): Promise<RepositoryConnectionResult> {
    if (!['github_public', 'github_private', 'git_url'].includes(repository.sourceType)) {
      throw new Error('Test connection hanya tersedia untuk repository berbasis URL');
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
