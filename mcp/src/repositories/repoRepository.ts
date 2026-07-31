import { execFile } from "node:child_process";
import { mkdir, realpath, stat } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";

import type { ServerConfig } from "../config.js";

const execFileAsync = promisify(execFile);

export type RepositorySourceType = "local_path" | "github_public" | "github_private" | "git_url";

export interface ProjectRepositoryConfig {
  id: string;
  name: string;
  sourceType: RepositorySourceType;
  urlOrPath: string;
  defaultBranch: string | null;
  subdirectory: string | null;
  credential: string | null;
}

interface RepositoryConfigRow {
  id: string; name: string; source_type: RepositorySourceType; url_or_path: string;
  default_branch: string | null; subdirectory: string | null; credential: string | null;
}

export class RepoRepositoryError extends Error {
  constructor(message = "Repository access failed") { super(message); this.name = "RepoRepositoryError"; }
}

export class RepoRepository {
  constructor(private readonly config: ServerConfig, private readonly fetchImpl: typeof fetch = fetch) {}

  async getConfiguration(repositoryId: string): Promise<ProjectRepositoryConfig | null> {
    let response: Response;
    try {
      response = await this.fetchImpl(`${this.config.supabaseUrl}/rest/v1/rpc/mcp_get_repository_configuration`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: this.config.supabaseAnonKey, Authorization: `Bearer ${this.config.supabaseAnonKey}` },
        body: JSON.stringify({ p_token: this.config.apiToken, p_project_id: this.config.projectId, p_repository_id: repositoryId }),
      });
    } catch { throw new RepoRepositoryError("Repository configuration service is unavailable"); }
    if (!response.ok) throw new RepoRepositoryError("Repository configuration request failed");
    const rows = await response.json() as RepositoryConfigRow[];
    const row = rows[0];
    return row ? { id: row.id, name: row.name, sourceType: row.source_type, urlOrPath: row.url_or_path,
      defaultBranch: row.default_branch, subdirectory: row.subdirectory, credential: row.credential } : null;
  }

  async prepare(configuration: ProjectRepositoryConfig): Promise<string> {
    if (configuration.sourceType === "local_path") return realpath(configuration.urlOrPath);
    const url = this.safeRemoteUrl(configuration.urlOrPath);
    await mkdir(this.config.repositoryCacheDir, { recursive: true });
    const root = join(this.config.repositoryCacheDir, configuration.id);
    const env = this.gitEnvironment(configuration.credential);
    try {
      const gitDirectory = await stat(join(root, ".git")).then(value => value.isDirectory()).catch(() => false);
      if (!gitDirectory) {
        await execFileAsync("git", ["clone", "--no-tags", "--single-branch", "--branch", configuration.defaultBranch || "main", "--", url, root], { env, maxBuffer: 1024 * 1024 });
      } else {
        await execFileAsync("git", ["-C", root, "fetch", "--quiet", "origin", configuration.defaultBranch || "main"], { env, maxBuffer: 1024 * 1024 });
        await execFileAsync("git", ["-C", root, "checkout", "--quiet", configuration.defaultBranch || "main"], { env, maxBuffer: 1024 * 1024 });
        await execFileAsync("git", ["-C", root, "reset", "--quiet", "--hard", `origin/${configuration.defaultBranch || "main"}`], { env, maxBuffer: 1024 * 1024 });
      }
      return realpath(root);
    } catch { throw new RepoRepositoryError(); }
  }

  async git(root: string, args: string[]): Promise<string> {
    try { return (await execFileAsync("git", ["-C", root, ...args], { env: { ...process.env, GIT_TERMINAL_PROMPT: "0" }, maxBuffer: 4 * 1024 * 1024 })).stdout; }
    catch { throw new RepoRepositoryError(); }
  }

  async gitGrep(root: string, args: string[]): Promise<string> {
    try { return await this.git(root, args); }
    catch (error) {
      // `git grep` uses exit status 1 for a valid search with no matches. Re-run
      // quietly to distinguish that case without exposing stderr or arguments.
      try {
        await execFileAsync("git", ["-C", root, ...args], { env: { ...process.env, GIT_TERMINAL_PROMPT: "0" }, maxBuffer: 4 * 1024 * 1024 });
      } catch (result) {
        if (typeof result === "object" && result !== null && "code" in result && result.code === 1) return "";
      }
      throw error;
    }
  }

  private safeRemoteUrl(raw: string): string {
    try {
      const url = new URL(raw);
      if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new Error();
      return url.toString();
    } catch { throw new RepoRepositoryError("Repository URL must be credential-free HTTP(S)"); }
  }

  private gitEnvironment(token: string | null): NodeJS.ProcessEnv {
    if (!token) return { ...process.env, GIT_TERMINAL_PROMPT: "0" };
    const authorization = Buffer.from(`x-access-token:${token}`, "utf8").toString("base64");
    return { ...process.env, GIT_TERMINAL_PROMPT: "0", GIT_CONFIG_COUNT: "1", GIT_CONFIG_KEY_0: "http.extraHeader", GIT_CONFIG_VALUE_0: `Authorization: Basic ${authorization}` };
  }
}
