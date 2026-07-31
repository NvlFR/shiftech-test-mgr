import { readFile, realpath, stat } from "node:fs/promises";
import { isAbsolute, relative, resolve } from "node:path";

import { McpToolError } from "../helpers/response.js";
import type { ProjectRepositoryConfig, RepoRepository } from "../repositories/repoRepository.js";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_FILE_BYTES = 128 * 1024;
const MAX_RESULTS = 100;

export interface RepoDiff { base: string; head: string; files: Array<{ status: string; path: string; previousPath?: string }>; patch: string; truncated: boolean }

export class RepoService {
  constructor(private readonly repository: RepoRepository) {}

  async listFiles(repositoryId: string, path = "", limit = 100): Promise<{ repositoryId: string; files: string[]; truncated: boolean }> {
    const { root, configuration } = await this.resolveRepository(repositoryId);
    const scope = await this.scopePath(root, configuration, path, false);
    const output = await this.repository.git(root, ["ls-files", "-z", "--", this.gitPath(root, scope)]);
    const files = output.split("\0").filter(Boolean).map(file => relative(scope, resolve(root, file)).replaceAll("\\", "/")).filter(file => file && !file.startsWith("../"));
    return { repositoryId, files: files.slice(0, this.limit(limit)), truncated: files.length > limit };
  }

  async readFile(repositoryId: string, path: string): Promise<{ repositoryId: string; path: string; content: string; bytes: number }> {
    const { root, configuration } = await this.resolveRepository(repositoryId);
    const target = await this.scopePath(root, configuration, path, true);
    const info = await stat(target);
    if (!info.isFile()) throw new McpToolError("NOT_A_FILE", "path is not a file", "Pass a file returned by repo.list_files.");
    if (info.size > MAX_FILE_BYTES) throw new McpToolError("FILE_TOO_LARGE", "File exceeds the 128 KiB read limit", "Read a smaller source file.");
    const content = await readFile(target, "utf8");
    if (content.includes("\0")) throw new McpToolError("BINARY_FILE", "Binary files cannot be read", "Choose a text source file.");
    return { repositoryId, path, content, bytes: Buffer.byteLength(content) };
  }

  async search(repositoryId: string, query: string, path = "", limit = 50): Promise<{ repositoryId: string; matches: Array<{ path: string; line: number; text: string }>; truncated: boolean }> {
    if (query.length > 500 || query.includes("\0") || query.includes("\n")) throw new McpToolError("INVALID_ARGUMENT", "query must be a single line of at most 500 characters", "Use a shorter literal text query.");
    const { root, configuration } = await this.resolveRepository(repositoryId);
    const scope = await this.scopePath(root, configuration, path, false);
    const output = await this.repository.gitGrep(root, ["grep", "-I", "-n", "-F", "-e", query, "--", this.gitPath(root, scope)]);
    const matches = output.split("\n").filter(Boolean).map(line => {
      const match = /^(.+?):(\d+):(.*)$/.exec(line);
      return match ? { path: relative(scope, resolve(root, match[1]!)).replaceAll("\\", "/"), line: Number(match[2]), text: match[3]! } : null;
    }).filter((value): value is { path: string; line: number; text: string } => value !== null && !value.path.startsWith("../"));
    const bounded = this.limit(limit);
    return { repositoryId, matches: matches.slice(0, bounded), truncated: matches.length > bounded };
  }

  async diff(repositoryId: string, base: string, head = "HEAD", path = ""): Promise<RepoDiff> {
    this.assertRevision(base, "base"); this.assertRevision(head, "head");
    const { root, configuration } = await this.resolveRepository(repositoryId);
    const scope = await this.scopePath(root, configuration, path, false);
    const range = `${base}..${head}`;
    const names = await this.repository.git(root, ["diff", "--name-status", "--find-renames", range, "--", this.gitPath(root, scope)]);
    const files = names.trim().split("\n").filter(Boolean).map(line => {
      const [status, first, second] = line.split("\t");
      return second ? { status: status!, path: second, previousPath: first } : { status: status!, path: first! };
    });
    const patch = await this.repository.git(root, ["diff", "--no-ext-diff", "--unified=3", range, "--", this.gitPath(root, scope)]);
    const maxPatchBytes = 192 * 1024;
    const boundedPatch = Buffer.from(patch).subarray(0, maxPatchBytes).toString("utf8");
    return { base, head, files, patch: boundedPatch, truncated: Buffer.byteLength(patch) > maxPatchBytes };
  }

  private async resolveRepository(repositoryId: string): Promise<{ root: string; configuration: ProjectRepositoryConfig }> {
    if (!UUID_PATTERN.test(repositoryId)) throw new McpToolError("INVALID_ARGUMENT", "repository_id must be a valid UUID", "Pass a repository ID from Project Settings.");
    const configuration = await this.repository.getConfiguration(repositoryId);
    if (!configuration) throw new McpToolError("NOT_FOUND", "Active repository was not found", "Check that the repository belongs to the scoped project and is active.");
    const root = await this.repository.prepare(configuration);
    await this.repository.git(root, ["rev-parse", "--is-inside-work-tree"]);
    return { root, configuration };
  }

  private async scopePath(root: string, configuration: ProjectRepositoryConfig, requested: string, mustExist: boolean): Promise<string> {
    if (isAbsolute(requested) || requested.includes("\0")) throw new McpToolError("INVALID_PATH", "path must be repository-relative", "Use a path returned by repo.list_files.");
    const configured = resolve(root, configuration.subdirectory || ".");
    this.assertContained(root, configured);
    const target = resolve(configured, requested || ".");
    this.assertContained(configured, target);
    if (!mustExist && await stat(target).then(() => false).catch(() => true)) throw new McpToolError("NOT_FOUND", "Repository path was not found", "Check the configured subdirectory and requested path.");
    const canonical = await realpath(target).catch(() => target);
    this.assertContained(configured, canonical);
    return canonical;
  }

  private assertContained(parent: string, child: string): void { const path = relative(parent, child); if (path.startsWith("..") || isAbsolute(path)) throw new McpToolError("INVALID_PATH", "path escapes the repository scope", "Use a path under the configured repository subdirectory."); }
  private gitPath(root: string, path: string): string { return relative(root, path).replaceAll("\\", "/") || "."; }
  private limit(value: number): number { if (!Number.isInteger(value) || value < 1 || value > MAX_RESULTS) throw new McpToolError("INVALID_PAGINATION", "limit must be between 1 and 100", "Use a smaller positive limit."); return value; }
  private assertRevision(value: string, field: string): void { if (!/^[A-Za-z0-9][A-Za-z0-9._/@{}^~:+-]{0,199}$/.test(value) || value.startsWith("-")) throw new McpToolError("INVALID_REVISION", `${field} is not a safe commit or tag`, "Use a commit SHA, branch, or tag name."); }
}
