import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { promisify } from "node:util";

import type { ServerConfig } from "../config.js";
import { RepoRepository } from "../repositories/repoRepository.js";
import { RepoService } from "./repoService.js";

const run = promisify(execFile);
const REPOSITORY_ID = "22222222-2222-4222-8222-222222222222";

const fixture = async () => {
  const root = await mkdtemp(join(tmpdir(), "tm-mcp-repo-"));
  await mkdir(join(root, "app"));
  await writeFile(join(root, "app", "login.ts"), "export const login = true;\n");
  await writeFile(join(root, "outside.ts"), "export const secret = false;\n");
  await run("git", ["init", "-q", root]);
  await run("git", ["-C", root, "add", "."]);
  await run("git", ["-C", root, "-c", "user.name=Test", "-c", "user.email=test@example.invalid", "commit", "-qm", "base"]);
  const base = (await run("git", ["-C", root, "rev-parse", "HEAD"])).stdout.trim();
  await writeFile(join(root, "app", "login.ts"), "export const login = false;\n");
  await run("git", ["-C", root, "add", "."]);
  await run("git", ["-C", root, "-c", "user.name=Test", "-c", "user.email=test@example.invalid", "commit", "-qm", "change"]);
  const config: ServerConfig = { supabaseUrl: "https://example.supabase.co", supabaseAnonKey: "anon", apiToken: "token", projectId: "11111111-1111-4111-8111-111111111111", readonly: true, rerunFailedMaxTests: 25, repositoryCacheDir: join(root, "cache"), toolRateLimit: 120, toolRateLimitWindowSeconds: 60 };
  const fetchImpl: typeof fetch = async () => new Response(JSON.stringify([{ id: REPOSITORY_ID, name: "App", source_type: "local_path", url_or_path: root, default_branch: "main", subdirectory: "app", credential: null }]), { status: 200, headers: { "Content-Type": "application/json" } });
  return { service: new RepoService(new RepoRepository(config, fetchImpl)), base };
};

test("repo tools list, read, search, and diff within configured subdirectory", async () => {
  const { service, base } = await fixture();
  assert.deepEqual((await service.listFiles(REPOSITORY_ID)).files, ["login.ts"]);
  assert.match((await service.readFile(REPOSITORY_ID, "login.ts")).content, /false/);
  assert.equal((await service.search(REPOSITORY_ID, "login")).matches[0]?.path, "login.ts");
  const diff = await service.diff(REPOSITORY_ID, base);
  assert.equal(diff.files[0]?.path, "app/login.ts");
  assert.match(diff.patch, /login = false/);
});

test("repo read rejects paths outside configured subdirectory", async () => {
  const { service } = await fixture();
  await assert.rejects(service.readFile(REPOSITORY_ID, "../outside.ts"), (error: any) => error.code === "INVALID_PATH");
});
