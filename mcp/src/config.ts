export interface ServerConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  apiToken: string;
  projectId: string;
  readonly: boolean;
  supabaseAccessToken?: string;
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

export const loadConfig = (env: NodeJS.ProcessEnv = process.env): ServerConfig => ({
  supabaseUrl: requiredEnv(env, "TM_SUPABASE_URL").replace(/\/+$/, ""),
  supabaseAnonKey: requiredEnv(env, "TM_SUPABASE_ANON_KEY"),
  apiToken: requiredEnv(env, "TM_API_TOKEN"),
  projectId: requiredEnv(env, "TM_PROJECT_ID"),
  readonly: parseReadonly(env.TM_MCP_READONLY?.trim()),
  supabaseAccessToken: env.TM_SUPABASE_ACCESS_TOKEN?.trim() || undefined,
});
