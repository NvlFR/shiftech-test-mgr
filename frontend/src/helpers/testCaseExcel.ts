import * as XLSX from 'xlsx';

export interface ImportedTestCaseRow {
  rowNumber: number;
  code: string;
  title: string;
  moduleName: string;
  objective: string;
  preconditions: string;
  steps: string;
  expectedResult: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  tags: string[];
  notes: string;
  errors: string[];
}

function normalizeHeader(value: unknown) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[()[\]]/g, '')
    .replace(/[\s-]+/g, '_');
}

function valueFrom(row: Record<string, unknown>, aliases: string[]) {
  const key = aliases.find((alias) => row[alias] !== undefined);
  return key ? String(row[key] ?? '').trim() : '';
}

function normalizePriority(value: string): ImportedTestCaseRow['priority'] {
  const normalized = value.toLowerCase();
  if (normalized === 'critical' || normalized === 'kritis') return 'critical';
  if (normalized === 'high' || normalized === 'tinggi') return 'high';
  if (normalized === 'low' || normalized === 'rendah') return 'low';
  return 'medium';
}

export async function parseTestCaseExcel(file: File): Promise<ImportedTestCaseRow[]> {
  const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet) throw new Error('File Excel tidak memiliki sheet.');

  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
  if (rawRows.length === 0) throw new Error('File Excel tidak memiliki data.');

  return rawRows.map((rawRow, index) => {
    const row = Object.fromEntries(Object.entries(rawRow).map(([key, value]) => [normalizeHeader(key), value]));
    const title = valueFrom(row, ['title', 'judul', 'nama', 'test_case', 'test_case_title']);
    const steps = valueFrom(row, ['steps', 'step', 'langkah', 'test_steps']);
    const expectedResult = valueFrom(row, ['expected_result', 'expected', 'hasil_yang_diharapkan', 'hasil']);
    const priorityValue = valueFrom(row, ['priority', 'prioritas']);
    const tagsValue = valueFrom(row, ['tags', 'tag', 'label']);
    const errors: string[] = [];

    if (!title) errors.push('Judul wajib diisi');
    if (!steps) errors.push('Steps wajib diisi');
    if (!expectedResult) errors.push('Expected result wajib diisi');

    return {
      rowNumber: index + 2,
      code: valueFrom(row, ['code', 'kode']),
      title,
      moduleName: valueFrom(row, ['module', 'modul', 'module_name', 'nama_module']),
      objective: valueFrom(row, ['objective', 'tujuan']),
      preconditions: valueFrom(row, ['preconditions', 'precondition', 'prasyarat']),
      steps,
      expectedResult,
      priority: normalizePriority(priorityValue),
      tags: tagsValue.split(/[,;|]/).map((tag) => tag.trim()).filter(Boolean),
      notes: valueFrom(row, ['notes', 'note', 'catatan']),
      errors,
    };
  });
}
