import { describe, expect, it } from 'vitest';
import * as statusLabels from './statusLabels';

describe('statusLabels', () => {
  it('mengekspor seluruh pasangan label dan severity yang didukung', () => {
    expect(Object.keys(statusLabels).sort()).toEqual([
      'ISSUE_PRIORITY_LABEL', 'ISSUE_PRIORITY_SEVERITY',
      'ISSUE_STATUS_LABEL', 'ISSUE_STATUS_SEVERITY',
      'ISSUE_TYPE_LABEL', 'ISSUE_TYPE_SEVERITY',
      'PROJECT_MEMBER_ROLE_LABEL', 'PROJECT_MEMBER_ROLE_SEVERITY',
      'PROJECT_MEMBER_STATUS_LABEL', 'PROJECT_MEMBER_STATUS_SEVERITY',
      'PROJECT_STATUS_LABEL', 'PROJECT_STATUS_SEVERITY',
      'PROJECT_VISIBILITY_LABEL', 'PROJECT_VISIBILITY_SEVERITY',
      'TEST_CASE_PRIORITY_LABEL', 'TEST_CASE_PRIORITY_SEVERITY',
      'TEST_CASE_STATUS_LABEL', 'TEST_CASE_STATUS_SEVERITY',
      'TEST_PLAN_STATUS_LABEL', 'TEST_PLAN_STATUS_SEVERITY',
      'TEST_RESULT_STATUS_LABEL', 'TEST_RESULT_STATUS_SEVERITY',
      'TEST_RUN_STATUS_LABEL', 'TEST_RUN_STATUS_SEVERITY',
      'TEST_SUITE_VISIBILITY_LABEL', 'TEST_SUITE_VISIBILITY_SEVERITY',
      'USER_ROLE_LABEL', 'USER_ROLE_SEVERITY',
    ]);
  });

  it.each([
    ['project status', statusLabels.PROJECT_STATUS_LABEL, statusLabels.PROJECT_STATUS_SEVERITY, { active: 'Aktif', inactive: 'Nonaktif', archived: 'Arsip' }, { active: 'success', inactive: 'warning', archived: 'secondary' }],
    ['project visibility', statusLabels.PROJECT_VISIBILITY_LABEL, statusLabels.PROJECT_VISIBILITY_SEVERITY, { private: 'Privat', unlisted: 'Tidak Terdaftar', public: 'Publik' }, { private: 'secondary', unlisted: 'warning', public: 'success' }],
    ['test suite visibility', statusLabels.TEST_SUITE_VISIBILITY_LABEL, statusLabels.TEST_SUITE_VISIBILITY_SEVERITY, { private: 'Privat', unlisted: 'Tidak Terdaftar', public: 'Publik' }, { private: 'secondary', unlisted: 'warning', public: 'success' }],
    ['test plan status', statusLabels.TEST_PLAN_STATUS_LABEL, statusLabels.TEST_PLAN_STATUS_SEVERITY, { draft: 'Draf', active: 'Aktif', completed: 'Selesai', archived: 'Diarsipkan' }, { draft: 'info', active: 'success', completed: 'secondary', archived: 'warning' }],
    ['test case status', statusLabels.TEST_CASE_STATUS_LABEL, statusLabels.TEST_CASE_STATUS_SEVERITY, { draft: 'Draft', active: 'Aktif', archived: 'Diarsipkan' }, { draft: 'warning', active: 'success', archived: 'secondary' }],
    ['test case priority', statusLabels.TEST_CASE_PRIORITY_LABEL, statusLabels.TEST_CASE_PRIORITY_SEVERITY, { low: 'Rendah', medium: 'Sedang', high: 'Tinggi', critical: 'Kritis' }, { low: 'secondary', medium: 'info', high: 'warning', critical: 'danger' }],
    ['test run status', statusLabels.TEST_RUN_STATUS_LABEL, statusLabels.TEST_RUN_STATUS_SEVERITY, { in_progress: 'Berjalan', completed: 'Selesai' }, { in_progress: 'info', completed: 'success' }],
    ['test result status', statusLabels.TEST_RESULT_STATUS_LABEL, statusLabels.TEST_RESULT_STATUS_SEVERITY, { pass: 'Lulus', fail: 'Gagal', skip: 'Dilewati', blocked: 'Terblokir', not_run: 'Belum Dites' }, { pass: 'success', fail: 'danger', skip: 'secondary', blocked: 'warning', not_run: 'info' }],
    ['issue priority', statusLabels.ISSUE_PRIORITY_LABEL, statusLabels.ISSUE_PRIORITY_SEVERITY, { low: 'Rendah', medium: 'Sedang', high: 'Tinggi', critical: 'Kritis' }, { low: 'secondary', medium: 'info', high: 'warning', critical: 'danger' }],
    ['issue status', statusLabels.ISSUE_STATUS_LABEL, statusLabels.ISSUE_STATUS_SEVERITY, { draft: 'Draft', backlog: 'Backlog', open: 'Terbuka', in_progress: 'Dikerjakan', resolved: 'Terselesaikan', verified: 'Terverifikasi', closed: 'Ditutup', rejected: 'Ditolak', duplicate: 'Duplikat' }, { draft: 'secondary', backlog: 'secondary', open: 'danger', in_progress: 'warning', resolved: 'info', verified: 'success', closed: 'secondary', rejected: 'secondary', duplicate: 'secondary' }],
    ['issue type', statusLabels.ISSUE_TYPE_LABEL, statusLabels.ISSUE_TYPE_SEVERITY, { bug: 'Bug', feature: 'Fitur', improvement: 'Peningkatan', task: 'Task' }, { bug: 'danger', feature: 'info', improvement: 'success', task: 'secondary' }],
    ['user role', statusLabels.USER_ROLE_LABEL, statusLabels.USER_ROLE_SEVERITY, { pending: 'Menunggu', rejected: 'Ditolak', user: 'User', admin: 'Admin' }, { pending: 'warning', rejected: 'danger', user: 'info', admin: 'success' }],
    ['project member role', statusLabels.PROJECT_MEMBER_ROLE_LABEL, statusLabels.PROJECT_MEMBER_ROLE_SEVERITY, { manager: 'Manager', supervisor: 'Supervisor', tester: 'Tester', member: 'Anggota' }, { manager: 'success', supervisor: 'warning', tester: 'info', member: 'secondary' }],
    ['project member status', statusLabels.PROJECT_MEMBER_STATUS_LABEL, statusLabels.PROJECT_MEMBER_STATUS_SEVERITY, { invited: 'Menunggu', accepted: 'Bergabung', declined: 'Ditolak' }, { invited: 'warning', accepted: 'success', declined: 'secondary' }],
  ] as const)('%s memetakan setiap nilai domain ke label dan severity', (_, labels, severities, expectedLabels, expectedSeverities) => {
    expect(labels).toEqual(expectedLabels);
    expect(severities).toEqual(expectedSeverities);
    expect(Object.keys(labels)).toEqual(Object.keys(severities));
  });
});
