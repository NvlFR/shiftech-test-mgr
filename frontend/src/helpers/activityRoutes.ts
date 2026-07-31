export type ActivityEntityType = 'issue' | 'test_case' | 'test_plan' | 'test_run' | 'project';

export const ACTIVITY_ENTITY_ROUTE: Record<ActivityEntityType, string> = {
  issue: '/issues',
  test_case: '/test-cases',
  test_plan: '/test-plans',
  test_run: '/test-runs',
  project: '/projects',
};

export const ACTIVITY_ENTITY_LABEL: Record<ActivityEntityType, string> = {
  issue: 'Issue',
  test_case: 'Test Case',
  test_plan: 'Test Plan',
  test_run: 'Test Run',
  project: 'Project',
};

export function pathForActivityEntity(entityType: string, entityId: string): string {
  if (entityType in ACTIVITY_ENTITY_ROUTE) {
    return `${ACTIVITY_ENTITY_ROUTE[entityType as ActivityEntityType]}/${entityId}`;
  }

  return '/';
}
