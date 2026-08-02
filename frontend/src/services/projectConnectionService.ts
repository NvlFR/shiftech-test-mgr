import { projectConnectionRepository } from '../repositories/projectConnectionRepository';
import { PROJECT_PROMPT_STARTERS } from '../data/projectPromptStarters';
import type { ApiToken, ApiTokenScope, CreatedApiToken, Environment, Module } from '../types/domain';

export interface ProjectConnectionConfig {
  projectId: string;
  projectName: string;
  projectUrl: string;
  mcp: McpConnectionConfig;
  setupSteps: ProjectConnectionSetupStep[];
  prompts: ProjectPromptStarter[];
  activeTokens: ApiToken[];
  lastMcpUsedAt: string | null;
}

export interface ProjectPromptStarter {
  id: string;
  category: string;
  title: string;
  description: string;
  prompt: string;
  requiresBootstrapCode?: boolean;
}

export interface RunnerBootstrapPrompt {
  command: string;
  prompt: string;
  expiresAt: string;
  existingRunnerIds: string[];
}

export interface ProjectConnectionSetupStep {
  id: 'add-server' | 'authenticate' | 'install-skills';
  title: string;
  description: string;
  command: string;
  optional?: boolean;
  note?: string;
}

export type McpClientId = 'claude-code' | 'cursor' | 'claude-desktop' | 'vs-code' | 'windsurf';

export interface McpClientOption {
  id: McpClientId;
  name: string;
  disabled: boolean;
}

export interface McpConnectionConfig {
  clientId: McpClientId;
  clients: McpClientOption[];
  readOnly: boolean;
  readonlyEnvironment: 'TM_MCP_READONLY=0' | 'TM_MCP_READONLY=1';
  availableToolCount: number;
  featureGroups: McpFeatureGroupOption[];
  selectedFeatureGroups: McpFeatureGroupId[];
  activeToolNames: string[];
  toolCountWarningThreshold: number;
  exceedsToolCountWarning: boolean;
}

export type McpFeatureGroupId =
  | 'DISCOVERY'
  | 'TEST-CASE'
  | 'TEST-PLAN'
  | 'TEST-RUN'
  | 'ISSUE'
  | 'AUTOMATION'
  | 'REPO'
  | 'ANALYSIS'
  | 'DOCS';

export interface McpFeatureGroupOption {
  id: McpFeatureGroupId;
  label: McpFeatureGroupId;
  tools: { name: string; write: boolean }[];
}

