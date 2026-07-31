import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as z from "zod/v4";

import { successResponse, withErrorHandling } from "../helpers/response.js";
import type { ProjectSession } from "../services/authService.js";
import type { RepoService } from "../services/repoService.js";

const annotations = { destructiveHint: false, readOnlyHint: true, idempotentHint: true } as const;
const repositoryId = z.string().uuid().describe("Project repository UUID configured in TestManager");
const path = z.string().max(1000).optional().describe("Path relative to the configured repository subdirectory");

export const createRepoToolRegistrar = (session: ProjectSession, service: RepoService) => (server: McpServer): void => {
  const run = (args: unknown, action: () => Promise<unknown>) => withErrorHandling(async () => {
    session.assertToolArguments(args);
    return successResponse(await action());
  });

  server.registerTool("testmanager.repo.list_files", {
    description: "List tracked source files under an active repository configured for the scoped project.",
    inputSchema: { repository_id: repositoryId, path, limit: z.number().int().min(1).max(100).optional() }, annotations,
  }, async args => run(args, () => service.listFiles(args.repository_id, args.path, args.limit)));

  server.registerTool("testmanager.repo.read_file", {
    description: "Read one bounded UTF-8 source file from a configured project repository.",
    inputSchema: { repository_id: repositoryId, path: z.string().min(1).max(1000) }, annotations,
  }, async args => run(args, () => service.readFile(args.repository_id, args.path)));

  server.registerTool("testmanager.repo.search", {
    description: "Search tracked text source files for a literal string.",
    inputSchema: { repository_id: repositoryId, query: z.string().min(1).max(500), path, limit: z.number().int().min(1).max(100).optional() }, annotations,
  }, async args => run(args, () => service.search(args.repository_id, args.query, args.path, args.limit)));

  server.registerTool("testmanager.repo.diff", {
    description: "Return changed files and a bounded patch between a commit/tag/branch and a head revision for regression selection.",
    inputSchema: { repository_id: repositoryId, base: z.string().min(1).max(200), head: z.string().min(1).max(200).optional(), path }, annotations,
  }, async args => run(args, () => service.diff(args.repository_id, args.base, args.head, args.path)));
};
