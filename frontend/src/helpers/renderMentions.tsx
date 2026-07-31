import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

const MENTION_PATTERN = /@([a-zA-Z0-9_]+)/g;
const TEST_CASE_REF_PATTERN = /#([a-zA-Z0-9_-]+)/g;
const ISSUE_REF_PATTERN = /!([a-zA-Z0-9_-]+)/g;

type ReferenceKind = 'mention' | 'testCase' | 'issue';

const REF_PATTERNS: { kind: ReferenceKind; pattern: RegExp }[] = [
  { kind: 'mention', pattern: MENTION_PATTERN },
  { kind: 'testCase', pattern: TEST_CASE_REF_PATTERN },
  { kind: 'issue', pattern: ISSUE_REF_PATTERN },
];

export interface KnownRefs {
  usernames: Set<string>;
  testCaseCodes: Map<string, string>;
  issueCodes: Map<string, string>;
}

interface ReferenceMatch {
  kind: ReferenceKind;
  index: number;
  full: string;
  code: string;
}

function extractUniqueValues(body: string, pattern: RegExp): string[] {
  return [...new Set([...body.matchAll(pattern)].map((match) => match[1]))];
}

function findReferences(body: string): ReferenceMatch[] {
  const matches = REF_PATTERNS.flatMap(({ kind, pattern }) =>
    [...body.matchAll(pattern)].map((match) => ({
      kind,
      index: match.index ?? 0,
      full: match[0],
      code: match[1],
    })),
  );

  return matches.sort((a, b) => a.index - b.index);
}

function referencePath(match: ReferenceMatch, known: KnownRefs): string | null {
  if (match.kind === 'mention' && known.usernames.has(match.code.toLowerCase())) {
    return `/@${match.code}`;
  }
  if (match.kind === 'testCase' && known.testCaseCodes.has(match.code)) {
    return `/test-cases/${known.testCaseCodes.get(match.code)}`;
  }
  if (match.kind === 'issue' && known.issueCodes.has(match.code)) {
    return `/issues/${known.issueCodes.get(match.code)}`;
  }
  return null;
}

export function extractMentionUsernames(body: string): string[] {
  return extractUniqueValues(body, MENTION_PATTERN);
}

export function extractTestCaseCodes(body: string): string[] {
  return extractUniqueValues(body, TEST_CASE_REF_PATTERN);
}

export function extractIssueCodes(body: string): string[] {
  return extractUniqueValues(body, ISSUE_REF_PATTERN);
}

export function renderMentions(body: string, known: KnownRefs): ReactNode[] {
  const parts: ReactNode[] = [];
  let lastIndex = 0;
  let key = 0;

  for (const match of findReferences(body)) {
    if (match.index < lastIndex) continue;
    if (match.index > lastIndex) parts.push(body.slice(lastIndex, match.index));

    const path = referencePath(match, known);
    parts.push(path
      ? <Link key={key++} to={path} className="entity-link">{match.full}</Link>
      : match.full);
    lastIndex = match.index + match.full.length;
  }

  if (lastIndex < body.length) parts.push(body.slice(lastIndex));
  return parts;
}

export function linkifyMentionsMarkdown(body: string, known: KnownRefs): string {
  let result = '';
  let lastIndex = 0;

  for (const match of findReferences(body)) {
    if (match.index < lastIndex) continue;
    if (match.index > lastIndex) result += body.slice(lastIndex, match.index);

    const path = referencePath(match, known);
    result += path ? `[${match.full}](${path})` : match.full;
    lastIndex = match.index + match.full.length;
  }

  return result + body.slice(lastIndex);
}
