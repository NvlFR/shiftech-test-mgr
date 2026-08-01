import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import type { AutomationRepository } from "../repositories/automationRepository.js";
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
