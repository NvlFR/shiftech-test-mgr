import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { loadConfig } from "./config.js";

const config = loadConfig();

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

// Config is loaded at startup so future tools share one project-scoped session.
void config;

await server.connect(transport);
