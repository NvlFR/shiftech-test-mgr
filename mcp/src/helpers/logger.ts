import { createLogger } from '@testmanager/agent-core';

// stdout is reserved for the MCP stdio protocol, including informational logs.
export const log = createLogger('mcp', (line) => process.stderr.write(`${line}\n`));
