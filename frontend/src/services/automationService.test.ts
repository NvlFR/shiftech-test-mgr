import { describe, expect, it } from 'vitest';
import { buildBulkScriptRef, getEligibleScriptRunners, getJobQueueDiagnosis, getRunnerReadableStatus } from './automationService';
import type { AutomationJob, AutomationRunner } from '../types/domain';

const now = new Date('2026-08-01T12:00:00Z').getTime();
const runner = { id: 'runner-1', active: true, lastSeenAt: '2026-08-01T11:59:55Z' } as AutomationRunner;

describe('script mapping helpers', () => {
  it('mencocokkan file hanya pada runner online yang memenuhi semua label', () => {
    const eligible = { ...runner, name: 'Runner QA', labels: ['linux', 'chromium'], scriptRefs: ['tests/TC-01.spec.ts'] } as AutomationRunner;
    const wrongLabel = { ...eligible, id: 'runner-2', labels: ['webkit'] };
    const result = getEligibleScriptRunners('tests/TC-01.spec.ts', ['linux'], [eligible, wrongLabel], [], now);
    expect(result.labelMatches.map((item) => item.id)).toEqual(['runner-1']);
    expect(result.fileMatches.map((item) => item.id)).toEqual(['runner-1']);
  });

  it('membangun referensi bulk dari kode dan slug judul', () => {
    expect(buildBulkScriptRef('e2e/{code}-{slug}.spec.ts', { code: 'TC-01', title: 'Login Pengguna' })).toBe('e2e/TC-01-login-pengguna.spec.ts');
  });
});

describe('getRunnerReadableStatus', () => {
  it('membedakan online, idle, sibuk, dan offline', () => {
    expect(getRunnerReadableStatus(runner, [], now)).toBe('online');
    expect(getRunnerReadableStatus({ ...runner, lastSeenAt: '2026-08-01T11:59:30Z' }, [], now)).toBe('idle');
    expect(getRunnerReadableStatus(runner, [{ runnerId: runner.id, status: 'running' } as AutomationJob], now)).toBe('busy');
    expect(getRunnerReadableStatus({ ...runner, lastSeenAt: '2026-08-01T11:58:59Z' }, [], now)).toBe('offline');
    expect(getRunnerReadableStatus({ ...runner, active: false }, [], now)).toBe('offline');
  });
});

describe('getJobQueueDiagnosis', () => {
  const queuedJob = { status: 'queued', requiredLabels: ['linux', 'chromium'], errorMessage: null } as AutomationJob;

  it('menjelaskan ketika semua runner offline', () => {
    expect(getJobQueueDiagnosis(queuedJob, [{ ...runner, lastSeenAt: '2026-08-01T11:58:00Z' }], [queuedJob], now)?.reason).toBe('all_runners_offline');
  });

  it('menjelaskan label wajib yang tidak dimiliki runner online', () => {
    const diagnosis = getJobQueueDiagnosis(queuedJob, [{ ...runner, labels: ['linux'] }], [queuedJob], now);
    expect(diagnosis).toMatchObject({ reason: 'label_mismatch', title: 'Label runner tidak cocok' });
    expect(diagnosis?.detail).toContain('linux, chromium');
  });

  it('memprioritaskan kegagalan jangkauan environment dari attempt sebelumnya', () => {
    const diagnosis = getJobQueueDiagnosis({ ...queuedJob, errorMessage: 'Sanity check base URL gagal: https://staging.example.test tidak dapat dijangkau' }, [], [queuedJob], now);
    expect(diagnosis).toMatchObject({ reason: 'environment_unreachable', title: 'Environment tidak terjangkau' });
  });

  it('menjelaskan bahwa runner yang cocok akan mengambil job pada polling berikutnya', () => {
    const diagnosis = getJobQueueDiagnosis(queuedJob, [{ ...runner, name: 'Runner QA', labels: ['linux', 'chromium'] }], [queuedJob], now);
    expect(diagnosis).toMatchObject({ reason: 'waiting_for_runner' });
    expect(diagnosis?.detail).toContain('Runner QA');
  });

  it('tidak memberi diagnosis antrean untuk job yang sudah berjalan', () => {
    expect(getJobQueueDiagnosis({ ...queuedJob, status: 'running' }, [runner], [], now)).toBeNull();
  });
});
