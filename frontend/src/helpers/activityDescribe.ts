import {
  ISSUE_STATUS_LABEL,
  PROJECT_STATUS_LABEL,
  TEST_CASE_STATUS_LABEL,
  TEST_PLAN_STATUS_LABEL,
  TEST_RUN_STATUS_LABEL,
} from './statusLabels';
import type { ActivityEntityType } from './activityRoutes';

export interface DescribableActivityEntry {
  entityType: ActivityEntityType;
  eventType: string;
  payload: Record<string, unknown>;
}

const STATUS_LABEL_BY_ENTITY: Record<ActivityEntityType, Record<string, string>> = {
  issue: ISSUE_STATUS_LABEL,
  test_plan: TEST_PLAN_STATUS_LABEL,
  test_case: TEST_CASE_STATUS_LABEL,
  test_run: TEST_RUN_STATUS_LABEL,
  project: PROJECT_STATUS_LABEL,
};

function statusLabel(entityType: ActivityEntityType, rawStatus: unknown): string {
  if (typeof rawStatus !== 'string') return '?';
  return STATUS_LABEL_BY_ENTITY[entityType][rawStatus] ?? rawStatus;
}

export function describeSystemEvent(entry: DescribableActivityEntry): string {
  switch (entry.eventType) {
    case 'status_change':
      return `changed status from ${statusLabel(entry.entityType, entry.payload.from)} to ${statusLabel(entry.entityType, entry.payload.to)}`;
    case 'assignment':
      return typeof entry.payload.assigneeName === 'string'
        ? `assigned to ${entry.payload.assigneeName}`
        : 'changed the assignee';
    case 'attachment_added':
      return typeof entry.payload.fileName === 'string'
        ? `attached ${entry.payload.fileName}`
        : 'added an attachment';
    case 'field_update':
      return 'updated the details';
    default:
      return entry.eventType;
  }
}

const EVENT_TYPE_LABEL: Record<string, string> = {
  comment: 'Comment',
  status_change: 'Status Change',
  assignment: 'Assignment',
  attachment_added: 'Attachment Added',
  field_update: 'Updated',
};

export function eventTypeLabel(eventType: string): string {
  return EVENT_TYPE_LABEL[eventType] ?? eventType;
}
