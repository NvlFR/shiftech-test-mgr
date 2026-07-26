#!/usr/bin/env node
import { loadConfig } from './config.js';
import { Runner } from './runner.js';
import { log } from './logger.js';

async function main(): Promise<void> {
  const config = loadConfig();
  const runner = new Runner(config);

  const shutdown = (signal: string) => {
    log.info(`Received ${signal}, stopping after current job...`);
    runner.stop();
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  await runner.start();
}

main().catch((err) => {
  log.error('Fatal error', { error: err instanceof Error ? err.message : String(err) });
  process.exit(1);
});
