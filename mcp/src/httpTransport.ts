import { randomUUID } from "node:crypto";
import { createServer, type IncomingMessage, type Server as HttpServer, type ServerResponse } from "node:http";

import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";

import type { ServerConfig } from "./config.js";
import type { ProjectSession } from "./services/authService.js";
import { createMcpServer } from "./server.js";

type RemoteTransport = StreamableHTTPServerTransport | SSEServerTransport;
const MAX_BODY_BYTES = 1_048_576;

const sendJsonError = (res: ServerResponse, status: number, message: string): void => {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify({ jsonrpc: "2.0", error: { code: -32000, message }, id: null }));
};

const readJsonBody = async (req: IncomingMessage): Promise<unknown> => {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;
    if (size > MAX_BODY_BYTES) throw new Error("Request body exceeds 1 MiB");
    chunks.push(buffer);
  }
  if (chunks.length === 0) return undefined;
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
};

export interface RunningHttpTransport {
  server: HttpServer;
  close(): Promise<void>;
}

export const startHttpTransport = async (config: ServerConfig, session: ProjectSession): Promise<RunningHttpTransport> => {
  const transports = new Map<string, RemoteTransport>();
  const servers = new Set<ReturnType<typeof createMcpServer>>();

  const httpServer = createServer(async (req, res) => {
    try {
      const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);

      if (url.pathname === "/health" && req.method === "GET") {
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({ status: "ok" }));
        return;
      }

      if (url.pathname === "/mcp") {
        const sessionId = req.headers["mcp-session-id"];
        const existing = typeof sessionId === "string" ? transports.get(sessionId) : undefined;
        let transport = existing instanceof StreamableHTTPServerTransport ? existing : undefined;
        const body = req.method === "POST" ? await readJsonBody(req) : undefined;

        if (!transport && req.method === "POST" && isInitializeRequest(body)) {
          transport = new StreamableHTTPServerTransport({
            sessionIdGenerator: randomUUID,
            onsessioninitialized: (id) => {
              transports.set(id, transport!);
            },
          });
          const mcpServer = createMcpServer(config, session);
          servers.add(mcpServer);
          transport.onclose = () => {
            if (transport?.sessionId) transports.delete(transport.sessionId);
            servers.delete(mcpServer);
          };
          await mcpServer.connect(transport);
        }

        if (!transport) {
          sendJsonError(res, sessionId ? 404 : 400, "No valid MCP session");
          return;
        }
        await transport.handleRequest(req, res, body);
        return;
      }

      if (url.pathname === "/sse" && req.method === "GET") {
        const transport = new SSEServerTransport("/messages", res);
        transports.set(transport.sessionId, transport);
        const mcpServer = createMcpServer(config, session);
        servers.add(mcpServer);
        transport.onclose = () => {
          transports.delete(transport.sessionId);
          servers.delete(mcpServer);
        };
        await mcpServer.connect(transport);
        return;
      }

      if (url.pathname === "/messages" && req.method === "POST") {
        const sessionId = url.searchParams.get("sessionId");
        const transport = sessionId ? transports.get(sessionId) : undefined;
        if (!(transport instanceof SSEServerTransport)) {
          sendJsonError(res, 404, "No valid SSE session");
          return;
        }
        await transport.handlePostMessage(req, res, await readJsonBody(req));
        return;
      }

      sendJsonError(res, 404, "Not found");
    } catch (error) {
      if (!res.headersSent) sendJsonError(res, 400, error instanceof Error ? error.message : "Invalid request");
      else res.end();
    }
  });

  await new Promise<void>((resolve, reject) => {
    httpServer.once("error", reject);
    httpServer.listen(config.httpPort ?? 3000, config.httpHost ?? "127.0.0.1", () => {
      httpServer.off("error", reject);
      resolve();
    });
  });

  return {
    server: httpServer,
    close: async () => {
      await Promise.allSettled([...transports.values()].map((transport) => transport.close()));
      await Promise.allSettled([...servers].map((server) => server.close()));
      await new Promise<void>((resolve, reject) => httpServer.close((error) => error ? reject(error) : resolve()));
    },
  };
};
