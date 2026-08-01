import { describe, expect, it } from 'vitest';
import { calculateDuplicateConfidence, formatDuplicateIssueComment, parseAiIssueDraft } from './aiValidators';
import { parseAiTestCaseResponse } from './aiTestCaseParser';
import { calculateTestRunSummary } from './testRunSummary';
import { aiTestCaseService } from '../services/aiTestCaseService';

describe('AI output validation', () => {
  it('menerima envelope generate test case yang valid', () => {
    const drafts = parseAiTestCaseResponse({
      data: {
        testCases: [{
          requirementRef: 'REQ-LOGIN-01', scenarioType: 'happy_path',
          module: 'Auth', targetRole: 'Member',
          title: 'Login valid', objective: 'Memastikan login berhasil', preconditions: 'Akun aktif',
          steps: ['Buka login', 'Masukkan kredensial'], expectedResult: 'Dashboard tampil', priority: 'high',
          tags: ['smoke'], notes: '', scenarios: ['Happy path'], edgeCases: ['Password kosong'],
        }, {
          requirement_ref: 'REQ-LOGIN-01', scenario_type: 'negative', module: 'Auth', target_role: 'Member', title: 'Login invalid', objective: 'Validasi input', preconditions: 'Akun aktif',
          steps: ['Buka login', 'Masukkan input invalid'], expected_result: 'Validasi tampil', priority: 'high', tags: [], notes: '', scenarios: [], edge_cases: [],
        }, {
          requirementRef: 'REQ-LOGIN-01', scenarioType: 'edge_case', module: '', targetRole: '', title: 'Login boundary', objective: 'Validasi batas', preconditions: 'Akun aktif',
          steps: ['Buka login', 'Masukkan input batas'], expectedResult: 'Batas ditangani', priority: 'medium', tags: [], notes: '', scenarios: [], edgeCases: [],
        }],
      },
    });
    expect(drafts).toHaveLength(3);
    expect(drafts[0].steps).toContain('1. Buka login');
    expect(drafts.every((draft) => draft.requirementRef === 'REQ-LOGIN-01')).toBe(true);
    expect(drafts[0]).toMatchObject({ module: 'Auth', targetRole: 'Member' });
  });

  it('membuat preview CSV dan menandai baris yang tidak valid', () => {
    const base = { requirementRef: 'REQ-1', scenarioType: 'happy_path' as const, module: 'Auth', title: 'Login valid', objective: '', preconditions: '', steps: '1. Login', expectedResult: 'Dashboard', priority: 'high' as const, tags: ['smoke'], targetRole: 'Member', notes: '', scenarios: [], edgeCases: [] };
    const preview = aiTestCaseService.buildCsvPreview([base, { ...base, title: '', requirementRef: '' }], []);
    expect(preview.invalidCount).toBe(1);
    expect(preview.rows[1].status).toBe('invalid');
    expect(preview.csv.split('\r\n')[0]).toBe('Module,Title,Objective,Preconditions,Steps,Expected Result,Priority,Tags,Target Role,requirement_ref');
    expect(preview.csv).toContain('"REQ-1"');
  });

  it('menolak draft Issue yang kehilangan field wajib', () => {
    expect(() => parseAiIssueDraft({ title: '', priority: 'high' })).toThrow();
  });
});

describe('AI safety helpers', () => {
  it('menghitung confidence duplicate dalam rentang 0 sampai 1', () => {
    const confidence = calculateDuplicateConfidence(
      { title: 'Login gagal setelah submit', description: 'Error 500', actualResult: 'Error', expectedResult: 'Dashboard' },
      { title: 'Login gagal setelah submit', description: 'Error 500', actualResult: 'Error', expectedResult: 'Dashboard' },
    );
    expect(confidence).toBe(1);
  });

  it('membentuk komentar duplicate yang tertaut ke Test Result dan memenuhi batas panjang', () => {
    const comment = formatDuplicateIssueComment({
      projectId: 'project-1', testResultId: 'result-1', title: 'Login gagal',
      description: 'x'.repeat(6000), actualResult: 'Error 500', expectedResult: 'Dashboard tampil',
      priority: 'high', severity: 'high', reproductionSteps: 'Klik login', errorSummary: 'Server error',
      artifacts: [], commitSha: 'abc123',
      environment: { name: 'staging', baseUrl: null, browser: 'chromium', browserVersion: null, os: null, viewport: null, buildVersion: null },
    });
    expect(comment).toContain('Test Result: result-1');
    expect(comment).toContain('tidak membuat Issue baru');
    expect(comment.length).toBeLessThanOrEqual(5000);
  });

  it('menghitung summary tanpa mengubah status result', () => {
    const summary = calculateTestRunSummary([{ status: 'pass' }, { status: 'fail' }, { status: 'not_run' }]);
    expect(summary).toMatchObject({ total: 3, executed: 2, pass: 1, fail: 1, notRun: 1, progressPercent: 67 });
  });
});
