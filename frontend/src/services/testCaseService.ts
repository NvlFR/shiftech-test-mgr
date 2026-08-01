import { testCaseRepository } from '../repositories/testCaseRepository';
import { tagService } from './tagService';
import { moduleService } from './moduleService';
import { testCaseStepService } from './testCaseStepService';
import type { ImportedTestCaseRow } from '../helpers/testCaseExcel';
import type { TestCase, TestCaseFilters, TestCaseWithDetails } from '../types/domain';

const MAX_TITLE_LENGTH = 255;
const VALID_PRIORITIES = ['low', 'medium', 'high', 'critical'] as const;
const VALID_STATUSES = ['draft', 'active', 'archived'] as const;
const VALID_SOURCES = ['manual', 'ai'] as const;
const VALID_STEP_TYPES = ['simple', 'detailed'] as const;

function validateTestCaseInput(input: {
  title: string;
  priority?: TestCase['priority'];
  status?: TestCase['status'];
  source?: TestCase['source'];
  stepType?: TestCase['stepType'];
}) {
  if (!input.title.trim()) throw new Error('Judul test case tidak boleh kosong');
  if (input.title.trim().length > MAX_TITLE_LENGTH) throw new Error(`Judul test case maksimal ${MAX_TITLE_LENGTH} karakter`);
  if (input.priority && !VALID_PRIORITIES.includes(input.priority)) throw new Error('Prioritas test case tidak dikenal');
  if (input.status && !VALID_STATUSES.includes(input.status)) throw new Error('Status test case tidak dikenal');
  if (input.source && !VALID_SOURCES.includes(input.source)) throw new Error('Sumber test case tidak dikenal');
  if (input.stepType && !VALID_STEP_TYPES.includes(input.stepType)) throw new Error('Tipe langkah test case tidak dikenal');
}

