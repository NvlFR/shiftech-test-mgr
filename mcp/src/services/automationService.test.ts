import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import type { AutomationRepository } from "../repositories/automationRepository.js";
import type { RepoService } from "./repoService.js";
import { AutomationService } from "./automationService.js";

const id = "11111111-1111-4111-8111-111111111111";

const normalizeSql = (sql: string) => sql.replace(/\s+/g, " ").trim().toLowerCase();

test("map script normalizes runner labels", async () => {
  let received: unknown[] = [];
  const repository = { mapScript: async (...args: unknown[]) => { received = args; return {}; } } as unknown as AutomationRepository;
  await new AutomationService(repository).mapScript(id, " tests/login.spec.ts ", [" Chromium ", "chromium", "staging"]);
  assert.deepEqual(received, [id, "tests/login.spec.ts", ["chromium", "staging"]]);
});

test("enqueue requires exactly one target", async () => {
  const service = new AutomationService({} as AutomationRepository);
  assert.throws(() => service.enqueue({ runnerLabels: [], maxAttempts: 1 }));
  assert.throws(() => service.enqueue({ testCaseId: id, testPlanId: id, runnerLabels: [], maxAttempts: 1 }));
});

test("enqueue forwards normalized label routing", async () => {
  let received: unknown;
  const repository = { enqueue: async (input: unknown) => { received = input; return {}; } } as unknown as AutomationRepository;
  await new AutomationService(repository).enqueue({ testPlanId: id, name: " Run ", runnerLabels: [" VPN ", "vpn"], maxAttempts: 2 });
  assert.deepEqual(received, { testPlanId: id, name: "Run", runnerLabels: ["vpn"], maxAttempts: 2 });
});

