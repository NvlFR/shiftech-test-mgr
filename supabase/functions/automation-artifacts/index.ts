// Edge Function: automation-artifacts
//
// Mints short-lived SIGNED UPLOAD URLs so the Local Runner can push Playwright
// artifacts (screenshot/video/trace/log) straight into Supabase Storage without
// ever holding the service role key. The runner authenticates with its runner
// token (same token used for poll/report); the service role key stays here,
// server-side, exactly like the ai-gateway pattern.
//
// Request (POST): { "token": "tm_...", "job_id": "uuid", "files": ["a.png", "d/b.zip"] }
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

  let payload: { token?: string; job_id?: string; files?: unknown };
  try {
    payload = await req.json();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }

  const token = typeof payload.token === "string" ? payload.token : "";
  const jobId = typeof payload.job_id === "string" ? payload.job_id : "";
  const files = Array.isArray(payload.files) ? payload.files.filter((f): f is string => typeof f === "string") : [];
  if (token.length < 32 || !jobId) return json({ error: "invalid_request" }, 400);
  if (files.length === 0) return json({ bucket: BUCKET, uploads: [] });
  if (files.length > MAX_FILES) return json({ error: "too_many_files" }, 400);

  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const tokenHash = await sha256Hex(token);

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
