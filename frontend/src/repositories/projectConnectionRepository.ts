import { supabase } from '../config/supabaseClient';
import { mapApiTokenRow, mapAutomationRunnerRow, mapEnvironmentRow, mapMcpUsageEventRow, mapModuleRow, mapProjectRow } from '../helpers/mappers';
import type { ApiToken, ApiTokenScope, AutomationRunner, CreatedApiToken, Environment, McpUsageEvent, Module, Project } from '../types/domain';

export interface RunnerBootstrapCodeRow {
  bootstrapCode: string;
  expiresAt: string;
}

export const projectConnectionRepository = {
  async findProjectById(projectId: string): Promise<Project | null> {
    const { data, error } = await supabase.from('projects').select('*').eq('id', projectId).maybeSingle();
    if (error) throw error;
    return data ? mapProjectRow(data) : null;
  },

  async findModulesByProjectId(projectId: string): Promise<Module[]> {
    const { data, error } = await supabase.from('modules').select('*').eq('project_id', projectId).order('code');
    if (error) throw error;
    return (data ?? []).map(mapModuleRow);
  },

  async findEnvironmentsByProjectId(projectId: string): Promise<Environment[]> {
    const { data, error } = await supabase.from('environments').select('*').eq('project_id', projectId).order('name');
    if (error) throw error;
    return (data ?? []).map(mapEnvironmentRow);
  },

  async issueRunnerBootstrapCode(projectId: string): Promise<RunnerBootstrapCodeRow> {
    const { data, error } = await supabase.rpc('issue_agent_bootstrap_code', { p_project_id: projectId });
    if (error) throw error;
    return { bootstrapCode: data.bootstrap_code, expiresAt: data.expires_at };
  },

  async findRunnersByProjectId(projectId: string): Promise<AutomationRunner[]> {
    const { data, error } = await supabase
      .from('automation_runners')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []).map(mapAutomationRunnerRow);
  },

  async findActiveTokensByProjectId(projectId: string): Promise<ApiToken[]> {
    const { data, error } = await supabase.from('api_tokens')
      .select('id, project_id, name, token_prefix, scopes, revoked_at, expires_at, last_used_at, created_at, updated_at')
      .eq('project_id', projectId).is('revoked_at', null).order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []).map(mapApiTokenRow);
  },

  async findLatestMcpUsageByProjectId(projectId: string): Promise<McpUsageEvent | null> {
    const { data, error } = await supabase.from('ai_audit_events')
      .select('created_at')
      .eq('project_id', projectId)
      .not('tool_name', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data ? mapMcpUsageEventRow(data) : null;
  },

  async createToken(projectId: string, name: string, scopes: ApiTokenScope[]): Promise<CreatedApiToken> {
    const { data, error } = await supabase.rpc('create_api_token', { p_project_id: projectId, p_name: name, p_scopes: scopes });
    if (error) throw error;
    const row = data as Record<string, unknown>;
    return { ...mapApiTokenRow({ ...row, project_id: projectId, revoked_at: null, updated_at: row.created_at }), token: String(row.token) };
  },

  async revokeToken(tokenId: string): Promise<void> {
    const { error } = await supabase.rpc('revoke_api_token', { p_token_id: tokenId });
    if (error) throw error;
  },
};
