import { loadAgentEnv } from "@testmanager/agent-core";

export interface ServerConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  apiToken: string;
  projectId: string;
  readonly: boolean;
  supabaseAccessToken?: string;
  rerunFailedMaxTests: number;
  repositoryCacheDir: string;
  toolRateLimit: number;
  toolRateLimitWindowSeconds: number;
  heartbeatIntervalMs?: number;
  transport?: "stdio" | "http";
  httpHost?: string;
  httpPort?: number;
}

const parseReadonly = (value: string | undefined): boolean => value === "1";

const parseRerunFailedMaxTests = (value: string | undefined): number => {
  if (value === undefined || value === "") return 25;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 500) {
    throw new Error("Environment variable TM_MCP_RERUN_FAILED_MAX_TESTS must be an integer between 1 and 500");
  }
  return parsed;
};

const parseBoundedInteger = (value: string | undefined, name: string, defaultValue: number, maximum: number): number => {
  if (value === undefined || value === "") return defaultValue;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > maximum) {
    throw new Error(`Environment variable ${name} must be an integer between 1 and ${maximum}`);
  }
  return parsed;
};

export const loadConfig = (source: NodeJS.ProcessEnv = process.env): ServerConfig => {
  const env = loadAgentEnv({ process: "mcp", env: source });
  return {
    supabaseUrl: env.TM_SUPABASE_URL!.trim().replace(/\/+$/, ""),
    supabaseAnonKey: env.TM_SUPABASE_ANON_KEY!.trim(),
    apiToken: env.TM_API_TOKEN!.trim(),
    projectId: env.TM_PROJECT_ID!.trim(),
    readonly: parseReadonly(env.TM_MCP_READONLY?.trim()),
    supabaseAccessToken: env.TM_SUPABASE_ACCESS_TOKEN?.trim() || undefined,
    rerunFailedMaxTests: parseRerunFailedMaxTests(env.TM_MCP_RERUN_FAILED_MAX_TESTS?.trim()),
    repositoryCacheDir: env.TM_MCP_REPOSITORY_CACHE_DIR?.trim() || "/tmp/testmanager-mcp-repositories",
    toolRateLimit: parseBoundedInteger(env.TM_MCP_RATE_LIMIT?.trim(), "TM_MCP_RATE_LIMIT", 120, 10_000),
    toolRateLimitWindowSeconds: parseBoundedInteger(env.TM_MCP_RATE_LIMIT_WINDOW_SECONDS?.trim(), "TM_MCP_RATE_LIMIT_WINDOW_SECONDS", 60, 86_400),
    heartbeatIntervalMs: parseBoundedInteger(env.TM_HEARTBEAT_INTERVAL_SECONDS?.trim(), "TM_HEARTBEAT_INTERVAL_SECONDS", 30, 86_400) * 1000,
    transport: (() => {
      const value = env.TM_MCP_TRANSPORT?.trim() || "stdio";
      if (value !== "stdio" && value !== "http") {
        throw new Error("Environment variable TM_MCP_TRANSPORT must be stdio or http");
      }
      return value;
    })(),
    httpHost: env.TM_MCP_HTTP_HOST?.trim() || "127.0.0.1",
    httpPort: parseBoundedInteger(env.TM_MCP_HTTP_PORT?.trim(), "TM_MCP_HTTP_PORT", 3000, 65_535),
  };
};
