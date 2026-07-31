import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { loadConfig } from "./config.js";
import { AuthRepository } from "./repositories/authRepository.js";
import { AuthService } from "./services/authService.js";

const config = loadConfig();
const authService = new AuthService(config, new AuthRepository(config));
const session = await authService.createSession();

const server = new McpServer({
  name: "testmanager",
  version: "0.1.0",
});

const transport = new StdioServerTransport();

const shutdown = async (): Promise<void> => {
  await server.close();
  process.exit(0);
};

process.once("SIGINT", () => void shutdown());
process.once("SIGTERM", () => void shutdown());

// Future tools must receive this single authenticated, project-scoped session
// and call assertToolArguments before invoking their service layer.
void session;

await server.connect(transport);
