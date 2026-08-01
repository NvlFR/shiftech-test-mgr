import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { formatCrash, installCrashHandlers, registerEnvironmentSecrets, RunnerTokenAuth, SupabaseRpcTransport } from "@testmanager/agent-core";

import { loadConfig } from "./config.js";
import { startHttpTransport } from "./httpTransport.js";
import { AuthRepository } from "./repositories/authRepository.js";
import { createMcpServer } from "./server.js";
import { AuthService } from "./services/authService.js";
import { HeartbeatService } from "./services/heartbeatService.js";
import { log } from "./helpers/logger.js";

registerEnvironmentSecrets();
installCrashHandlers(log);

async function main(): Promise<void> {
  const config = loadConfig();
  const centralTransport = new SupabaseRpcTransport({ supabaseUrl: config.supabaseUrl, supabaseAnonKey: config.supabaseAnonKey });
  const agentAuth = new RunnerTokenAuth({ token: config.apiToken, subject: config.projectId });
  const session = await new AuthService(config, new AuthRepository(centralTransport, agentAuth)).createSession();
  const heartbeat = new HeartbeatService(centralTransport, agentAuth);
  await heartbeat.beat();
  const heartbeatTimer = setInterval(() => {
    void heartbeat.beat().catch((error: unknown) => log.warn('MCP heartbeat failed', { error: error instanceof Error ? error.message : String(error) }));
  }, config.heartbeatIntervalMs ?? 30_000);
  let shutdown: () => Promise<void>;

  if (config.transport === "http") {
    const httpTransport = await startHttpTransport(config, session, centralTransport);
    shutdown = () => httpTransport.close();
  } else {
    const server = createMcpServer(config, session, centralTransport);
    await server.connect(new StdioServerTransport());
    shutdown = () => server.close();
  }

  const exit = (): void => { clearInterval(heartbeatTimer); void shutdown().finally(() => process.exit(0)); };
  process.once("SIGINT", exit);
  process.once("SIGTERM", exit);
  log.info("MCP server started", { transport: config.transport });
}

main().catch((error) => {
  log.error("Fatal error", formatCrash(error));
  process.exitCode = 1;
});
