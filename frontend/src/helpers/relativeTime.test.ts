import { describe, expect, it } from 'vitest';
import { formatDurationSince, formatRelativeTime } from './relativeTime';

describe('relativeTime', () => {
  const now = new Date('2026-08-01T12:00:00Z').getTime();

  it('menampilkan heartbeat dalam bahasa manusia', () => {
    expect(formatRelativeTime('2026-08-01T11:58:00Z', now)).toBe('2 menit lalu');
    expect(formatRelativeTime(null, now)).toBe('belum pernah');
  });

  it('menghitung uptime dari waktu proses mulai', () => {
    expect(formatDurationSince('2026-08-01T09:45:00Z', now)).toBe('2 jam 15 menit');
  });
});
