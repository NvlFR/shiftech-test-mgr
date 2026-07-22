import { requirementRepository } from '../repositories/requirementRepository';
import type { RequirementLinkType, RequirementPriority, RequirementStatus } from '../types/domain';
export const requirementService = {
  listByProject: requirementRepository.findAllByProject,
  async create(input: { projectId: string; key: string; title: string; description?: string; status?: RequirementStatus; priority?: RequirementPriority; createdBy: string | null }) {
    const key = input.key.trim().toUpperCase(); if (!key) throw new Error('Kode requirement wajib diisi'); if (!input.title.trim()) throw new Error('Judul requirement wajib diisi');
    return requirementRepository.create({ ...input, key, title: input.title.trim(), description: input.description?.trim() || null, status: input.status ?? 'draft', priority: input.priority ?? 'medium' });
  },
  update(id: string, input: { key: string; title: string; description?: string; status: RequirementStatus; priority: RequirementPriority }) { if (!input.key.trim() || !input.title.trim()) throw new Error('Kode dan judul requirement wajib diisi'); return requirementRepository.update(id, { ...input, key: input.key.trim().toUpperCase(), title: input.title.trim(), description: input.description?.trim() || null }); },
  remove: requirementRepository.remove,
  addLink(input: { requirementId: string; type: RequirementLinkType; targetId: string; createdBy: string | null }) { if (!input.targetId) throw new Error('Target traceability wajib dipilih'); return requirementRepository.addLink(input); },
  removeLink: requirementRepository.removeLink,
};