test("plan enqueue keeps cases without scripts manual and outside AI automation results", async () => {
  const [enqueueMigration, reportMigration] = await Promise.all([
    readFile(new URL("../../../supabase/schema_055_mcp_automation.sql", import.meta.url), "utf8"),
    readFile(new URL("../../../supabase/schema_062_pw06_automation_artifacts.sql", import.meta.url), "utf8"),
  ]);
  const sql = normalizeSql(enqueueMigration);
  const reportSql = normalizeSql(reportMigration);

  assert.match(
    sql,
    /insert into test_results\([^;]+from test_plan_cases tpc join test_cases tc on tc\.id=tpc\.test_case_id where tpc\.test_plan_id=p_test_plan_id;/,
    "every test case in the plan must be seeded as a not-run Test Result, including manual cases",
  );
  assert.match(
    sql,
    /insert into automation_jobs\([^;]+from automation_scripts s join test_plan_cases tpc on tpc\.test_case_id=s\.test_case_id and tpc\.test_plan_id=p_test_plan_id where s\.project_id=p_project_id;/,
    "only plan cases with an explicit automation script mapping may become automation jobs",
  );
  assert.match(
    reportSql,
    /select \* into v_job from automation_jobs where id = p_job_id for update;/,
    "an automatic result must be tied to an existing claimed automation job",
  );
  assert.doesNotMatch(
    sql,
    /insert into automation_jobs\([^;]+from test_plan_cases(?![^;]+automation_scripts)/,
    "AI automation must never enqueue every plan case by guessing missing scripts",
  );
});

test("rerun failed converts the safety gate into a human confirmation error", async () => {
  const repository = { rerunFailed: async () => ({ confirmation_required: true, selected_count: 26, selection_limit: 25 }) } as unknown as AutomationRepository;
  await assert.rejects(
    new AutomationService(repository).rerunFailed({ issueId: id, runnerLabels: [], maxAttempts: 1, explicitConfirmation: false }),
    (error: unknown) => error instanceof Error && "code" in error && error.code === "HUMAN_CONFIRMATION_REQUIRED",
  );
});

test("rerun failed requires paired explicit confirmation and human profile", () => {
  const service = new AutomationService({} as AutomationRepository);
  assert.rejects(service.rerunFailed({ issueId: id, runnerLabels: [], maxAttempts: 1, explicitConfirmation: true }));
  assert.rejects(service.rerunFailed({ issueId: id, runnerLabels: [], maxAttempts: 1, confirmedBy: id, explicitConfirmation: false }));
});

test("rerun failed unions paths changed by the Issue fix commit", async () => {
  let received: any;
  const repository = {
    regressionDiffContext: async () => ({ repositoryId: id, baseCommit: "a".repeat(40), fixReferenceUrl: `https://github.com/acme/app/commit/${"b".repeat(40)}` }),
    rerunFailed: async (input: unknown) => { received = input; return { confirmation_required: false }; },
  } as unknown as AutomationRepository;
  const repoService = {
    diff: async () => ({ base: "a".repeat(40), head: "b".repeat(40), files: [{ status: "R100", path: "tests/new.spec.ts", previousPath: "tests/old.spec.ts" }], patch: "", truncated: false }),
  } as unknown as RepoService;

  await new AutomationService(repository, repoService).rerunFailed({ issueId: id, runnerLabels: [], maxAttempts: 1, explicitConfirmation: false });

  assert.deepEqual(received.diffPaths, ["tests/new.spec.ts", "tests/old.spec.ts"]);
  assert.equal(received.diffBase, "a".repeat(40));
  assert.equal(received.diffHead, "b".repeat(40));
});

test("rerun failed keeps taxonomy signals when fix reference is not a commit URL", async () => {
  let received: any;
  const repository = {
    regressionDiffContext: async () => ({ repositoryId: id, baseCommit: "a".repeat(40), fixReferenceUrl: "https://github.com/acme/app/pull/42" }),
    rerunFailed: async (input: unknown) => { received = input; return {}; },
  } as unknown as AutomationRepository;
  const repoService = { diff: async () => assert.fail("diff must not run for a PR-only reference") } as unknown as RepoService;

  await new AutomationService(repository, repoService).rerunFailed({ issueId: id, runnerLabels: [], maxAttempts: 1, explicitConfirmation: false });
  assert.equal(received.diffPaths, undefined);
});

test("regression migration combines all four Section 11.7 signals and creates a new run", async () => {
  const sql = normalizeSql(await readFile(new URL("../../../supabase/schema_076_e2e15_regression_selection.sql", import.meta.url), "utf8"));
  assert.match(sql, /candidate\.id=v_source_case\.id/);
  assert.match(sql, /candidate\.module_id=v_source_case\.module_id/);
  assert.match(sql, /join test_case_tags candidate_tag on candidate_tag\.tag_id=source_tag\.tag_id/);
  assert.match(sql, /join requirement_links candidate_link on candidate_link\.requirement_id=source_link\.requirement_id/);
  assert.match(sql, /unnest\(coalesce\(p_diff_paths,'\{\}'\)\)/);
  assert.match(sql, /insert into test_runs\(/);
  assert.match(sql, /if v_count>p_selection_limit/);
  assert.doesNotMatch(sql, /update test_runs/);
});

test("verify regression validates identifiers and forwards the proving run", async () => {
  let received: unknown;
  const repository = { verifyRegression: async (input: unknown) => { received = input; return { outcome: "verified" }; } } as unknown as AutomationRepository;
  const result = await new AutomationService(repository).verifyRegression({ issueId: id, testRunId: id });
  assert.deepEqual(received, { issueId: id, testRunId: id });
  assert.deepEqual(result, { outcome: "verified" });
  assert.throws(() => new AutomationService(repository).verifyRegression({ issueId: "bad", testRunId: id }));
});

test("verification migration atomically links PASS and comments comparable FAIL evidence", async () => {
  const sql = normalizeSql(await readFile(new URL("../../../supabase/schema_077_e2e17_regression_verification.sql", import.meta.url), "utf8"));
  assert.match(sql, /v_new_result\.status = 'pass'/);
  assert.match(sql, /verified_test_run_id = v_run\.id/);
  assert.match(sql, /set status = 'open'/);
  assert.match(sql, /insert into comments/);
  assert.match(sql, /previous failure/);
  assert.match(sql, /new regression failure/);
  assert.match(sql, /insert into audit_logs/);
});
