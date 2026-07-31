import { createClient, type SupabaseClient, type User } from "https://esm.sh/@supabase/supabase-js@2.52.0";
import type { GatewayErrorCode } from "./contract.ts";

export class GatewayHttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: GatewayErrorCode,
    message: string,
    public readonly details?: unknown,
    public readonly retryAfterSeconds?: number,
  ) {
    super(message);
    this.name = "GatewayHttpError";
  }
}

export function getBearerToken(request: Request): string {
  const header = request.headers.get("authorization") ?? "";
  const match = header.match(/^Bearer\s+([^\s]+)$/i);
  if (!match) throw new GatewayHttpError(401, "AUTH_REQUIRED", "Bearer token diperlukan.");
  return match[1];
}

export async function authenticate(
  request: Request,
  supabaseUrl: string,
  anonKey: string,
): Promise<{ client: SupabaseClient; user: User }> {
  const token = getBearerToken(request);
  const client = createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) {
    throw new GatewayHttpError(401, "AUTH_INVALID", "Bearer token tidak valid.");
  }
  return { client, user: data.user };
}

const SENSITIVE_KEY = /(password|passwd|secret|api[_-]?key|access[_-]?token|refresh[_-]?token|authorization|cookie|private[_-]?key|service[_-]?role|supabase[_-]?key)/i;
const SENSITIVE_VALUE = /(Bearer\s+[A-Za-z0-9._~+/=-]+|eyJ[A-Za-z0-9._-]{20,}|sk-[A-Za-z0-9_-]{12,}|AIza[A-Za-z0-9_-]{20,})/g;
const EMAIL_VALUE = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;

export function redactSensitive(value: unknown, depth = 0): unknown {
  if (depth > 8) return "[TRUNCATED]";
  if (typeof value === "string") {
    return value.slice(0, 24_000).replace(SENSITIVE_VALUE, "[REDACTED]").replace(EMAIL_VALUE, "[REDACTED_EMAIL]");
  }
  if (Array.isArray(value)) return value.slice(0, 100).map((item) => redactSensitive(item, depth + 1));
  if (value && typeof value === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value)) {
      result[key] = SENSITIVE_KEY.test(key) ? "[REDACTED]" : redactSensitive(item, depth + 1);
    }
    return result;
  }
  return value;
}

export function redactPromptInput(input: Record<string, unknown>): string {
  const redacted = redactSensitive(input);
  const encoded = JSON.stringify(redacted);
  return encoded.length > 32_000 ? `${encoded.slice(0, 32_000)}…[TRUNCATED]` : encoded;
}

type RateLimitState = { count: number; resetAt: number };

export class InMemoryRateLimiter {
  private readonly buckets = new Map<string, RateLimitState>();

  constructor(private readonly maxRequests: number, private readonly windowMs: number) {}

  consume(key: string, now = Date.now()): { allowed: boolean; retryAfterSeconds: number } {
    const current = this.buckets.get(key);
    if (!current || current.resetAt <= now) {
      this.buckets.set(key, { count: 1, resetAt: now + this.windowMs });
      return { allowed: true, retryAfterSeconds: 0 };
    }
    if (current.count >= this.maxRequests) {
      return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1_000)) };
    }
    current.count += 1;
    return { allowed: true, retryAfterSeconds: 0 };
  }
}

export function envNumber(env: Record<string, string | undefined>, key: string, fallback: number, min: number, max: number): number {
  const parsed = Number(env[key]);
  return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback;
}

export function allowedOrigin(request: Request, env: Record<string, string | undefined>): string {
  const origin = request.headers.get("origin");
  const configured = (env.AI_ALLOWED_ORIGINS ?? "").split(",").map((value) => value.trim()).filter(Boolean);
  if (!configured.length) return "*";
  return origin && configured.includes(origin) ? origin : configured[0];
}

export function corsHeaders(request: Request, env: Record<string, string | undefined>): HeadersInit {
  return {
    "access-control-allow-origin": allowedOrigin(request, env),
    "access-control-allow-headers": "authorization, x-client-info, apikey, content-type, x-request-id, x-supabase-api-version",
    "access-control-allow-methods": "POST, OPTIONS",
    "access-control-max-age": "86400",
    vary: "Origin",
  };
}
