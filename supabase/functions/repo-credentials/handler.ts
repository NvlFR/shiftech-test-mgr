import { maskCredential, parseCredentialRequest, projectCredentialResponse } from "./contract.ts";

export interface CredentialDependencies {
  authenticate(accessToken: string): Promise<{ id: string } | null>;
  manageCredential(args: Record<string, unknown>): Promise<{ data: unknown; error: unknown }>;
  getRepositoryConnection(args: Record<string, unknown>): Promise<{ data: unknown; error: unknown }>;
  fetchGitHub(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
}

type RepositoryConnection = {
  source_type: "github_public" | "github_private";
  url_or_path: string;
  token: string | null;
};

function parseGitHubRepositoryUrl(value: string): { owner: string; repository: string } | null {
  try {
    const url = new URL(value);
    if (url.hostname.toLowerCase() !== "github.com") return null;
    const parts = url.pathname.replace(/\.git$/, "").split("/").filter(Boolean);
    return parts.length === 2 ? { owner: parts[0], repository: parts[1] } : null;
  } catch {
    return null;
  }
}

function parseRepositoryConnection(value: unknown): RepositoryConnection | null {
  const row = (Array.isArray(value) ? value[0] : value) as Record<string, unknown> | null;
  if (!row || (row.source_type !== "github_public" && row.source_type !== "github_private") || typeof row.url_or_path !== "string") return null;
  return { source_type: row.source_type, url_or_path: row.url_or_path, token: typeof row.token === "string" ? row.token : null };
}

async function testGitHubConnection(connection: RepositoryConnection, fetchGitHub: CredentialDependencies["fetchGitHub"]) {
  const location = parseGitHubRepositoryUrl(connection.url_or_path);
  if (!location) return { error: "unsupported_repository_url", status: 400 } as const;
  if (connection.source_type === "github_private" && !connection.token) return { error: "credential_required", status: 400 } as const;

  const headers: Record<string, string> = { Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" };
  if (connection.token) headers.Authorization = `Bearer ${connection.token}`;
  const endpoint = `https://api.github.com/repos/${encodeURIComponent(location.owner)}/${encodeURIComponent(location.repository)}`;
  const response = await fetchGitHub(endpoint, { headers });
  if (!response.ok) return { error: response.status === 404 ? "repository_not_found" : "github_connection_failed", status: response.status === 401 || response.status === 403 ? 403 : 502 } as const;

  const body = await response.json() as Record<string, unknown>;
  const repoPermissions = body.permissions && typeof body.permissions === "object" ? body.permissions as Record<string, unknown> : {};
  const oauthScopes = (response.headers.get("x-oauth-scopes") ?? "").split(",").map((scope) => scope.trim()).filter(Boolean);
  const writePermissions = ["admin", "maintain", "push", "triage"].filter((permission) => repoPermissions[permission] === true);
  const excessiveScopes = oauthScopes.filter((scope) => scope !== "contents:read" && scope !== "contents: read" && scope !== "metadata:read" && scope !== "metadata: read");
  const permissions = [
    ...(repoPermissions.pull === true || response.ok ? ["contents: read"] : []),
    ...writePermissions.map((permission) => `repository: ${permission}`),
    ...oauthScopes.map((scope) => `token: ${scope}`),
  ];
  const hasExcessivePermission = writePermissions.length > 0 || excessiveScopes.length > 0;
  return {
    data: {
      name: typeof body.full_name === "string" ? body.full_name : `${location.owner}/${location.repository}`,
      default_branch: typeof body.default_branch === "string" ? body.default_branch : null,
      permissions: [...new Set(permissions)],
      warning: hasExcessivePermission
        ? "Token memiliki permission lebih luas dari contents: read. Gunakan fine-grained token dengan permission minimum."
        : null,
    },
  } as const;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export function createRepoCredentialsHandler(dependencies: CredentialDependencies) {
  return async (request: Request): Promise<Response> => {
    if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
    if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405);

    const authorization = request.headers.get("Authorization") ?? "";
    const accessToken = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
    if (!accessToken) return json({ error: "auth_required" }, 401);

    const actor = await dependencies.authenticate(accessToken);
    if (!actor) return json({ error: "auth_invalid" }, 401);

    let payload;
    try {
      payload = parseCredentialRequest(await request.json());
    } catch {
      return json({ error: "invalid_request" }, 400);
    }

    if (payload.action === "test") {
      const { data, error } = await dependencies.getRepositoryConnection({
        p_project_id: payload.project_id,
        p_repository_id: payload.repository_id,
        p_actor_id: actor.id,
      });
      if (error) return json({ error: "repository_access_failed" }, 403);
      const connection = parseRepositoryConnection(data);
      if (!connection) return json({ error: "repository_not_found" }, 404);
      const result = await testGitHubConnection(connection, dependencies.fetchGitHub);
      if ("error" in result) return json({ error: result.error }, result.status);
      return json({ data: result.data });
    }

    const { data, error } = await dependencies.manageCredential({
      p_action: payload.action,
      p_project_id: payload.project_id,
      p_repository_id: payload.repository_id,
      p_actor_id: actor.id,
      p_token: payload.token ?? null,
      p_mask: payload.token ? maskCredential(payload.token) : null,
      p_expires_at: payload.expires_at ?? null,
    });

    // Deliberately return stable errors without serializing database errors: an
    // upstream error can contain statement parameters, including the credential.
    if (error) return json({ error: "credential_operation_failed" }, 403);
    return json({ data: projectCredentialResponse(data) });
  };
}
