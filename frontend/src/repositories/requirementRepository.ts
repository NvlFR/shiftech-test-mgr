import { supabase } from '../config/supabaseClient';
import { mapRequirementLinkRow, mapRequirementRow } from '../helpers/mappers';
import type { Requirement, RequirementLink, RequirementLinkType, RequirementPriority, RequirementStatus, RequirementWithLinks } from '../types/domain';

const LINK_COLUMNS = 'id, requirement_id, created_by, created_at, test_case:test_cases(id, code, title), test_plan:test_plans(id, code, name), test_result:test_results(id, test_run:test_runs(id, code, name)), issue:issues(id, code, title)';
function mapLink(row: any): RequirementLink {
  const target = row.test_case ? { type: 'test_case', id: row.test_case.id, label: `${row.test_case.code} — ${row.test_case.title}` } : row.test_plan ? { type: 'test_plan', id: row.test_plan.id, label: `${row.test_plan.code} — ${row.test_plan.name}` } : row.test_result ? { type: 'test_result', id: row.test_result.id, label: `${row.test_result.test_run?.code ?? 'Result'} — ${row.test_result.test_run?.name ?? ''}` } : { type: 'issue', id: row.issue?.id, label: `${row.issue?.code ?? 'Issue'} — ${row.issue?.title ?? ''}` };
  return mapRequirementLinkRow({ ...row, type: target.type, target_id: target.id, target_label: target.label });
}
export const requirementRepository = {
  async findAllByProject(projectId: string): Promise<RequirementWithLinks[]> {
    const { data, error } = await supabase.from('requirements').select(`*, requirement_links(${LINK_COLUMNS})`).eq('project_id', projectId).order('key');
    if (error) throw error;
    return (data ?? []).map((row: any) => ({ ...mapRequirementRow(row), links: (row.requirement_links ?? []).map(mapLink) }));
  },
  async create(input: { projectId: string; key: string; title: string; description: string | null; status: RequirementStatus; priority: RequirementPriority; createdBy: string | null }): Promise<Requirement> {
    const { data, error } = await supabase.from('requirements').insert({ project_id: input.projectId, key: input.key, title: input.title, description: input.description, status: input.status, priority: input.priority, created_by: input.createdBy }).select('*').single();
    if (error) throw error; return mapRequirementRow(data);
  },
  async update(id: string, changes: Partial<Pick<Requirement, 'key' | 'title' | 'description' | 'status' | 'priority'>>): Promise<Requirement> {
    const payload: Record<string, unknown> = {};
    if (changes.key !== undefined) payload.key = changes.key; if (changes.title !== undefined) payload.title = changes.title; if (changes.description !== undefined) payload.description = changes.description; if (changes.status !== undefined) payload.status = changes.status; if (changes.priority !== undefined) payload.priority = changes.priority;
    const { data, error } = await supabase.from('requirements').update(payload).eq('id', id).select('*').single();
    if (error) throw error; return mapRequirementRow(data);
  },
  async remove(id: string): Promise<void> { const { error } = await supabase.from('requirements').delete().eq('id', id); if (error) throw error; },
  async addLink(input: { requirementId: string; type: RequirementLinkType; targetId: string; createdBy: string | null }): Promise<RequirementLink> {
    const payload: Record<string, unknown> = { requirement_id: input.requirementId, created_by: input.createdBy }; payload[`${input.type}_id`] = input.targetId;
    const { data, error } = await supabase.from('requirement_links').insert(payload).select(LINK_COLUMNS).single();
    if (error) throw error; return mapLink(data);
  },
  async removeLink(id: string): Promise<void> { const { error } = await supabase.from('requirement_links').delete().eq('id', id); if (error) throw error; },
};
