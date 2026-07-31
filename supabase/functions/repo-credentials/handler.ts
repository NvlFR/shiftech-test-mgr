import { maskCredential, parseCredentialRequest, projectCredentialResponse } from "./contract.ts";

export interface CredentialDependencies {
  authenticate(accessToken: string): Promise<{ id: string } | null>;
  manageCredential(args: Record<string, unknown>): Promise<{ data: unknown; error: unknown }>;
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

