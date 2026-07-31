import type { TestCasePriority, TestCaseStepType } from '../types/domain';

export interface ParsedTestCaseStep {
  action: string;
  expectedResult: string | null;
}

export interface ParsedTestCaseRow {
  rowNumber: number;
  moduleName: string | null;
  title: string;
  objective: string | null;
  preconditions: string | null;
  steps: string;
  stepType: TestCaseStepType;
  detailedSteps: ParsedTestCaseStep[];
  expectedResult: string;
  priority: TestCasePriority;
  tagNames: string[];
  targetRole: string | null;
}

export interface InvalidRow {
  rowNumber: number;
  reason: string;
}

export interface ParsedTestCaseCsv {
  valid: ParsedTestCaseRow[];
  invalid: InvalidRow[];
}

const EXPECTED_HEADERS = ['module', 'title', 'objective', 'preconditions', 'steps', 'expected result', 'priority', 'tags', 'target role'];
const PRIORITIES: TestCasePriority[] = ['low', 'medium', 'high', 'critical'];
const CSV_TEMPLATE_HEADER = 'Module,Title,Objective,Preconditions,Steps,Expected Result,Priority,Tags,Target Role';
const CSV_TEMPLATE_SAMPLE_ROWS = [
  '"Login","User can login with valid credentials","Verify authentication works","User is registered","Open login page;Enter valid email and password;Click Login","User is redirected to dashboard","high","auth,smoke",""',
  '"Login","User can login step-by-step","","User is registered","1. Open login page | Login form is shown;2. Enter credentials | Fields accept input;3. Click Login | Redirected to dashboard","","medium","auth","Admin"',
];

export function downloadCsvTemplate(): void {
  const csvContent = [CSV_TEMPLATE_HEADER, ...CSV_TEMPLATE_SAMPLE_ROWS].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'test-case-import-template.csv';
  link.click();
  URL.revokeObjectURL(url);
}

function parseStepsCell(raw: string): { stepType: TestCaseStepType; detailedSteps: ParsedTestCaseStep[] } {
  if (!raw.includes('|')) return { stepType: 'simple', detailedSteps: [] };

  const detailedSteps = raw
    .split(';')
    .map((segment) => segment.trim())
    .filter(Boolean)
    .map((segment) => {
      const [actionPart, ...expectedParts] = segment.replace(/^\d+\.\s*/, '').split('|');
      return {
        action: actionPart.trim(),
        expectedResult: expectedParts.join('|').trim() || null,
      };
    })
    .filter((step) => step.action !== '');

  return { stepType: 'detailed', detailedSteps };
}

function parseCsvText(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let index = 0; index < text.length; index++) {
    const char = text[index];
    if (inQuotes) {
      if (char === '"') {
        if (text[index + 1] === '"') {
          field += '"';
          index++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && text[index + 1] === '\n') index++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += char;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((cells) => cells.some((cell) => cell.trim() !== ''));
}

export async function parseTestCaseCsv(file: File): Promise<ParsedTestCaseCsv> {
  const rows = parseCsvText(await file.text());
  if (rows.length === 0) return { valid: [], invalid: [] };

  const header = rows[0].map((value) => value.trim().toLowerCase());
  const colIndex = (name: string) => header.indexOf(name);
  const index = {
    module: colIndex('module'),
    title: colIndex('title'),
    objective: colIndex('objective'),
    preconditions: colIndex('preconditions'),
    steps: colIndex('steps'),
    expectedResult: colIndex('expected result'),
    priority: colIndex('priority'),
    tags: colIndex('tags'),
    targetRole: colIndex('target role'),
  };

  if (index.title === -1) {
    throw new Error(`The "Title" column is required in the header. Supported columns: ${EXPECTED_HEADERS.join(', ')}`);
  }

  const valid: ParsedTestCaseRow[] = [];
  const invalid: InvalidRow[] = [];

  for (let rowIndex = 1; rowIndex < rows.length; rowIndex++) {
    const cells = rows[rowIndex];
    const rowNumber = rowIndex + 1;
    const cell = (columnIndex: number) => (columnIndex >= 0 ? (cells[columnIndex] ?? '').trim() : '');
    const title = cell(index.title);

    if (!title) {
      invalid.push({ rowNumber, reason: 'Title is empty' });
      continue;
    }

    const priorityRaw = cell(index.priority).toLowerCase();
    const priority = PRIORITIES.includes(priorityRaw as TestCasePriority)
      ? priorityRaw as TestCasePriority
      : 'medium';
    const stepsCell = cell(index.steps);
    const { stepType, detailedSteps } = parseStepsCell(stepsCell);

    if (stepType === 'detailed' && detailedSteps.length === 0) {
      invalid.push({ rowNumber, reason: 'Steps contains "|" but no valid action found' });
      continue;
    }

    valid.push({
      rowNumber,
      moduleName: cell(index.module) || null,
      title,
      objective: cell(index.objective) || null,
      preconditions: cell(index.preconditions) || null,
      steps: stepType === 'simple' ? stepsCell : '',
      stepType,
      detailedSteps,
      expectedResult: cell(index.expectedResult),
      priority,
      tagNames: cell(index.tags).split(',').map((tag) => tag.trim()).filter(Boolean),
      targetRole: cell(index.targetRole) || null,
    });
  }

  return { valid, invalid };
}
