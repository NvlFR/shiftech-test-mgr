import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import type { ServerConfig } from "./config.js";
import { AnalysisRepository } from "./repositories/analysisRepository.js";
import { AutomationRepository } from "./repositories/automationRepository.js";
import { GovernanceRepository } from "./repositories/governanceRepository.js";
import { ReadRepository } from "./repositories/readRepository.js";
import { RepoRepository } from "./repositories/repoRepository.js";
import { WriteRepository } from "./repositories/writeRepository.js";
import { AnalysisService } from "./services/analysisService.js";
import { AutomationService } from "./services/automationService.js";
import { GovernanceService } from "./services/governanceService.js";
import type { ProjectSession } from "./services/authService.js";
import { ReadService } from "./services/readService.js";
import { RepoService } from "./services/repoService.js";
import { WriteService } from "./services/writeService.js";
import { createAnalysisToolRegistrar } from "./tools/analysisTools.js";
import { createAutomationReadToolRegistrar, createAutomationWriteToolRegistrar } from "./tools/automationTools.js";
import { createReadToolRegistrar } from "./tools/readTools.js";
import { createRepoToolRegistrar } from "./tools/repoTools.js";
import { installToolGovernance, registerTools, toolRegistry } from "./tools/registry.js";
import { createWriteToolRegistrar } from "./tools/writeTools.js";

export const createMcpServer = (config: ServerConfig, session: ProjectSession): McpServer => {
  const readService = new ReadService(session, new ReadRepository(config));
  const writeService = new WriteService(new WriteRepository(config));
  const repoService = new RepoService(new RepoRepository(config));
  const automationService = new AutomationService(new AutomationRepository(config), repoService);
  const analysisService = new AnalysisService(new AnalysisRepository(config));
  const server = new McpServer({ name: "testmanager", version: "0.1.0" });

  installToolGovernance(server, new GovernanceService(new GovernanceRepository(config)));
  registerTools(server, {
    read: [...toolRegistry.read, createReadToolRegistrar(session, readService), createAutomationReadToolRegistrar(session, automationService), createRepoToolRegistrar(session, repoService), createAnalysisToolRegistrar(session, analysisService)],
    write: [...toolRegistry.write, createWriteToolRegistrar(session, writeService), createAutomationWriteToolRegistrar(session, automationService)],
  }, config.readonly);

  return server;
};
