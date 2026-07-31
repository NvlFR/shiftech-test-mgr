import { testSuiteRepository } from '../repositories/testSuiteRepository';
import type { TestSuiteItem, TestSuiteItemWithSteps, TestSuiteVisibility } from '../types/domain';

type ItemInput = {
  suiteId: string; moduleName?: string; title: string; objective?: string; preconditions?: string;
  steps: string; expectedResult: string; priority?: TestSuiteItem['priority']; targetRole?: string;
  tagNames?: string[]; stepType?: TestSuiteItem['stepType'];
  detailedSteps?: { action: string; expectedResult?: string }[]; orderIndex: number;
};

const normalizeItem = (input: ItemInput): Omit<TestSuiteItem, 'id' | 'createdAt' | 'updatedAt'> => ({
  suiteId: input.suiteId,
  moduleName: input.moduleName?.trim() || null,
  title: input.title.trim(),
  objective: input.objective?.trim() || null,
  preconditions: input.preconditions?.trim() || null,
  steps: input.steps.trim(),
  expectedResult: input.expectedResult.trim(),
  priority: input.priority ?? 'medium',
  stepType: input.stepType ?? 'simple',
  targetRole: input.targetRole?.trim() || null,
  tagNames: input.tagNames ?? [],
  orderIndex: input.orderIndex,
});

function validateItem(input: ItemInput) {
  if (!input.title.trim()) throw new Error('Test case title cannot be empty');
  if ((input.stepType ?? 'simple') === 'detailed' && !input.detailedSteps?.length) throw new Error('A detailed test case must have at least one step');
  if ((input.stepType ?? 'simple') === 'simple' && (!input.steps.trim() || !input.expectedResult.trim())) throw new Error('Test steps and expected result cannot be empty');
}

export const testSuiteService = {
  list() { return testSuiteRepository.findAll(); },
  listSuites() { return testSuiteRepository.findAll(); },
  getById(id: string) { return testSuiteRepository.findById(id); },
  getSuite(id: string) { return testSuiteRepository.findById(id); },
  listByOwner(ownerId: string, visibility?: string[]) { return testSuiteRepository.findByOwner(ownerId, visibility); },
  listItems(id: string) { return testSuiteRepository.findItemsBySuite(id); },
  async getItemWithSteps(item: TestSuiteItem): Promise<TestSuiteItemWithSteps> {
    return { ...item, detailedSteps: item.stepType === 'detailed' ? await testSuiteRepository.findStepsByItem(item.id) : [] };
  },
  create(input: { name: string; description?: string; visibility?: TestSuiteVisibility }) {
    if (!input.name.trim()) throw new Error('Nama suite tidak boleh kosong');
    return testSuiteRepository.create({ name: input.name.trim(), description: input.description?.trim() || null, visibility: input.visibility ?? 'private' });
  },
  createSuite(input: { name: string; description?: string; visibility?: TestSuiteVisibility }) { return this.create(input); },
  update(id: string, input: { name: string; description?: string; visibility?: TestSuiteVisibility }) {
    if (!input.name.trim()) throw new Error('Nama suite tidak boleh kosong');
    return testSuiteRepository.update(id, { name: input.name.trim(), description: input.description?.trim() || null, visibility: input.visibility });
  },
  updateSuite(id: string, input: { name: string; description?: string; visibility?: TestSuiteVisibility }) { return this.update(id, input); },
  remove(id: string) { return testSuiteRepository.remove(id); },
  removeSuite(id: string) { return testSuiteRepository.remove(id); },
  async addItem(input: ItemInput) {
    validateItem(input);
    const item = await testSuiteRepository.createItem(normalizeItem(input));
    if (item.stepType === 'detailed' && input.detailedSteps) await testSuiteRepository.replaceStepsForItem(item.id, input.detailedSteps.map((s) => ({ action: s.action.trim(), expectedResult: s.expectedResult?.trim() || null })));
    return item;
  },
  async addItemsMany(inputs: ItemInput[]) {
    if (!inputs.length) return [];
    inputs.forEach(validateItem);
    const items = await testSuiteRepository.createItemsMany(inputs.map(normalizeItem));
    const steps = inputs.flatMap((input, index) => (input.stepType === 'detailed' ? (input.detailedSteps ?? []).map((step, stepIndex) => ({ suiteItemId: items[index].id, stepNumber: stepIndex + 1, action: step.action.trim(), expectedResult: step.expectedResult?.trim() || null })) : []));
    if (steps.length) await testSuiteRepository.createStepsMany(steps);
    return items;
  },
  async updateItem(id: string, changes: Partial<Omit<TestSuiteItem, 'id' | 'suiteId' | 'createdAt' | 'updatedAt'>>, detailedSteps?: { action: string; expectedResult?: string }[]) {
    const item = await testSuiteRepository.updateItem(id, changes);
    if (item.stepType === 'detailed' && detailedSteps) await testSuiteRepository.replaceStepsForItem(id, detailedSteps.map((s) => ({ action: s.action.trim(), expectedResult: s.expectedResult?.trim() || null })));
    return item;
  },
  removeItem(id: string) { return testSuiteRepository.removeItem(id); },
  removeItemsMany(ids: string[]) { return testSuiteRepository.removeItemsMany(ids); },
};
