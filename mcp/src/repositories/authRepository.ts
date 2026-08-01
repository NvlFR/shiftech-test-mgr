import type { AuthAdapter, TransportAdapter } from "@testmanager/agent-core";

export interface AuthenticatedToken {
  tokenId: string;
  projectId: string;
  scopes: string[];
}

interface TokenAuthenticationRow {
  token_id: string;
  project_id: string;
  scopes: string[];
}

export class AuthenticationError extends Error {
  constructor(message = "MCP authentication failed") {
    super(message);
    this.name = "AuthenticationError";
  }
}

export class AuthRepository {
  constructor(
    private readonly transport: TransportAdapter,
    private readonly auth: AuthAdapter,
  ) {}

  async authenticate(): Promise<AuthenticatedToken> {
    try {
      const { data: rows } = await this.transport.request<TokenAuthenticationRow[]>({
        operation: "authenticate_mcp_api_token",
        body: {},
        auth: await this.auth.getAuthContext(),
      });
      const row = rows[0];
      if (!row) throw new AuthenticationError();
      return { tokenId: row.token_id, projectId: row.project_id, scopes: row.scopes };
    } catch {
      throw new AuthenticationError("MCP authentication service is unavailable");
    }
  }
}
