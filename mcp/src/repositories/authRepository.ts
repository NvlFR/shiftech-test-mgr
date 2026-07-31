import type { ServerConfig } from "../config.js";

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
    private readonly config: ServerConfig,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  async authenticate(): Promise<AuthenticatedToken> {
    let response: Response;

    try {
      response = await this.fetchImpl(
        `${this.config.supabaseUrl}/rest/v1/rpc/authenticate_mcp_api_token`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: this.config.supabaseAnonKey,
            Authorization: `Bearer ${this.config.supabaseAnonKey}`,
          },
          body: JSON.stringify({ p_token: this.config.apiToken }),
        },
      );
    } catch {
      throw new AuthenticationError("MCP authentication service is unavailable");
    }

    if (!response.ok) {
      // Do not include the upstream response: it is outside our logging contract
      // and could echo credentials or request details.
      throw new AuthenticationError();
    }

    const rows = (await response.json()) as TokenAuthenticationRow[];
    const row = rows[0];
    if (!row) {
      throw new AuthenticationError();
    }

    return {
      tokenId: row.token_id,
      projectId: row.project_id,
      scopes: row.scopes,
    };
  }
}
