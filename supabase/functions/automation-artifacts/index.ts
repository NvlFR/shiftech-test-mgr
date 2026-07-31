// Edge Function: automation-artifacts
//
// Mints short-lived SIGNED UPLOAD URLs so the Local Runner can push Playwright
// artifacts (screenshot/video/trace/log) straight into Supabase Storage without
// ever holding the service role key. The runner authenticates with its runner
// token (same token used for poll/report); the service role key stays here,
// server-side, exactly like the ai-gateway pattern.
//
// Upload request: { "token": "tm_...", "job_id": "uuid", "files": ["a.png", "d/b.zip"] }
// Download request: { "token": "tm_...", "action": "download", "bucket":
//                     "automation-artifacts", "path": "<project>/<job>/<file>", "expires_in": 120 }
// Response:       { "bucket": "automation-artifacts",
//                   "uploads": [{ "name": "a.png", "path": "<proj>/<job>/a.png", "uploadUrl": "https://..." }] }

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const BUCKET = "automation-artifacts";
const MAX_FILES = 50;

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

async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Keep object keys inside the {project}/{job}/ prefix; drop any traversal.
function sanitizeRelPath(file: string): string {
  return file
    .split("/")
    .map((seg) => seg.trim())
    .filter((seg) => seg && seg !== "." && seg !== "..")
    .join("/")
    .slice(0, 300);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) return json({ error: "server_misconfigured" }, 500);

  let payload: { token?: string; action?: string; bucket?: string; path?: string; expires_in?: number; job_id?: string; files?: unknown };
  try {
    payload = await req.json();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }

  const token = typeof payload.token === "string" ? payload.token : "";
  if (token.length < 32) return json({ error: "invalid_request" }, 400);

  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const tokenHash = await sha256Hex(token);

  if (payload.action === "download") {
    const bucket = payload.bucket ?? BUCKET;
    const path = typeof payload.path === "string" ? payload.path.replace(/^\/+/, "") : "";
    const expiresIn = Math.min(Math.max(Number(payload.expires_in) || 120, 30), 3600);
    if (bucket !== BUCKET || !path || path.includes("..")) return json({ error: "invalid_artifact" }, 400);
    const { data: apiToken } = await admin.from("api_tokens").select("project_id").eq("token_hash", tokenHash).is("revoked_at", null).maybeSingle();
    if (!apiToken) return json({ error: "invalid_api_token" }, 401);
    if (!path.startsWith(`${apiToken.project_id}/`)) return json({ error: "cross_project_artifact" }, 403);
    const { data, error } = await admin.storage.from(bucket).createSignedUrl(path, expiresIn, { download: false });
    if (error || !data) return json({ error: "sign_failed" }, 404);
    return json({ bucket, path, url: data.signedUrl, expiresIn });
  }

  const jobId = typeof payload.job_id === "string" ? payload.job_id : "";
  const files = Array.isArray(payload.files) ? payload.files.filter((f): f is string => typeof f === "string") : [];
  if (!jobId) return json({ error: "invalid_request" }, 400);
  if (files.length === 0) return json({ bucket: BUCKET, uploads: [] });
  if (files.length > MAX_FILES) return json({ error: "too_many_files" }, 400);

  // Authenticate the runner by its token, then confirm the job belongs to it.
  const { data: runner } = await admin
    .from("automation_runners")
    .select("id, project_id, active")
    .eq("token_hash", tokenHash)
    .eq("active", true)
    .maybeSingle();
  if (!runner) return json({ error: "invalid_runner_token" }, 401);

  const { data: job } = await admin
    .from("automation_jobs")
    .select("id, project_id, runner_id")
    .eq("id", jobId)
    .maybeSingle();
  if (!job || job.runner_id !== runner.id || job.project_id !== runner.project_id) {
    return json({ error: "job_not_owned_by_runner" }, 403);
  }

  const uploads: { name: string; path: string; uploadUrl: string }[] = [];
  for (const file of files) {
    const rel = sanitizeRelPath(file);
    if (!rel) continue;
    const path = `${job.project_id}/${job.id}/${rel}`;
    const { data, error } = await admin.storage.from(BUCKET).createSignedUploadUrl(path, { upsert: true });
    if (error || !data) return json({ error: "sign_failed", detail: error?.message }, 500);
    const encoded = path.split("/").map(encodeURIComponent).join("/");
    uploads.push({
      name: rel,
      path,
      uploadUrl: `${supabaseUrl}/storage/v1/object/upload/sign/${BUCKET}/${encoded}?token=${data.token}`,
    });
  }

  return json({ bucket: BUCKET, uploads });
});
