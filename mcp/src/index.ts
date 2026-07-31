import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { loadConfig } from "./config.js";
import { AuthRepository } from "./repositories/authRepository.js";
import { AuthService } from "./services/authService.js";
import { ReadRepository } from "./repositories/readRepository.js";
import { ReadService } from "./services/readService.js";
import { WriteRepository } from "./repositories/writeRepository.js";
import { WriteService } from "./services/writeService.js";
import { AutomationRepository } from "./repositories/automationRepository.js";
import { AutomationService } from "./services/automationService.js";
import { RepoRepository } from "./repositories/repoRepository.js";
import { RepoService } from "./services/repoService.js";
import { createAutomationReadToolRegistrar, createAutomationWriteToolRegistrar } from "./tools/automationTools.js";
import { createReadToolRegistrar } from "./tools/readTools.js";
import { createWriteToolRegistrar } from "./tools/writeTools.js";
import { createRepoToolRegistrar } from "./tools/repoTools.js";
import { registerTools, toolRegistry } from "./tools/registry.js";

const config = loadConfig();
const authService = new AuthService(config, new AuthRepository(config));
const session = await authService.createSession();
const readService = new ReadService(session, new ReadRepository(config));
const writeService = new WriteService(new WriteRepository(config));
const automationService = new AutomationService(new AutomationRepository(config));
const repoService = new RepoService(new RepoRepository(config));

const server = new McpServer({
  name: "testmanager",
  version: "0.1.0",
});

registerTools(server, {
  read: [...toolRegistry.read, createReadToolRegistrar(session, readService), createAutomationReadToolRegistrar(session, automationService), createRepoToolRegistrar(session, repoService)],
  write: [...toolRegistry.write, createWriteToolRegistrar(session, writeService), createAutomationWriteToolRegistrar(session, automationService)],
}, config.readonly);

const transport = new StdioServerTransport();

const shutdown = async (): Promise<void> => {
  await server.close();
  process.exit(0);
};

process.once("SIGINT", () => void shutdown());
process.once("SIGTERM", () => void shutdown());

await server.connect(transport);
