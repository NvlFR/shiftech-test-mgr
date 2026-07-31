export type CredentialAction = "store" | "rotate" | "revoke" | "test";

export interface CredentialRequest {
  action: CredentialAction;
  project_id: string;
  repository_id: string;
  token?: string;
  expires_at?: string | null;
}

export interface CredentialResponse {
  credential_id: string | null;
  mask: string | null;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function parseCredentialRequest(value: unknown): CredentialRequest {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("invalid_request");
  const input = value as Record<string, unknown>;
  const allowed = new Set(["action", "project_id", "repository_id", "token", "expires_at"]);
  if (Object.keys(input).some((key) => !allowed.has(key))) throw new Error("invalid_request");
  if (input.action !== "store" && input.action !== "rotate" && input.action !== "revoke" && input.action !== "test") throw new Error("invalid_request");
  if (typeof input.project_id !== "string" || !UUID.test(input.project_id)) throw new Error("invalid_request");
  if (typeof input.repository_id !== "string" || !UUID.test(input.repository_id)) throw new Error("invalid_request");

  if (input.action === "revoke" || input.action === "test") {
    if (input.token !== undefined || input.expires_at !== undefined) throw new Error("invalid_request");
    return { action: input.action, project_id: input.project_id, repository_id: input.repository_id };
  }

  if (typeof input.token !== "string" || input.token.length < 8 || input.token.length > 4096) throw new Error("invalid_request");
  if (input.expires_at !== undefined && input.expires_at !== null &&
      (typeof input.expires_at !== "string" || !Number.isFinite(Date.parse(input.expires_at)))) throw new Error("invalid_request");

  return {
    action: input.action,
    project_id: input.project_id,
    repository_id: input.repository_id,
    token: input.token,
    expires_at: input.expires_at as string | null | undefined,
  };
}

export function maskCredential(token: string): string {
  const separator = token.indexOf("_");
  const prefix = separator >= 0 && separator < 12 ? token.slice(0, separator + 1) : "";
  return `${prefix}••••••${token.slice(-4)}`;
}

export function projectCredentialResponse(value: unknown): CredentialResponse {
  const row = (value && typeof value === "object" ? value : {}) as Record<string, unknown>;
  return {
    credential_id: typeof row.credential_id === "string" ? row.credential_id : null,
    mask: typeof row.mask === "string" ? row.mask : null,
  };
}
