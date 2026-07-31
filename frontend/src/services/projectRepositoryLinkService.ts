import {
  projectRepositoryLinkRepository,
  type CreateProjectRepositoryInput,
  type UpdateProjectRepositoryInput,
} from '../repositories/projectRepositoryLinkRepository';
import { projectMemberRepository } from '../repositories/projectMemberRepository';
import type { ProjectRepositorySourceType } from '../types/domain';

export interface ProjectRepositoryMutationActor {
  userId: string;
  isAdmin: boolean;
}

type RepositoryLocation = {
  sourceType: ProjectRepositorySourceType;
  urlOrPath: string;
};

const SENSITIVE_FIELD_PATTERN = /(?:token|secret|password|credentialValue)/i;

function assertNoSensitiveFields(payload: object): void {
  const sensitiveField = Object.keys(payload).find((field) => SENSITIVE_FIELD_PATTERN.test(field));
  if (sensitiveField) {
    throw new Error('Token atau secret tidak boleh dikirim dari browser');
  }
}

function isAbsolutePath(value: string): boolean {
  return value.startsWith('/') || /^[A-Za-z]:[\\/]/.test(value) || value.startsWith('\\\\');
}

function validateLocation({ sourceType, urlOrPath }: RepositoryLocation): string {
  const location = urlOrPath.trim();
  if (!location) throw new Error('URL atau path repository wajib diisi');

  if (sourceType === 'local_path') {
    if (!isAbsolutePath(location)) throw new Error('Local path repository harus berupa path absolut');
    return location;
  }

  if (sourceType === 'github_public' || sourceType === 'github_private') {
    try {
      const url = new URL(location);
      if (url.protocol !== 'https:' && url.protocol !== 'http:') throw new Error();
    } catch {
      throw new Error('URL repository GitHub tidak valid');
    }
  }

  return location;
}

async function assertCanManage(projectId: string, actor: ProjectRepositoryMutationActor): Promise<void> {
  if (!actor.userId) throw new Error('User tidak terautentikasi');
  if (actor.isAdmin) return;

  const role = await projectMemberRepository.findOwnRole(projectId, actor.userId);
  if (role !== 'manager') {
    throw new Error('Hanya admin project yang boleh mengubah repository');
  }
}

export const projectRepositoryLinkService = {
  listByProject(projectId: string) {
    return projectRepositoryLinkRepository.findAllByProject(projectId);
  },

  getById(id: string) {
    return projectRepositoryLinkRepository.findById(id);
  },

  async create(input: CreateProjectRepositoryInput, actor: ProjectRepositoryMutationActor) {
    assertNoSensitiveFields(input);
    await assertCanManage(input.projectId, actor);

    const name = input.name.trim();
    if (!name) throw new Error('Nama repository wajib diisi');

    return projectRepositoryLinkRepository.create({
      ...input,
      name,
      urlOrPath: validateLocation(input),
      defaultBranch: input.defaultBranch?.trim() || null,
      subdirectory: input.subdirectory?.trim() || null,
    });
  },

  async update(id: string, changes: UpdateProjectRepositoryInput, actor: ProjectRepositoryMutationActor) {
    assertNoSensitiveFields(changes);
    const existing = await projectRepositoryLinkRepository.findById(id);
    if (!existing) throw new Error('Repository project tidak ditemukan');
    await assertCanManage(existing.projectId, actor);

    const name = changes.name?.trim();
    if (changes.name !== undefined && !name) throw new Error('Nama repository wajib diisi');

    const sourceType = changes.sourceType ?? existing.sourceType;
    const urlOrPath = validateLocation({ sourceType, urlOrPath: changes.urlOrPath ?? existing.urlOrPath });

    return projectRepositoryLinkRepository.update(id, {
      ...changes,
      ...(name !== undefined ? { name } : {}),
      ...(changes.sourceType !== undefined || changes.urlOrPath !== undefined ? { urlOrPath } : {}),
      ...(changes.defaultBranch !== undefined
        ? { defaultBranch: changes.defaultBranch?.trim() || null }
        : {}),
      ...(changes.subdirectory !== undefined ? { subdirectory: changes.subdirectory?.trim() || null } : {}),
    });
  },

  async remove(id: string, actor: ProjectRepositoryMutationActor) {
    const existing = await projectRepositoryLinkRepository.findById(id);
    if (!existing) throw new Error('Repository project tidak ditemukan');
    await assertCanManage(existing.projectId, actor);
    return projectRepositoryLinkRepository.remove(id);
  },
};