export const testCaseService = {
  listByProject(projectId: string) {
    return testCaseRepository.findAllByProject(projectId);
  },

  listByProjectWithDetails(projectId: string) {
    return testCaseRepository.findAllByProjectWithDetails(projectId);
  },

  listPendingAiReview(projectId: string) {
    if (!projectId) throw new Error('Project wajib dipilih');
    return testCaseRepository.findPendingAiReview(projectId);
  },

  reviewAiDrafts(ids: string[], decision: 'approved' | 'rejected') {
    if (!ids.length) throw new Error('Pilih minimal satu test case');
    return testCaseRepository.reviewAiDrafts([...new Set(ids)], decision);
  },

  async listFiltered(projectId: string, filters: TestCaseFilters): Promise<TestCaseWithDetails[]> {
    const cases = await testCaseRepository.findAllByProjectWithDetails(projectId);
    return cases.filter((testCase) =>
      (filters.moduleId === undefined || filters.moduleId === null || testCase.moduleId === filters.moduleId) &&
      (filters.tagId === undefined || filters.tagId === null || testCase.tags.some((tag) => tag.id === filters.tagId)) &&
      (filters.priority === undefined || filters.priority === null || testCase.priority === filters.priority) &&
      (filters.status === undefined || filters.status === null || testCase.status === filters.status) &&
      (filters.assignedTo === undefined || filters.assignedTo === null || testCase.assignedTo === filters.assignedTo),
    );
  },

  listVersions(id: string) {
    return testCaseRepository.listVersions(id);
  },

  async bulkUpdate(ids: string[], projectId: string, changes: Partial<Pick<TestCase, 'priority' | 'status' | 'moduleId' | 'assignedTo'>>, tagNames?: string[]) {
    if (!ids.length) throw new Error('Pilih minimal satu test case');
    await testCaseRepository.bulkUpdate(ids, changes);
    if (tagNames !== undefined) await Promise.all(ids.map((id) => tagService.saveTagsForTestCase(projectId, id, tagNames)));
  },

  getById(id: string) {
    return testCaseRepository.findById(id);
  },

  getByIdWithDetails(id: string) {
    return testCaseRepository.findByIdWithDetails(id);
  },

  async duplicate(id: string): Promise<TestCase> {
    const source = await testCaseRepository.findByIdWithDetails(id);
    if (!source) throw new Error('Test case tidak ditemukan');
    const duplicate = await this.create({
      projectId: source.project.id,
      moduleId: source.moduleId,
      title: `${source.title} (Salinan)`,
      objective: source.objective ?? undefined,
      preconditions: source.preconditions ?? undefined,
      steps: source.steps,
      expectedResult: source.expectedResult,
      stepType: source.stepType,
      priority: source.priority,
      notes: source.notes ?? undefined,
      tagNames: source.tags.map((tag) => tag.name),
    });
    return duplicate;
  },

  async create(input: {
    projectId: string;
    moduleId: string | null;
    code?: string;
    title: string;
    objective?: string;
    steps: string;
    expectedResult: string;
    stepType?: TestCase['stepType'];
    preconditions?: string;
    priority?: TestCase['priority'];
    status?: TestCase['status'];
    source?: TestCase['source'];
    aiBatchId?: string | null;
    notes?: string;
    tagNames?: string[];
    detailedSteps?: { action: string; expectedResult?: string }[];
  }): Promise<TestCase> {
    validateTestCaseInput(input);
    const stepType = input.stepType ?? 'simple';
    if (stepType === 'simple') {
      if (!input.steps.trim()) throw new Error('Langkah pengujian tidak boleh kosong');
      if (!input.expectedResult.trim()) throw new Error('Hasil yang diharapkan tidak boleh kosong');
    } else if (!input.detailedSteps?.some((step) => step.action.trim())) {
      throw new Error('Test case detail wajib punya minimal satu step');
    }

    const testCase = await testCaseRepository.create({
      projectId: input.projectId,
      moduleId: input.moduleId,
      code: input.code?.trim() || null,
      title: input.title.trim(),
      objective: input.objective?.trim() || null,
      preconditions: input.preconditions?.trim() || null,
      steps: input.steps.trim(),
      expectedResult: input.expectedResult.trim(),
      stepType,
      priority: input.priority ?? 'medium',
      status: input.status ?? 'active',
      source: input.source ?? 'manual',
      aiBatchId: input.aiBatchId ?? null,
      reviewDecision: null,
      reviewedBy: null,
      reviewedAt: null,
      notes: input.notes?.trim() || null,
      assignedTo: null,
      targetRoleId: null,
      createdBy: null,
      externalLinks: [],
    });

    if (input.tagNames?.length) {
      await tagService.saveTagsForTestCase(input.projectId, testCase.id, input.tagNames);
    }

    if (stepType === 'detailed' && input.detailedSteps) {
      const validSteps = input.detailedSteps.filter((step) => step.action.trim());
      await Promise.all(validSteps.map((step, index) => testCaseStepService.create({
        testCaseId: testCase.id,
        stepNumber: index + 1,
        action: step.action.trim(),
        expectedResult: step.expectedResult?.trim() || undefined,
      })));
    }

    return testCase;
  },

  async importMany(projectId: string, rows: ImportedTestCaseRow[]) {
    const modules = await moduleService.listByProject(projectId);
    const moduleIds = new Map(modules.map((module) => [module.name.toLowerCase(), module.id]));
    let imported = 0;
    const errors: { rowNumber: number; message: string }[] = [];

    for (const row of rows) {
      try {
        let moduleId: string | null = null;
        if (row.moduleName) {
          const moduleKey = row.moduleName.toLowerCase();
          moduleId = moduleIds.get(moduleKey) ?? null;
          if (!moduleId) {
            const module = await moduleService.create({ projectId, name: row.moduleName });
            moduleId = module.id;
            moduleIds.set(moduleKey, module.id);
          }
        }

        await this.create({
          projectId,
          moduleId,
          code: row.code || undefined,
          title: row.title,
          objective: row.objective,
          preconditions: row.preconditions,
          steps: row.steps,
          expectedResult: row.expectedResult,
          priority: row.priority,
          notes: row.notes,
          tagNames: row.tags,
        });
        imported += 1;
      } catch (error) {
        errors.push({ rowNumber: row.rowNumber, message: error instanceof Error ? error.message : 'Gagal menyimpan test case' });
      }
    }

    return { imported, errors };
  },

  async update(
    id: string,
    projectId: string,
    changes: Partial<Omit<TestCase, 'id' | 'projectId' | 'createdAt' | 'updatedAt'>>,
    tagNames?: string[],
  ) {
    const testCase = await testCaseRepository.update(id, changes);
    if (tagNames !== undefined) {
      await tagService.saveTagsForTestCase(projectId, id, tagNames);
    }
    return testCase;
  },

  archive(id: string) {
    return testCaseRepository.update(id, { status: 'archived' });
  },

  reactivate(id: string) {
    return testCaseRepository.update(id, { status: 'active' });
  },

  remove(id: string) {
    return testCaseRepository.remove(id);
  },
};
