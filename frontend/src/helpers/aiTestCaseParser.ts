import * as XLSX from 'xlsx';
import { z } from 'zod';
import type { AiTestCaseDraft, AiTestCaseSource, AiTestCaseSourceType } from '../types/aiTestCase';
import type { TestCasePriority } from '../types/domain';

const PRIORITIES = ['low', 'medium', 'high', 'critical'] as const;
const MAX_SOURCE_BYTES = 2_000_000;
const MAX_SOURCE_CHARS = 30_000;

export const AiTestCaseSchema = z.object({
  title: z.string().trim().min(1, 'Judul test case wajib diisi').max(200),
  objective: z.string().trim().max(2_000),
  preconditions: z.string().trim().max(4_000),
  steps: z.string().trim().min(1, 'Langkah pengujian wajib diisi').max(10_000),
  expectedResult: z.string().trim().min(1, 'Hasil yang diharapkan wajib diisi').max(4_000),
  priority: z.enum(PRIORITIES),
  tags: z.array(z.string().trim().min(1).max(60)).max(20),
  notes: z.string().trim().max(4_000),
  scenarios: z.array(z.string().trim().min(1).max(500)).max(20),
  edgeCases: z.array(z.string().trim().min(1).max(500)).max(20),
});

export const AiTestCaseResponseSchema = z.object({
  testCases: z.array(AiTestCaseSchema).min(1).max(50),
  scenarios: z.array(z.string()).optional(),
  edgeCases: z.array(z.string()).optional(),
  provider: z.string().optional(),
  model: z.string().nullable().optional(),
  promptVersion: z.string().nullable().optional(),
});

export type AiTestCaseValidationResult = ReturnType<typeof AiTestCaseSchema.safeParse>;

export class AiTestCaseValidationError extends Error {
  readonly issues: z.ZodIssue[];

  constructor(message: string, issues: z.ZodIssue[] = []) {
    super(message);
    this.issues = issues;
    this.name = 'AiTestCaseValidationError';
  }
}

function asText(value: unknown): string {
  return String(value ?? '').trim();
}

function asList(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(asText).filter(Boolean);
  return asText(value).split(/\r?\n|[,;|]/).map((item) => item.trim()).filter(Boolean);
}

function asSteps(value: unknown): string {
  if (Array.isArray(value)) return value.map(asText).filter(Boolean).map((item, index) => `${index + 1}. ${item}`).join('\n');
  return asText(value);
}

function normalizePriority(value: unknown): TestCasePriority {
  const priority = asText(value).toLowerCase();
  if (priority === 'critical' || priority === 'kritis' || priority === 'p0') return 'critical';
  if (priority === 'high' || priority === 'tinggi' || priority === 'p1') return 'high';
  if (priority === 'low' || priority === 'rendah' || priority === 'p3') return 'low';
  return 'medium';
}

function normalizeCandidate(candidate: unknown): Record<string, unknown> {
  const value = (candidate && typeof candidate === 'object' ? candidate : {}) as Record<string, unknown>;
  return {
    title: asText(value.title ?? value.judul ?? value.name),
    objective: asText(value.objective ?? value.tujuan),
    preconditions: asText(value.preconditions ?? value.precondition ?? value.prasyarat),
    steps: asSteps(value.steps ?? value.step ?? value.langkah),
    expectedResult: asText(value.expectedResult ?? value.expected_result ?? value.expected ?? value.hasilYangDiharapkan),
    priority: normalizePriority(value.priority ?? value.prioritas),
    tags: asList(value.tags ?? value.tag ?? value.labels),
    notes: asText(value.notes ?? value.note ?? value.catatan),
    scenarios: asList(value.scenarios ?? value.scenario ?? value.testScenarios),
    edgeCases: asList(value.edgeCases ?? value.edge_cases ?? value.edge),
  };
}

function unwrapResponse(value: unknown): Record<string, unknown> {
  if (typeof value === 'string') {
    try { return unwrapResponse(JSON.parse(value)); } catch { throw new AiTestCaseValidationError('Respons AI bukan JSON yang valid.'); }
  }
  if (!value || typeof value !== 'object') throw new AiTestCaseValidationError('Respons AI kosong atau tidak valid.');
  const object = value as Record<string, unknown>;
  if (object.data && typeof object.data === 'object') return unwrapResponse(object.data);
  if (object.result && typeof object.result === 'object') return unwrapResponse(object.result);
  const candidates = object.testCases ?? object.test_cases ?? object.cases ?? object.items;
  const testCases = Array.isArray(candidates) ? candidates : candidates ? [candidates] : [];
  return { ...object, testCases };
}

export function parseAiTestCaseResponse(value: unknown): AiTestCaseDraft[] {
  const raw = unwrapResponse(value);
  const rawTestCases = Array.isArray(raw.testCases) ? raw.testCases : [];
  const parsed = AiTestCaseResponseSchema.safeParse({
    ...raw,
    testCases: rawTestCases.map(normalizeCandidate),
  });
  if (!parsed.success) throw new AiTestCaseValidationError('Respons AI tidak memenuhi format test case.', parsed.error.issues);
  const commonScenarios = parsed.data.scenarios?.map(asText).filter(Boolean) ?? [];
  const commonEdgeCases = parsed.data.edgeCases?.map(asText).filter(Boolean) ?? [];
  return parsed.data.testCases.map((item) => ({
    ...item,
    scenarios: item.scenarios.length ? item.scenarios : commonScenarios,
    edgeCases: item.edgeCases.length ? item.edgeCases : commonEdgeCases,
  }));
}

export function validateAiTestCaseDraft(value: unknown): AiTestCaseDraft {
  const parsed = AiTestCaseSchema.safeParse(normalizeCandidate(value));
  if (!parsed.success) throw new AiTestCaseValidationError('Draf test case tidak valid.', parsed.error.issues);
  return parsed.data;
}

export function detectSourceType(fileName: string): AiTestCaseSourceType {
  const extension = fileName.toLowerCase().split('.').pop();
  if (extension === 'xlsx' || extension === 'xls' || extension === 'csv') return extension === 'csv' ? 'document' : 'excel';
  if (extension === 'txt' || extension === 'md' || extension === 'json') return 'document';
  throw new Error('Format file belum didukung. Gunakan Excel, CSV, TXT, Markdown, atau JSON.');
}

export async function parseRequirementFile(file: File): Promise<AiTestCaseSource> {
  if (file.size > MAX_SOURCE_BYTES) throw new Error('Ukuran file terlalu besar. Maksimal 2 MB.');
  const type = detectSourceType(file.name);
  let content: string;
  if (type === 'excel') {
    const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' });
    content = workbook.SheetNames.map((name) => {
      const sheet = workbook.Sheets[name];
      return `Sheet: ${name}\n${XLSX.utils.sheet_to_csv(sheet)}`;
    }).join('\n\n');
  } else {
    content = await file.text();
  }
  content = content.trim();
  if (!content) throw new Error('Dokumen tidak memiliki isi yang dapat dibaca.');
  if (content.length > MAX_SOURCE_CHARS) content = content.slice(0, MAX_SOURCE_CHARS);
  return { type, content, fileName: file.name };
}

export function toAiTestCaseSource(content: string): AiTestCaseSource {
  const trimmed = content.trim();
  if (!trimmed) throw new Error('Requirement wajib diisi.');
  if (trimmed.length > MAX_SOURCE_CHARS) throw new Error('Requirement terlalu panjang. Maksimal 30.000 karakter.');
  return { type: 'text', content: trimmed };
}
