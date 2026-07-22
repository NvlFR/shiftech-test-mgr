import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Project, TestCaseWithDetails } from '../types/domain';

export function exportTestCasesToPdf(project: Project, testCases: TestCaseWithDetails[]) {
  const document = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const generatedAt = new Date().toLocaleString('id-ID');

  document.setFontSize(18);
  document.text('Test Case Report', 14, 16);
  document.setFontSize(10);
  document.setTextColor(90, 90, 90);
  document.text(`Project: ${project.name}`, 14, 23);
  document.text(`Dibuat: ${generatedAt} | Total: ${testCases.length} test case`, 14, 29);
  document.setTextColor(0, 0, 0);

  autoTable(document, {
    startY: 35,
    head: [['Kode', 'Judul', 'Module', 'Prioritas', 'Status', 'Langkah Pengujian', 'Hasil yang Diharapkan']],
    body: testCases.map((testCase) => [
      testCase.code,
      testCase.title,
      testCase.module?.name ?? '-',
      testCase.priority,
      testCase.status,
      testCase.steps,
      testCase.expectedResult,
    ]),
    styles: { fontSize: 8, cellPadding: 2, overflow: 'linebreak', valign: 'top' },
    headStyles: { fillColor: [20, 184, 166] },
    columnStyles: {
      0: { cellWidth: 22 },
      1: { cellWidth: 42 },
      2: { cellWidth: 28 },
      3: { cellWidth: 22 },
      4: { cellWidth: 22 },
      5: { cellWidth: 65 },
      6: { cellWidth: 65 },
    },
  });

  document.save(`test-cases-${project.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.pdf`);
}
