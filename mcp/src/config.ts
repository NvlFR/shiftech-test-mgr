export interface ServerConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  apiToken: string;
  projectId: string;
  readonly: boolean;
  supabaseAccessToken?: string;
  rerunFailedMaxTests: number;
  repositoryCacheDir: string;
}

const requiredEnv = (
  env: NodeJS.ProcessEnv,
  name: "TM_SUPABASE_URL" | "TM_SUPABASE_ANON_KEY" | "TM_API_TOKEN" | "TM_PROJECT_ID",
): string => {
  const value = env[name]?.trim();

  if (!value) {
    throw new Error(`Environment variable ${name} is required`);
  }

  return value;
};

const parseReadonly = (value: string | undefined): boolean => {
  if (value === undefined || value === "0") {
    return false;
  }

  if (value === "1") {
    return true;
  }

  throw new Error("Environment variable TM_MCP_READONLY must be 0 or 1");
};

const parseRerunFailedMaxTests = (value: string | undefined): number => {
  if (value === undefined || value === "") return 25;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 500) {
    throw new Error("Environment variable TM_MCP_RERUN_FAILED_MAX_TESTS must be an integer between 1 and 500");
  }
  return parsed;
};

export const loadConfig = (env: NodeJS.ProcessEnv = process.env): ServerConfig => ({
  supabaseUrl: requiredEnv(env, "TM_SUPABASE_URL").replace(/\/+$/, ""),
  supabaseAnonKey: requiredEnv(env, "TM_SUPABASE_ANON_KEY"),
  apiToken: requiredEnv(env, "TM_API_TOKEN"),
  projectId: requiredEnv(env, "TM_PROJECT_ID"),
  readonly: parseReadonly(env.TM_MCP_READONLY?.trim()),
  supabaseAccessToken: env.TM_SUPABASE_ACCESS_TOKEN?.trim() || undefined,
  rerunFailedMaxTests: parseRerunFailedMaxTests(env.TM_MCP_RERUN_FAILED_MAX_TESTS?.trim()),
  repositoryCacheDir: env.TM_MCP_REPOSITORY_CACHE_DIR?.trim() || "/tmp/testmanager-mcp-repositories",
});
