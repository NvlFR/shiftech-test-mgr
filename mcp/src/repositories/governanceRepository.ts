import type { ServerConfig } from "../config.js";

interface BeginToolCallRow { audit_id: string; allowed: boolean }
export interface BeginToolCallResult { auditId: string; allowed: boolean }

export class GovernanceRepositoryError extends Error {
  constructor() {
    super("MCP governance service is unavailable");
    this.name = "GovernanceRepositoryError";
  }
}

export class GovernanceRepository {
  constructor(private readonly config: ServerConfig, private readonly fetchImpl: typeof fetch = fetch) {}

  async beginToolCall(toolName: string): Promise<BeginToolCallResult> {
    const rows = await this.call<BeginToolCallRow[]>("mcp_begin_tool_call", {
      p_token: this.config.apiToken, p_project_id: this.config.projectId, p_tool_name: toolName,
      p_limit: this.config.toolRateLimit, p_window_seconds: this.config.toolRateLimitWindowSeconds,
    });
    const row = rows[0];
    if (!row) throw new GovernanceRepositoryError();
    return { auditId: row.audit_id, allowed: row.allowed };
  }

  async completeToolCall(auditId: string, status: "completed" | "failed", latencyMs: number): Promise<void> {
    await this.call("mcp_complete_tool_call", {
      p_token: this.config.apiToken, p_project_id: this.config.projectId,
      p_audit_id: auditId, p_status: status, p_latency_ms: latencyMs,
    });
  }

  private async call<T = unknown>(rpc: string, body: Record<string, unknown>): Promise<T> {
    let response: Response;
    try {
      response = await this.fetchImpl(`${this.config.supabaseUrl}/rest/v1/rpc/${rpc}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: this.config.supabaseAnonKey, Authorization: `Bearer ${this.config.supabaseAnonKey}` },
        body: JSON.stringify(body),
      });
    } catch { throw new GovernanceRepositoryError(); }
    if (!response.ok) throw new GovernanceRepositoryError();
    const text = await response.text();
    return (text ? JSON.parse(text) : undefined) as T;
  }
}
