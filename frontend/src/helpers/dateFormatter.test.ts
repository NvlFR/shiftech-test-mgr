import { describe, expect, it } from 'vitest';
import { formatDate, formatDateTime } from './dateFormatter';

describe('dateFormatter', () => {
  it('memformat tanggal ISO dengan locale Indonesia', () => {
    expect(formatDate('2026-08-01T12:00:00')).toBe('01 Agu 2026');
  });

  it('mempertahankan komponen waktu sampai menit', () => {
    const formatted = formatDateTime('2026-08-01T12:34:56.789');

    expect(formatted).toContain('01 Agu 2026');
    expect(formatted).toMatch(/12[.:]34/);
    expect(formatted).not.toMatch(/56|789/);
  });

  it('menghormati offset zona waktu pada input ISO', () => {
    expect(formatDate('2026-08-02T00:30:00+14:00')).toBe(formatDate('2026-08-01T10:30:00Z'));
    expect(formatDateTime('2026-08-02T00:30:00+14:00')).toBe(formatDateTime('2026-08-01T10:30:00Z'));
  });

  it('mengembalikan representasi Invalid Date untuk input tidak valid', () => {
    expect(formatDate('bukan-tanggal')).toBe('Invalid Date');
    expect(formatDateTime('')).toBe('Invalid Date');
  });
});
