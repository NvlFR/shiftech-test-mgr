import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { GitCloneRepo, LocalPathRepo, registerSecret, type RepoAdapter, type TransportAdapter } from "@testmanager/agent-core";

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
  private readonly localRepo: RepoAdapter;

  constructor(private readonly config: ServerConfig, private readonly transport: TransportAdapter, localRepo: RepoAdapter = new LocalPathRepo()) {
    this.localRepo = localRepo;
  }

  async getConfiguration(repositoryId: string): Promise<ProjectRepositoryConfig | null> {
    try {
      const { data: rows } = await this.transport.request<RepositoryConfigRow[]>({ operation: "mcp_get_repository_configuration", body: {
        p_token: this.config.apiToken, p_project_id: this.config.projectId, p_repository_id: repositoryId,
      } });
      const row = rows[0];
      registerSecret(row?.credential);
      return row ? { id: row.id, name: row.name, sourceType: row.source_type, urlOrPath: row.url_or_path,
        defaultBranch: row.default_branch, subdirectory: row.subdirectory, credential: row.credential } : null;
    } catch { throw new RepoRepositoryError("Repository configuration service is unavailable"); }
  }

  async prepare(configuration: ProjectRepositoryConfig): Promise<string> {
    try {
      const adapter = configuration.sourceType === "local_path" ? this.localRepo : new GitCloneRepo({
        cacheDir: this.config.repositoryCacheDir,
        credentialResolver: async () => configuration.credential,
      });
      return (await adapter.prepare({ source: configuration.urlOrPath, revision: configuration.defaultBranch || "main", ...(configuration.sourceType === "local_path" ? {} : { credentialsRef: configuration.id }) })).rootPath;
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

}
