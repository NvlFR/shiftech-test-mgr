import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { GovernanceService } from "../services/governanceService.js";

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

export const installToolGovernance = (server: McpServer, governance: GovernanceService): void => {
  type RegisterTool = (...args: unknown[]) => unknown;
  const original = (server.registerTool as unknown as RegisterTool).bind(server);
  (server as unknown as { registerTool: RegisterTool }).registerTool = (...args: unknown[]): unknown => {
    const toolName = args[0];
    const handlerIndex = args.length - 1;
    const handler = args[handlerIndex];
    if (typeof toolName !== "string" || typeof handler !== "function") return original(...args);
    const governedHandler = (...handlerArgs: unknown[]): Promise<unknown> =>
      governance.execute(toolName, () => Promise.resolve(handler(...handlerArgs)));
    return original(...args.slice(0, handlerIndex), governedHandler);
  };
};
