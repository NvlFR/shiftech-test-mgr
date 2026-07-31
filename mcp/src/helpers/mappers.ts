import type { Project, TestCaseDetail, TestCaseSummary } from "../types/domain.js";

type JsonRecord = Record<string, unknown>;

const record = (value: unknown): JsonRecord => value && typeof value === "object" ? value as JsonRecord : {};
const stringValue = (value: unknown): string => typeof value === "string" ? value : "";
const nullableString = (value: unknown): string | null => typeof value === "string" ? value : null;

export const mapProjectRow = (value: unknown): Project => {
  const row = record(value);
  return {
    id: stringValue(row.id),
    name: stringValue(row.name),
    description: nullableString(row.description),
    status: stringValue(row.status),
    createdAt: stringValue(row.created_at),
    updatedAt: stringValue(row.updated_at),
  };
};

export const mapTestCaseSummaryRow = (value: unknown): TestCaseSummary => {
  const row = record(value);
  const module = record(row.module);
  return {
    id: stringValue(row.id),
    projectId: stringValue(row.project_id),
    module: row.module ? {
      id: stringValue(module.id),
      code: nullableString(module.code),
      name: stringValue(module.name),
    } : null,
    tags: Array.isArray(row.tags) ? row.tags.map((item) => {
      const tag = record(item);
      return { id: stringValue(tag.id), name: stringValue(tag.name) };
    }) : [],
    code: stringValue(row.code),
    title: stringValue(row.title),
    priority: row.priority as TestCaseSummary["priority"],
    status: row.status as TestCaseSummary["status"],
    updatedAt: stringValue(row.updated_at),
  };
};

export const mapTestCaseDetailRow = (value: unknown): TestCaseDetail => {
  const row = record(value);
  return {
    ...mapTestCaseSummaryRow(row),
    objective: nullableString(row.objective),
    preconditions: nullableString(row.preconditions),
    steps: stringValue(row.steps),
    expectedResult: stringValue(row.expected_result),
    detailedSteps: Array.isArray(row.detailed_steps) ? row.detailed_steps.map((item) => {
      const step = record(item);
      return {
        id: stringValue(step.id),
        stepNumber: Number(step.step_number),
        action: stringValue(step.action),
        expectedResult: nullableString(step.expected_result),
      };
    }) : [],
    versions: Array.isArray(row.versions) ? row.versions.map((item) => {
      const version = record(item);
      return {
        id: stringValue(version.id),
        version: Number(version.version),
        steps: stringValue(version.steps),
        expectedResult: stringValue(version.expected_result),
        changedBy: nullableString(version.changed_by),
        createdAt: stringValue(version.created_at),
      };
    }) : [],
    notes: nullableString(row.notes),
    createdAt: stringValue(row.created_at),
  };
};
