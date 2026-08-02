export function formatRelativeTime(value: string | null, now = Date.now()): string {
  if (!value) return 'belum pernah';
  const seconds = Math.max(0, Math.floor((now - new Date(value).getTime()) / 1_000));
  if (seconds < 10) return 'baru saja';
  if (seconds < 60) return `${seconds} detik lalu`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} menit lalu`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} jam lalu`;
  return `${Math.floor(hours / 24)} hari lalu`;
}

export function formatDurationSince(value: string | null, now = Date.now()): string {
  if (!value) return 'Tidak tersedia';
  const minutes = Math.max(0, Math.floor((now - new Date(value).getTime()) / 60_000));
  if (minutes < 60) return `${minutes} menit`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} jam ${minutes % 60} menit`;
  return `${Math.floor(hours / 24)} hari ${hours % 24} jam`;
}
