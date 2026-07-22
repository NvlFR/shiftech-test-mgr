import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Project } from '../types/domain';

export interface TestRunExportRow {
  code: string;
  name: string;
  testPlanName: string;
  status: string;
  total: number;
  pass: number;
  fail: number;
  skip: number;
  blocked: number;
  notRun: number;
  startedAt: string;
  completedAt: string;
}

function fileName(project: Project) {
  return project.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

export function exportTestRunsToExcel(project: Project, runs: TestRunExportRow[]) {
  const rows = runs.map((run) => ({
    Kode: run.code,
    'Nama Run': run.name,
    'Test Plan': run.testPlanName,
    Status: run.status,
    Total: run.total,
    Pass: run.pass,
    Fail: run.fail,
    Skip: run.skip,
    Blocked: run.blocked,
    'Belum Dites': run.notRun,
    Progress: run.total ? `${Math.round(((run.total - run.notRun) / run.total) * 100)}%` : '0%',
    Mulai: run.startedAt,
    Selesai: run.completedAt,
  }));
  const worksheet = XLSX.utils.json_to_sheet(rows);
  worksheet['!cols'] = [{ wch: 14 }, { wch: 30 }, { wch: 28 }, { wch: 16 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 22 }, { wch: 22 }];
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Test Runs');
  XLSX.writeFile(workbook, `test-runs-${fileName(project)}.xlsx`);
}

export function exportTestRunsToPdf(project: Project, runs: TestRunExportRow[]) {
  const document = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  document.setFontSize(18);
  document.text('Test Run Report', 14, 16);
  document.setFontSize(10);
  document.setTextColor(90, 90, 90);
  document.text(`Project: ${project.name} | Total run: ${runs.length}`, 14, 23);
  document.text(`Dibuat: ${new Date().toLocaleString('id-ID')}`, 14, 29);
  document.setTextColor(0, 0, 0);

  autoTable(document, {
    startY: 35,
    head: [['Kode', 'Nama Run', 'Test Plan', 'Status', 'Total', 'PASS', 'FAIL', 'SKIP', 'BLOCKED', 'Belum Dites', 'Progress', 'Mulai', 'Selesai']],
    body: runs.map((run) => [
      run.code, run.name, run.testPlanName, run.status, run.total, run.pass, run.fail, run.skip, run.blocked, run.notRun,
      run.total ? `${Math.round(((run.total - run.notRun) / run.total) * 100)}%` : '0%', run.startedAt, run.completedAt,
    ]),
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [20, 184, 166] },
  });
  document.save(`test-runs-${fileName(project)}.pdf`);
}
