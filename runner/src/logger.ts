type Level = 'info' | 'warn' | 'error';

function emit(level: Level, message: string, meta?: Record<string, unknown>): void {
  const line = `${new Date().toISOString()} [${level.toUpperCase()}] ${message}`;
  const payload = meta && Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
  const stream = level === 'error' ? process.stderr : process.stdout;
  stream.write(`${line}${payload}\n`);
}

export const log = {
  info: (message: string, meta?: Record<string, unknown>) => emit('info', message, meta),
  warn: (message: string, meta?: Record<string, unknown>) => emit('warn', message, meta),
  error: (message: string, meta?: Record<string, unknown>) => emit('error', message, meta),
};
