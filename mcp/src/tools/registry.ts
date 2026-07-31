import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export type ToolRegistrar = (server: McpServer) => void;

export interface ToolRegistry {
  read: readonly ToolRegistrar[];
  write: readonly ToolRegistrar[];
}

export const toolRegistry: ToolRegistry = {
  read: [],
  write: [],
};

export const registerTools = (
  server: McpServer,
  registry: ToolRegistry,
  isReadonly: boolean,
): void => {
  for (const register of registry.read) {
    register(server);
  }

  if (isReadonly) {
    return;
  }

  for (const register of registry.write) {
    register(server);
  }
};