const TOOL_COUNT_WARNING_THRESHOLD = 30;
const FEATURE_GROUPS: McpFeatureGroupOption[] = [
  { id: 'DISCOVERY', label: 'DISCOVERY', tools: [
    { name: 'testmanager.project.list', write: false }, { name: 'testmanager.project.get', write: false },
  ] },
  { id: 'TEST-CASE', label: 'TEST-CASE', tools: [
    { name: 'testmanager.testcase.search', write: false }, { name: 'testmanager.testcase.get', write: false },
    { name: 'testmanager.testcase.create_bulk', write: true }, { name: 'testmanager.testcase.update', write: true },
    { name: 'testmanager.testcase.duplicate', write: true }, { name: 'testmanager.testcase.archive', write: true },
  ] },
  { id: 'TEST-PLAN', label: 'TEST-PLAN', tools: [
    { name: 'testmanager.testplan.list', write: false }, { name: 'testmanager.testplan.get', write: false },
    { name: 'testmanager.testplan.create', write: true }, { name: 'testmanager.testplan.add_cases', write: true },
    { name: 'testmanager.testplan.remove_cases', write: true },
  ] },
  { id: 'TEST-RUN', label: 'TEST-RUN', tools: [
    { name: 'testmanager.testrun.list', write: false }, { name: 'testmanager.testrun.get', write: false },
    { name: 'testmanager.testresult.list', write: false }, { name: 'testmanager.testrun.create', write: true },
    { name: 'testmanager.testrun.record_result', write: true }, { name: 'testmanager.testrun.complete', write: true },
  ] },
  { id: 'ISSUE', label: 'ISSUE', tools: [
    { name: 'testmanager.issue.search', write: false }, { name: 'testmanager.issue.get', write: false },
    { name: 'testmanager.issue.create', write: true }, { name: 'testmanager.issue.comment', write: true },
    { name: 'testmanager.issue.update_status', write: true }, { name: 'testmanager.issue.detect_duplicate', write: true },
  ] },
  { id: 'AUTOMATION', label: 'AUTOMATION', tools: [
    { name: 'testmanager.automation.job_status', write: false }, { name: 'testmanager.automation.runner_list', write: false },
    { name: 'testmanager.automation.map_script', write: true }, { name: 'testmanager.automation.enqueue', write: true },
    { name: 'testmanager.automation.rerun_failed', write: true }, { name: 'testmanager.automation.verify_regression', write: true },
  ] },
  { id: 'REPO', label: 'REPO', tools: [
    { name: 'testmanager.repo.list_files', write: false }, { name: 'testmanager.repo.read_file', write: false },
    { name: 'testmanager.repo.search', write: false }, { name: 'testmanager.repo.diff', write: false },
  ] },
  { id: 'ANALYSIS', label: 'ANALYSIS', tools: [
    { name: 'testmanager.analysis.run_summary', write: false }, { name: 'testmanager.analysis.flaky_candidates', write: false },
    { name: 'testmanager.analysis.suggest_retest', write: false },
  ] },
  { id: 'DOCS', label: 'DOCS', tools: [
    { name: 'testmanager.requirement.list', write: false }, { name: 'testmanager.requirement.get', write: false },
    { name: 'testmanager.requirement.coverage', write: false }, { name: 'testmanager.artifact.get_url', write: false },
  ] },
];
const DEFAULT_FEATURE_GROUPS = FEATURE_GROUPS
  .map(({ id }) => id)
  .filter((id): id is McpFeatureGroupId => id !== 'AUTOMATION' && id !== 'REPO');
const MCP_CLIENTS: McpClientOption[] = [
  { id: 'claude-code', name: 'Claude Code', disabled: false },
  { id: 'cursor', name: 'Cursor', disabled: true },
  { id: 'claude-desktop', name: 'Claude Desktop', disabled: true },
  { id: 'vs-code', name: 'VS Code', disabled: true },
  { id: 'windsurf', name: 'Windsurf', disabled: true },
];

function scopesForMcp(mcp: McpConnectionConfig): ApiTokenScope[] {
  if (mcp.readOnly) return ['read:project'];
  const scopes: ApiTokenScope[] = ['read:project'];
  const selected = new Set(mcp.selectedFeatureGroups);
  if (selected.has('TEST-RUN')) scopes.push('write:test-runs', 'write:test-results');
  if (selected.has('ISSUE')) scopes.push('write:issues');
  return scopes;
}

export function createProjectPromptStarters(projectId: string, projectName: string, modules: Module[], environments: Environment[], bootstrapCommand = ''): ProjectPromptStarter[] {
  const values: Record<string, string> = {
    projectId,
    projectName,
    modules: modules.length > 0
      ? modules.map((module) => `${module.code} — ${module.name} (ID: ${module.id})`).join('; ')
      : 'belum ada module terdaftar',
    environments: environments.length > 0
      ? environments.map((environment) => `${environment.name} (ID: ${environment.id}${environment.baseUrl ? `, URL: ${environment.baseUrl}` : ''})`).join('; ')
      : 'belum ada environment aktif terdaftar',
    bootstrapCommand,
  };

  return PROJECT_PROMPT_STARTERS.map((starter) => ({
    id: starter.id,
    category: starter.category,
    title: starter.title,
    description: starter.description,
    prompt: starter.template.replace(/{{(projectId|projectName|modules|environments|bootstrapCommand)}}/g, (_, key: string) => values[key] ?? ''),
    requiresBootstrapCode: starter.id === 'connect-runner' && !bootstrapCommand,
  }));
}

function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'"'"'`)}'`;
}

