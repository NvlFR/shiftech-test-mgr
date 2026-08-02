import { afterEach, describe, expect, it, vi } from 'vitest';
import { createProjectPromptStarters, projectConnectionService, type ProjectConnectionConfig } from './projectConnectionService';
import { projectConnectionRepository } from '../repositories/projectConnectionRepository';
import type { AutomationRunner } from '../types/domain';

const baseConfig: ProjectConnectionConfig = {
  projectId: 'project-id',
  projectName: 'Project',
  projectUrl: 'https://example.test/projects/project-id',
  setupSteps: [],
  prompts: [],
  activeTokens: [],
  lastMcpUsedAt: null,
  mcp: {
    clientId: 'claude-code',
    clients: [],
    readOnly: false,
    readonlyEnvironment: 'TM_MCP_READONLY=0',
    availableToolCount: 42,
    featureGroups: [],
    selectedFeatureGroups: ['DISCOVERY', 'TEST-CASE', 'TEST-PLAN', 'TEST-RUN', 'ISSUE', 'AUTOMATION', 'REPO', 'ANALYSIS', 'DOCS'],
    activeToolNames: [],
    toolCountWarningThreshold: 30,
    exceedsToolCountWarning: true,
  },
};

describe('projectConnectionService', () => {
  afterEach(() => vi.restoreAllMocks());

  it('exposes the latest MCP audit timestamp in the project connection config', async () => {
    vi.spyOn(projectConnectionRepository, 'findProjectById').mockResolvedValue({
      id: 'project-id',
      name: 'Checkout App',
    } as never);
    vi.spyOn(projectConnectionRepository, 'findModulesByProjectId').mockResolvedValue([]);
    vi.spyOn(projectConnectionRepository, 'findEnvironmentsByProjectId').mockResolvedValue([]);
    vi.spyOn(projectConnectionRepository, 'findActiveTokensByProjectId').mockResolvedValue([]);
    vi.spyOn(projectConnectionRepository, 'findLatestMcpUsageByProjectId').mockResolvedValue({
      usedAt: '2026-08-01T10:15:00.000Z',
    });

    const result = await projectConnectionService.getConfig('project-id', 'https://testmanager.example');

    expect(projectConnectionRepository.findLatestMcpUsageByProjectId).toHaveBeenCalledWith('project-id');
    expect(result?.lastMcpUsedAt).toBe('2026-08-01T10:15:00.000Z');
  });

  it('uses an empty MCP status when the project has no audit event yet', async () => {
    vi.spyOn(projectConnectionRepository, 'findProjectById').mockResolvedValue({
      id: 'project-id',
      name: 'Checkout App',
    } as never);
    vi.spyOn(projectConnectionRepository, 'findModulesByProjectId').mockResolvedValue([]);
    vi.spyOn(projectConnectionRepository, 'findEnvironmentsByProjectId').mockResolvedValue([]);
    vi.spyOn(projectConnectionRepository, 'findActiveTokensByProjectId').mockResolvedValue([]);
    vi.spyOn(projectConnectionRepository, 'findLatestMcpUsageByProjectId').mockResolvedValue(null);

    const result = await projectConnectionService.getConfig('project-id', 'https://testmanager.example');

    expect(result?.lastMcpUsedAt).toBeNull();
  });

  it('maps read-only mode to the environment and counts only read tools', () => {
    const result = projectConnectionService.setReadOnly(baseConfig, true);

    expect(result.mcp.readOnly).toBe(true);
    expect(result.mcp.readonlyEnvironment).toBe('TM_MCP_READONLY=1');
    expect(result.mcp.availableToolCount).toBe(24);
  });

  it('restores write tools when read-only mode is disabled', () => {
    const result = projectConnectionService.setReadOnly(baseConfig, false);

    expect(result.mcp.readonlyEnvironment).toBe('TM_MCP_READONLY=0');
    expect(result.mcp.availableToolCount).toBe(42);
    expect(result.mcp.clients.filter((client) => !client.disabled).map((client) => client.name))
      .toEqual(['Claude Code']);
  });

  it('counts the standard selection without AUTOMATION and REPO', () => {
    const result = projectConnectionService.setFeatureGroups(baseConfig, [
      'DISCOVERY', 'TEST-CASE', 'TEST-PLAN', 'TEST-RUN', 'ISSUE', 'ANALYSIS', 'DOCS',
    ]);

    expect(result.mcp.selectedFeatureGroups).not.toContain('AUTOMATION');
    expect(result.mcp.selectedFeatureGroups).not.toContain('REPO');
    expect(result.mcp.availableToolCount).toBe(32);
    expect(result.mcp.exceedsToolCountWarning).toBe(true);
  });

  it('filters write tools from selected groups in read-only mode', () => {
    const selected = projectConnectionService.setFeatureGroups(baseConfig, ['TEST-CASE', 'REPO']);
    const result = projectConnectionService.setReadOnly(selected, true);

    expect(result.mcp.availableToolCount).toBe(6);
    expect(result.mcp.activeToolNames).toEqual([
      'testmanager.testcase.search', 'testmanager.testcase.get',
      'testmanager.repo.list_files', 'testmanager.repo.read_file',
      'testmanager.repo.search', 'testmanager.repo.diff',
    ]);
    expect(result.setupSteps[0]?.command).toContain('X-TestManager-Read-Only: 1');
    expect(result.setupSteps[0]?.command).toContain('X-TestManager-Feature-Groups: TEST-CASE,REPO');
  });

  it('regenerates the add-server command when feature groups change', () => {
    const result = projectConnectionService.setFeatureGroups(baseConfig, ['DISCOVERY', 'DOCS']);

    expect(result.setupSteps[0]?.command).toBe(
      'claude mcp add --scope project --transport http --header "X-TestManager-Project-ID: project-id" --header "X-TestManager-Read-Only: 0" --header "X-TestManager-Feature-Groups: DISCOVERY,DOCS" testmanager https://example.test/mcp',
    );
    expect(result.setupSteps.map((step) => step.id)).toEqual(['add-server', 'authenticate', 'install-skills']);
  });

  it('creates every prompt category with project, module, and environment context', () => {
    const prompts = createProjectPromptStarters(
      'project-id',
      'Checkout App',
      [{ id: 'module-id', projectId: 'project-id', code: 'MOD-0001', name: 'Checkout', createdAt: '', updatedAt: '' }],
      [{ id: 'environment-id', projectId: 'project-id', name: 'Staging', baseUrl: 'https://staging.example.test', createdAt: '', updatedAt: '' }],
    );

    expect(prompts).toHaveLength(6);
    expect(prompts.map(({ category }) => category)).toEqual([
      'Local Runner', 'Generate Test Case', 'Analisis Test Run', 'Triage Issue', 'Pilih Regression', 'Audit Coverage',
    ]);
    expect(prompts.every(({ prompt }) => prompt.includes('Checkout App (ID: project-id)'))).toBe(true);
    expect(prompts.filter(({ id }) => id !== 'connect-runner').every(({ prompt }) => prompt.includes('MOD-0001 — Checkout (ID: module-id)'))).toBe(true);
    expect(prompts.filter(({ id }) => id !== 'connect-runner').every(({ prompt }) => prompt.includes('Staging (ID: environment-id, URL: https://staging.example.test)'))).toBe(true);
    expect(prompts.filter(({ requiresBootstrapCode }) => !requiresBootstrapCode).some(({ prompt }) => prompt.includes('{{'))).toBe(false);
    expect(prompts.find(({ id }) => id === 'connect-runner')).toMatchObject({
      title: 'Pasang & sambungkan runner',
      requiresBootstrapCode: true,
    });
  });

  it('renders the runner prompt with a one-command bootstrap setup', () => {
    const code = `tmb_${'a'.repeat(48)}`;
    const prompt = createProjectPromptStarters('project-id', 'Checkout App', [], [], `npx @testmanager/runner init --code ${code}`)
      .find(({ id }) => id === 'connect-runner');

    expect(prompt?.requiresBootstrapCode).toBe(false);
    expect(prompt?.prompt).toContain(`npx @testmanager/runner init --code ${code}`);
    expect(prompt?.prompt).toContain('nama runner, label, dan project yang tersambung');
    expect(prompt?.prompt).not.toContain('{{');
  });

  it('issues the BOOT-01 code after snapshotting existing runners', async () => {
    const existingRunner = { id: 'existing-runner' } as AutomationRunner;
    vi.spyOn(projectConnectionRepository, 'findRunnersByProjectId').mockResolvedValue([existingRunner]);
    vi.spyOn(projectConnectionRepository, 'issueRunnerBootstrapCode').mockResolvedValue({
      bootstrapCode: `tmb_${'b'.repeat(48)}`,
      expiresAt: '2026-08-01T12:10:00.000Z',
    });

    const result = await projectConnectionService.issueRunnerBootstrap('project-id', 'Checkout App', ' CI Runner ', [' Chromium ', 'staging']);

    expect(result.command).toContain(`TM_RUNNER_NAME='CI Runner' TM_RUNNER_LABELS='chromium,staging'`);
    expect(result.npmCommands).toContain('npm install --save-dev @testmanager/runner');
    expect(result.npmCommands).toContain('npx tm-runner start');
    expect(result.dockerCommands).toContain('docker run --rm --env-file .env');
    expect(result.existingRunnerIds).toEqual(['existing-runner']);
    expect(projectConnectionRepository.issueRunnerBootstrapCode).toHaveBeenCalledWith('project-id');
  });

  it('detects only a new active runner after its first heartbeat', async () => {
    const existingRunner = { id: 'existing-runner', active: true, lastSeenAt: '2026-08-01T12:00:00.000Z' } as AutomationRunner;
    const newRunnerWithoutHeartbeat = { id: 'new-runner', active: true, lastSeenAt: null } as AutomationRunner;
    const connectedRunner = { ...newRunnerWithoutHeartbeat, lastSeenAt: '2026-08-01T12:01:00.000Z' } as AutomationRunner;
    const listRunners = vi.spyOn(projectConnectionRepository, 'findRunnersByProjectId');
    listRunners.mockResolvedValueOnce([newRunnerWithoutHeartbeat, existingRunner]);
    listRunners.mockResolvedValueOnce([connectedRunner, existingRunner]);

    await expect(projectConnectionService.detectConnectedRunner('project-id', ['existing-runner'])).resolves.toBeNull();
    await expect(projectConnectionService.detectConnectedRunner('project-id', ['existing-runner'])).resolves.toEqual(connectedRunner);
  });

  it('creates a read-only project token without embedding it in setup commands', async () => {
    const readOnlyConfig = projectConnectionService.setReadOnly(baseConfig, true);
    vi.spyOn(projectConnectionRepository, 'createToken').mockResolvedValue({ token: 'secret-value' } as never);

    await projectConnectionService.createToken('project-id', ' Claude Code ', readOnlyConfig.mcp);

    expect(projectConnectionRepository.createToken).toHaveBeenCalledWith('project-id', 'Claude Code', ['read:project']);
    expect(readOnlyConfig.setupSteps.every(({ command }) => !command.includes('secret-value'))).toBe(true);
  });

  it('derives write scopes from enabled MCP feature groups', async () => {
    const selected = projectConnectionService.setFeatureGroups(baseConfig, ['DISCOVERY', 'TEST-RUN', 'ISSUE']);
    vi.spyOn(projectConnectionRepository, 'createToken').mockResolvedValue({ token: 'secret-value' } as never);

    await projectConnectionService.createToken('project-id', 'Agent', selected.mcp);

    expect(projectConnectionRepository.createToken).toHaveBeenCalledWith('project-id', 'Agent', [
      'read:project', 'write:test-runs', 'write:test-results', 'write:issues',
    ]);
  });

  it('delegates token revocation by id', async () => {
    const revoke = vi.spyOn(projectConnectionRepository, 'revokeToken').mockResolvedValue();
    await projectConnectionService.revokeToken('token-id');
    expect(revoke).toHaveBeenCalledWith('token-id');
  });
});
