import { supabase } from '../config/supabaseClient';

export interface RepositoryConnectionResultRow {
  name: string;
  default_branch: string | null;
  permissions: string[];
  warning: string | null;
}

export interface RepositoryCredentialRow {
  credential_id: string | null;
  mask: string | null;
}

type CredentialAction = 'store' | 'rotate';

export const repositoryConnectionRepository = {
  async saveCredential(action: CredentialAction, projectId: string, repositoryId: string, token: string): Promise<RepositoryCredentialRow> {
    const { data, error } = await supabase.functions.invoke('repo-credentials', {
      body: { action, project_id: projectId, repository_id: repositoryId, token },
    });
    if (error) throw new Error(`Penyimpanan token gagal: ${error.message}`);
    const result = data && typeof data === 'object' && 'data' in data
      ? (data as { data: RepositoryCredentialRow }).data
      : null;
    if (!result) throw new Error('Respons penyimpanan token tidak valid');
    return result;
  },
  async test(projectId: string, repositoryId: string): Promise<RepositoryConnectionResultRow> {
    const { data, error } = await supabase.functions.invoke('repo-credentials', {
      body: { action: 'test', project_id: projectId, repository_id: repositoryId },
    });
    if (error) throw new Error(`Test connection gagal: ${error.message}`);
    const result = data && typeof data === 'object' && 'data' in data
      ? (data as { data: RepositoryConnectionResultRow }).data
      : null;
    if (!result) throw new Error('Respons test connection tidak valid');
    return result;
  },
};
