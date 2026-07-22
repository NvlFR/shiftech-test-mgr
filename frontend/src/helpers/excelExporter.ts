import * as XLSX from 'xlsx';
import type { Project, TestCaseWithDetails } from '../types/domain';

export function exportTestCasesToExcel(project: Project, testCases: TestCaseWithDetails[]) {
  const rows = testCases.map((testCase) => ({
    Kode: testCase.code,
    Judul: testCase.title,
    Module: testCase.module?.name ?? '',
    Tujuan: testCase.objective ?? '',
    Prasyarat: testCase.preconditions ?? '',
    Langkah: testCase.steps,
    'Hasil yang Diharapkan': testCase.expectedResult,
    Prioritas: testCase.priority,
    Status: testCase.status,
    Tag: testCase.tags.map((tag) => tag.name).join(', '),
    Catatan: testCase.notes ?? '',
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  worksheet['!cols'] = [
    { wch: 14 }, { wch: 32 }, { wch: 20 }, { wch: 32 }, { wch: 32 },
    { wch: 48 }, { wch: 48 }, { wch: 12 }, { wch: 12 }, { wch: 24 }, { wch: 32 },
  ];
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Test Cases');
  XLSX.writeFile(workbook, `test-cases-${project.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.xlsx`);
}

export function downloadTestCaseImportTemplate() {
  const worksheet = XLSX.utils.aoa_to_sheet([
    ['code', 'title', 'module', 'objective', 'preconditions', 'steps', 'expected_result', 'priority', 'tags', 'notes'],
    [
      'TC-LOGIN-01',
      'Login dengan kredensial valid',
      'Authentication',
      'Memastikan user dapat masuk ke aplikasi',
      'User sudah terdaftar',
      'Buka halaman login; isi email; isi password; klik Masuk',
      'User diarahkan ke halaman utama',
      'high',
      'Smoke, Regression',
      'Contoh data, silakan diganti',
    ],
  ]);
  worksheet['!cols'] = [
    { wch: 16 }, { wch: 32 }, { wch: 20 }, { wch: 32 }, { wch: 32 },
    { wch: 48 }, { wch: 48 }, { wch: 12 }, { wch: 24 }, { wch: 32 },
  ];
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Test Cases');
  XLSX.writeFile(workbook, 'test-case-import-template.xlsx');
}
