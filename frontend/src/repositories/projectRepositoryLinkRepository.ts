import { supabase } from '../config/supabaseClient';
import { mapProjectRepositoryRow } from '../helpers/mappers';
import type { ProjectRepository, ProjectRepositorySourceType } from '../types/domain';

export interface CreateProjectRepositoryInput {
  projectId: string;
  name: string;
  sourceType: ProjectRepositorySourceType;
  urlOrPath: string;
  defaultBranch?: string | null;
  credentialId?: string | null;
  subdirectory?: string | null;
  isActive?: boolean;
}

export type UpdateProjectRepositoryInput = Partial<
  Pick<
    ProjectRepository,
    'name' | 'sourceType' | 'urlOrPath' | 'defaultBranch' | 'credentialId' | 'subdirectory' | 'isActive'
  >
>;

export const projectRepositoryLinkRepository = {
  async findAllByProject(projectId: string): Promise<ProjectRepository[]> {
    const { data, error } = await supabase
      .from('project_repositories')
      .select('*')
      .eq('project_id', projectId)
      .order('name');
    if (error) throw error;
    return (data ?? []).map(mapProjectRepositoryRow);
  },

  async findById(id: string): Promise<ProjectRepository | null> {
    const { data, error } = await supabase
      .from('project_repositories')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data ? mapProjectRepositoryRow(data) : null;
  },

  async create(input: CreateProjectRepositoryInput): Promise<ProjectRepository> {
    const { data, error } = await supabase
      .from('project_repositories')
      .insert({
        project_id: input.projectId,
        name: input.name,
        source_type: input.sourceType,
        url_or_path: input.urlOrPath,
        default_branch: input.defaultBranch,
        credential_id: input.credentialId,
        subdirectory: input.subdirectory,
        is_active: input.isActive,
      })
      .select('*')
      .single();
    if (error) throw error;
    return mapProjectRepositoryRow(data);
  },

  async update(id: string, changes: UpdateProjectRepositoryInput): Promise<ProjectRepository> {
    const payload: Record<string, unknown> = {};
    if (changes.name !== undefined) payload.name = changes.name;
    if (changes.sourceType !== undefined) payload.source_type = changes.sourceType;
    if (changes.urlOrPath !== undefined) payload.url_or_path = changes.urlOrPath;
    if (changes.defaultBranch !== undefined) payload.default_branch = changes.defaultBranch;
    if (changes.credentialId !== undefined) payload.credential_id = changes.credentialId;
    if (changes.subdirectory !== undefined) payload.subdirectory = changes.subdirectory;
    if (changes.isActive !== undefined) payload.is_active = changes.isActive;

    const { data, error } = await supabase
      .from('project_repositories')
      .update(payload)
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw error;
    return mapProjectRepositoryRow(data);
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase.from('project_repositories').delete().eq('id', id);
    if (error) throw error;
  },
};