function createRunnerPrompt(projectId: string, projectName: string, bootstrapCode: string, name = 'Local Runner', labels: string[] = []): { command: string; prompt: string; npmCommands: string; dockerCommands: string } {
  if (!/^tmb_[0-9a-f]{48}$/.test(bootstrapCode)) throw new Error('Bootstrap code runner tidak valid');
  const runnerEnvironment = `TM_RUNNER_NAME=${shellQuote(name)} TM_RUNNER_LABELS=${shellQuote(labels.join(','))}`;
  const command = `${runnerEnvironment} npx @testmanager/runner init --code ${bootstrapCode}`;
  const npmCommands = [
    'npm install --save-dev @testmanager/runner',
    command,
    'npx tm-runner start',
  ].join('\n');
  const dockerEnvironment = `-e TM_RUNNER_NAME=${shellQuote(name)} -e TM_RUNNER_LABELS=${shellQuote(labels.join(','))}`;
  const dockerCommands = [
    `docker run --rm --env-file .env ${dockerEnvironment} -v "$PWD:/project" -w /project testmanager-local-runner init --code ${bootstrapCode}`,
    'docker run --rm --env-file .env -v "$PWD:/project" -w /project testmanager-local-runner start',
  ].join('\n');
  const starter = PROJECT_PROMPT_STARTERS.find(({ id }) => id === 'connect-runner');
  if (!starter) throw new Error('Prompt bootstrap runner tidak tersedia');
  return {
    command,
    prompt: starter.template.replace(/{{(projectId|projectName|bootstrapCommand)}}/g, (_, key: string) => ({ projectId, projectName, bootstrapCommand: command })[key as 'projectId' | 'projectName' | 'bootstrapCommand']),
    npmCommands,
    dockerCommands,
  };
}

function createMcpConfig(readOnly: boolean, selectedFeatureGroups = DEFAULT_FEATURE_GROUPS): McpConnectionConfig {
  const selected = new Set(selectedFeatureGroups);
  const activeToolNames = FEATURE_GROUPS
    .filter(({ id }) => selected.has(id))
    .flatMap(({ tools }) => tools)
    .filter((tool) => !readOnly || !tool.write)
    .map(({ name }) => name);
  return {
    clientId: 'claude-code',
    clients: MCP_CLIENTS,
    readOnly,
    readonlyEnvironment: `TM_MCP_READONLY=${readOnly ? '1' : '0'}`,
    availableToolCount: activeToolNames.length,
    featureGroups: FEATURE_GROUPS,
    selectedFeatureGroups,
    activeToolNames,
    toolCountWarningThreshold: TOOL_COUNT_WARNING_THRESHOLD,
    exceedsToolCountWarning: activeToolNames.length > TOOL_COUNT_WARNING_THRESHOLD,
  };
}

function createSetupSteps(projectId: string, applicationOrigin: string, mcp: McpConnectionConfig): ProjectConnectionSetupStep[] {
  const mcpUrl = `${applicationOrigin.replace(/\/$/, '')}/mcp`;
  const featureGroups = mcp.selectedFeatureGroups.join(',');
  const addServerCommand = [
    'claude mcp add --scope project --transport http',
    `--header "X-TestManager-Project-ID: ${projectId}"`,
    `--header "X-TestManager-Read-Only: ${mcp.readOnly ? '1' : '0'}"`,
    `--header "X-TestManager-Feature-Groups: ${featureGroups}"`,
    'testmanager',
    mcpUrl,
  ].join(' ');

  return [
    {
      id: 'add-server',
      title: 'Add MCP server',
      description: 'Daftarkan server TestManager untuk project dan pilihan tool saat ini.',
      command: addServerCommand,
    },
    {
      id: 'authenticate',
      title: 'Authenticate',
      description: 'Buka pengelola MCP, pilih server testmanager, lalu ikuti flow autentikasi.',
      command: 'claude /mcp',
      note: 'Jalankan perintah ini di terminal biasa, bukan di dalam ekstensi IDE.',
    },
    {
      id: 'install-skills',
      title: 'Install Agent Skills',
      description: 'Pasang skill pack TestManager ke project aktif.',
      command: 'npx skills add ffrz/shiftech-test-mgr',
      optional: true,
    },
  ];
}

