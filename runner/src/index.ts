#!/usr/bin/env node
import { loadConfig, loadInteractiveConfig, parseCliInput } from './config.js';
import { Runner } from './runner.js';
import { log } from './logger.js';
import { runInteractiveCommand } from './interactive.js';
import { runCodegen } from './codegen.js';
import { runScriptSync } from './sync.js';
import { runInit } from './init.js';

async function main(): Promise<void> {
  const cli = parseCliInput(process.argv.slice(2));
  if (cli.command === 'init') {
    process.exitCode = await runInit(cli.initDirectory);
    return;
  }
  if (cli.command === 'codegen') {
    process.exitCode = await runCodegen(loadConfig(), cli.codegenUrl!);
    return;
  }
  if (cli.command === 'sync') {
    process.exitCode = await runScriptSync(loadConfig());
    return;
  }
  if (cli.command !== 'start') {
    const exitCode = await runInteractiveCommand(loadInteractiveConfig(), cli.command, cli.playwrightArgs);
    process.exitCode = exitCode;
    return;
  }
  const config = loadConfig('.env', cli.options);
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
