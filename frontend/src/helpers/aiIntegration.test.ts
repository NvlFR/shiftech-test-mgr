import { describe, expect, it } from 'vitest';
import { calculateDuplicateConfidence, parseAiIssueDraft } from './aiValidators';
import { parseAiTestCaseResponse } from './aiTestCaseParser';
import { calculateTestRunSummary } from './testRunSummary';

describe('AI output validation', () => {
  it('menerima envelope generate test case yang valid', () => {
    const drafts = parseAiTestCaseResponse({
      data: {
        testCases: [{
          requirementRef: 'REQ-LOGIN-01', scenarioType: 'happy_path',
          title: 'Login valid', objective: 'Memastikan login berhasil', preconditions: 'Akun aktif',
          steps: ['Buka login', 'Masukkan kredensial'], expectedResult: 'Dashboard tampil', priority: 'high',
          tags: ['smoke'], notes: '', scenarios: ['Happy path'], edgeCases: ['Password kosong'],
        }, {
          requirement_ref: 'REQ-LOGIN-01', scenario_type: 'negative', title: 'Login invalid', objective: 'Validasi input', preconditions: 'Akun aktif',
          steps: ['Buka login', 'Masukkan input invalid'], expected_result: 'Validasi tampil', priority: 'high', tags: [], notes: '', scenarios: [], edge_cases: [],
        }, {
          requirementRef: 'REQ-LOGIN-01', scenarioType: 'edge_case', title: 'Login boundary', objective: 'Validasi batas', preconditions: 'Akun aktif',
          steps: ['Buka login', 'Masukkan input batas'], expectedResult: 'Batas ditangani', priority: 'medium', tags: [], notes: '', scenarios: [], edgeCases: [],
        }],
      },
    });
    expect(drafts).toHaveLength(3);
    expect(drafts[0].steps).toContain('1. Buka login');
    expect(drafts.every((draft) => draft.requirementRef === 'REQ-LOGIN-01')).toBe(true);
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

  it('menghitung summary tanpa mengubah status result', () => {
    const summary = calculateTestRunSummary([{ status: 'pass' }, { status: 'fail' }, { status: 'not_run' }]);
    expect(summary).toMatchObject({ total: 3, executed: 2, pass: 1, fail: 1, notRun: 1, progressPercent: 67 });
  });
});
