import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { loadConfig } from "./config.js";
import { startHttpTransport } from "./httpTransport.js";
import { AuthRepository } from "./repositories/authRepository.js";
import { createMcpServer } from "./server.js";
import { AuthService } from "./services/authService.js";

const config = loadConfig();
const session = await new AuthService(config, new AuthRepository(config)).createSession();
let shutdown: () => Promise<void>;

if (config.transport === "http") {
  const httpTransport = await startHttpTransport(config, session);
  shutdown = () => httpTransport.close();
} else {
  const server = createMcpServer(config, session);
  await server.connect(new StdioServerTransport());
  shutdown = () => server.close();
}

const exit = (): void => {
  void shutdown().finally(() => process.exit(0));
};
process.once("SIGINT", exit);
process.once("SIGTERM", exit);
