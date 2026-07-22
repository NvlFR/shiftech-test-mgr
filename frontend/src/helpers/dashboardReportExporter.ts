import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { DashboardReport } from '../types/domain';

function safeName(value: string) { return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'all-projects'; }

export function exportDashboardReportToExcel(report: DashboardReport) {
  const rows = report.runs.map((run) => ({
    Project: run.projectName, 'Test Plan': run.testPlanName, Kode: run.code, 'Nama Run': run.name,
    Environment: run.environmentName ?? '-', Release: run.release ?? '-', Status: run.status,
    Total: run.total, Executed: run.executed, PASS: run.pass, FAIL: run.fail, SKIP: run.skip,
    BLOCKED: run.blocked, 'Belum Dites': run.notRun, 'Pass Rate': `${run.passRate}%`, 'Fail Rate': `${run.failRate}%`,
    Progress: `${run.progressPercent}%`, Mulai: run.startedAt, Selesai: run.completedAt ?? '-',
  }));
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), 'Trend Test Run');
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet([{ Metric: 'Total Runs', Value: report.totals.totalRuns }, { Metric: 'Pass Rate', Value: `${report.totals.passRate}%` }, { Metric: 'Fail Rate', Value: `${report.totals.failRate}%` }, { Metric: 'Progress', Value: `${report.totals.progressPercent}%` }, { Metric: 'Issue Aging (hari)', Value: report.issueAging.averageDays }, { Metric: 'Issue Terlama (hari)', Value: report.issueAging.oldestDays }]), 'Summary');
  XLSX.writeFile(workbook, `dashboard-report-${safeName(report.runs[0]?.projectName ?? 'all')}.xlsx`);
}

export function exportDashboardReportToPdf(report: DashboardReport) {
  const document = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  document.setFontSize(16); document.text('Dashboard Trend dan Reporting', 14, 15);
  document.setFontSize(9); document.text(`Dibuat: ${new Date(report.generatedAt).toLocaleString('id-ID')}`, 14, 21);
  document.text(`Runs: ${report.totals.totalRuns} | PASS: ${report.totals.passRate}% | FAIL: ${report.totals.failRate}% | Progress: ${report.totals.progressPercent}% | Issue aging aktif: ${report.issueAging.averageDays} hari`, 14, 27);
  autoTable(document, {
    startY: 33,
    head: [['Project', 'Test Plan', 'Run', 'Environment', 'Release', 'Status', 'Total', 'PASS', 'FAIL', 'Progress', 'Mulai']],
    body: report.runs.map((run) => [run.projectName, run.testPlanName, `${run.code} - ${run.name}`, run.environmentName ?? '-', run.release ?? '-', run.status, run.total, run.pass, run.fail, `${run.progressPercent}%`, new Date(run.startedAt).toLocaleDateString('id-ID')]),
    styles: { fontSize: 7, cellPadding: 1.5 }, headStyles: { fillColor: [20, 184, 166] },
  });
  document.save(`dashboard-report-${safeName(report.runs[0]?.projectName ?? 'all')}.pdf`);
}
