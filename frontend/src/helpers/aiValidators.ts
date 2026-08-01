import { z } from 'zod';
import type { AiIssueDraft, AiIssueSeverity } from '../types/ai';
import type { IssuePriority } from '../types/domain';

const prioritySchema = z.enum(['low', 'medium', 'high', 'critical']);
const severitySchema = prioritySchema;
const artifactSchema = z.object({
  type: z.enum(['screenshot', 'video', 'trace', 'log', 'network', 'dom']),
  url: z.string().trim().min(1),
  name: z.string().optional(),
  path: z.string().optional(),
  bucket: z.string().optional(),
});
const environmentSchema = z.object({
  name: z.string().nullable(), baseUrl: z.string().nullable(), browser: z.string().nullable(),
  browserVersion: z.string().nullable(), os: z.string().nullable(),
  viewport: z.object({ width: z.number(), height: z.number() }).nullable(), buildVersion: z.string().nullable(),
});

export const aiIssueDraftSchema = z.object({
  projectId: z.string().trim().min(1),
  testResultId: z.string().trim().min(1),
  title: z.string().trim().min(1).max(300),
  description: z.string().trim().max(10000),
  actualResult: z.string().trim().max(10000),
  expectedResult: z.string().trim().max(10000),
  priority: prioritySchema,
  severity: severitySchema,
  reproductionSteps: z.string().trim().max(10000),
  errorSummary: z.string().trim().max(10000),
  artifacts: z.array(artifactSchema).max(100),
  environment: environmentSchema,
  commitSha: z.string().trim().nullable(),
});

const duplicateCandidateSchema = z.object({
  issueId: z.string().trim().min(1),
  confidence: z.number().min(0).max(1).optional(),
  reason: z.string().trim().min(1).max(2000).optional(),
});

const duplicateResponseSchema = z.object({ candidates: z.array(duplicateCandidateSchema).max(100) });

const assistantEntityTypeSchema = z.enum(['test_case', 'test_run', 'test_result', 'issue', 'requirement', 'history']);
const assistantMatchSchema = z.object({
  entityType: assistantEntityTypeSchema,
  entityId: z.string().trim().min(1),
  projectId: z.string().trim().min(1),
  code: z.string().nullable().optional(),
  title: z.string().trim().min(1).max(500),
  snippet: z.string().trim().max(5000),
  score: z.number().min(0).max(1),
});

const assistantResponseSchema = z.object({
  answer: z.string().nullable().optional(),
  matches: z.array(assistantMatchSchema).max(50),
});

export function parseAiIssueDraft(value: unknown): AiIssueDraft {
  return aiIssueDraftSchema.parse(value);
}

export function parseDuplicateCandidates(value: unknown): Array<{ issueId: string; confidence?: number; reason?: string }> {
  return duplicateResponseSchema.parse(value).candidates;
}

export function parseAssistantResult(value: unknown) {
  return assistantResponseSchema.parse(value);
}

export function normaliseAiText(value: string | null | undefined): string {
  return (value ?? '')
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

function tokenSimilarity(left: string | null | undefined, right: string | null | undefined): number {
  const leftTokens = new Set(normaliseAiText(left).split(/\s+/).filter(Boolean));
  const rightTokens = new Set(normaliseAiText(right).split(/\s+/).filter(Boolean));
  if (leftTokens.size === 0 || rightTokens.size === 0) return 0;
  const intersection = [...leftTokens].filter((token) => rightTokens.has(token)).length;
  const union = new Set([...leftTokens, ...rightTokens]).size;
  return union === 0 ? 0 : intersection / union;
}

export function calculateDuplicateConfidence(
  draft: Pick<AiIssueDraft, 'title' | 'description' | 'actualResult' | 'expectedResult'>,
  issue: { title: string; description: string | null; actualResult: string | null; expectedResult: string | null },
): number {
  const score =
    tokenSimilarity(draft.title, issue.title) * 0.55 +
    tokenSimilarity(draft.description, issue.description) * 0.2 +
    tokenSimilarity(draft.actualResult, issue.actualResult) * 0.15 +
    tokenSimilarity(draft.expectedResult, issue.expectedResult) * 0.1;
  return Math.round(Math.min(1, Math.max(0, score)) * 100) / 100;
}

export function toIssuePriority(value: AiIssueSeverity): IssuePriority {
  return value;
}

export function formatDraftMetadata(draft: AiIssueDraft): string {
  const sections = [draft.description.trim()];
  if (draft.reproductionSteps.trim()) sections.push(`Reproduction steps (AI draft):\n${draft.reproductionSteps.trim()}`);
  sections.push(`Error summary:\n${draft.errorSummary.trim() || '-'}`);
  const environment = [
    draft.environment.name && `Name: ${draft.environment.name}`,
    draft.environment.baseUrl && `Base URL: ${draft.environment.baseUrl}`,
    draft.environment.browser && `Browser: ${draft.environment.browser}${draft.environment.browserVersion ? ` ${draft.environment.browserVersion}` : ''}`,
    draft.environment.os && `OS: ${draft.environment.os}`,
    draft.environment.viewport && `Viewport: ${draft.environment.viewport.width}x${draft.environment.viewport.height}`,
    draft.environment.buildVersion && `Build: ${draft.environment.buildVersion}`,
  ].filter(Boolean);
  sections.push(`Environment:\n${environment.join('\n') || '-'}`);
  sections.push(`Commit SHA: ${draft.commitSha || '-'}`);
  const artifacts = draft.artifacts.map((artifact) => `- [${artifact.type}] ${artifact.name ?? artifact.path ?? artifact.url}: ${artifact.url}`);
  sections.push(`Artifacts (${artifacts.length}):\n${artifacts.join('\n') || '-'}`);
  sections.push(`Severity (AI draft): ${draft.severity}`);
  return sections.filter(Boolean).join('\n\n');
}

export function formatDuplicateIssueComment(draft: AiIssueDraft): string {
  const body = [
    'AI mendeteksi kegagalan baru sebagai kandidat duplikat dan tidak membuat Issue baru.',
    `Test Result: ${draft.testResultId}`,
    `Judul draft: ${draft.title}`,
    `Hasil aktual:\n${draft.actualResult.trim() || '-'}`,
    `Hasil yang diharapkan:\n${draft.expectedResult.trim() || '-'}`,
    formatDraftMetadata(draft),
  ].join('\n\n');

  return body.length <= 5000 ? body : `${body.slice(0, 4980).trimEnd()}\n\n[truncated]`;
}

export function buildDuplicateReason(confidence: number): string {
  if (confidence >= 0.85) return 'Judul dan detail kegagalan sangat mirip dengan Issue pada project aktif.';
  if (confidence >= 0.6) return 'Sebagian detail kegagalan mirip dengan Issue pada project aktif.';
  return 'Ada kemiripan terbatas; perlu review manual sebelum menyimpulkan duplicate.';
}