function withMcpConfig(config: ProjectConnectionConfig, mcp: McpConnectionConfig): ProjectConnectionConfig {
  const applicationOrigin = new URL(config.projectUrl).origin;
  return { ...config, mcp, setupSteps: createSetupSteps(config.projectId, applicationOrigin, mcp) };
}

export const projectConnectionService = {
  async getConfig(projectId: string, applicationOrigin: string): Promise<ProjectConnectionConfig | null> {
    if (!projectId.trim()) throw new Error('Project ID tidak valid');
    const project = await projectConnectionRepository.findProjectById(projectId);
    if (!project) return null;

    const [modules, environments, activeTokens, latestMcpUsage] = await Promise.all([
      projectConnectionRepository.findModulesByProjectId(projectId),
      projectConnectionRepository.findEnvironmentsByProjectId(projectId),
      projectConnectionRepository.findActiveTokensByProjectId(projectId),
      projectConnectionRepository.findLatestMcpUsageByProjectId(projectId),
    ]);

    const mcp = createMcpConfig(false);
    return {
      projectId: project.id,
      projectName: project.name,
      projectUrl: `${applicationOrigin.replace(/\/$/, '')}/projects/${project.id}`,
      mcp,
      setupSteps: createSetupSteps(project.id, applicationOrigin, mcp),
      prompts: createProjectPromptStarters(project.id, project.name, modules, environments),
      activeTokens,
      lastMcpUsedAt: latestMcpUsage?.usedAt ?? null,
    };
  },

  setReadOnly(config: ProjectConnectionConfig, readOnly: boolean): ProjectConnectionConfig {
    return withMcpConfig(config, createMcpConfig(readOnly, config.mcp.selectedFeatureGroups));
  },

  setFeatureGroups(config: ProjectConnectionConfig, featureGroups: McpFeatureGroupId[]): ProjectConnectionConfig {
    const validGroups = FEATURE_GROUPS.map(({ id }) => id);
    const selectedFeatureGroups = validGroups.filter((id) => featureGroups.includes(id));
    return withMcpConfig(config, createMcpConfig(config.mcp.readOnly, selectedFeatureGroups));
  },

  async issueRunnerBootstrap(projectId: string, projectName: string, name = 'Local Runner', labels: string[] = []): Promise<RunnerBootstrapPrompt & { npmCommands: string; dockerCommands: string }> {
    if (!projectId.trim()) throw new Error('Project ID tidak valid');
    if (!name.trim()) throw new Error('Nama runner wajib diisi');
    if (name.trim().length > 120) throw new Error('Nama runner maksimal 120 karakter');
    const normalizedLabels = Array.from(new Set(labels.map((label) => label.trim().toLowerCase()).filter(Boolean)));
    const existingRunners = await projectConnectionRepository.findRunnersByProjectId(projectId);
    const issued = await projectConnectionRepository.issueRunnerBootstrapCode(projectId);
    const generated = createRunnerPrompt(projectId, projectName, issued.bootstrapCode, name.trim(), normalizedLabels);
    return { ...generated, expiresAt: issued.expiresAt, existingRunnerIds: existingRunners.map(({ id }) => id) };
  },

  async detectConnectedRunner(projectId: string, existingRunnerIds: string[]) {
    const existing = new Set(existingRunnerIds);
    const runners = await projectConnectionRepository.findRunnersByProjectId(projectId);
    return runners.find((runner) => !existing.has(runner.id) && runner.active && runner.lastSeenAt) ?? null;
  },

  async createToken(projectId: string, name: string, mcp: McpConnectionConfig): Promise<CreatedApiToken> {
    if (!projectId.trim()) throw new Error('Project ID tidak valid');
    if (!name.trim()) throw new Error('Nama token wajib diisi');
    return projectConnectionRepository.createToken(projectId, name.trim(), scopesForMcp(mcp));
  },

  async revokeToken(tokenId: string): Promise<void> {
    if (!tokenId.trim()) throw new Error('Token ID tidak valid');
    await projectConnectionRepository.revokeToken(tokenId);
  },
};
