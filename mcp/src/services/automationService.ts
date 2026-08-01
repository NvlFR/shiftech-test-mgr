import { McpToolError } from "../helpers/response.js";
import type { AutomationEnqueueInput, AutomationRepository, AutomationRerunFailedInput, AutomationVerifyRegressionInput } from "../repositories/automationRepository.js";
import type { RepoService } from "./repoService.js";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const invalid = (message: string) => new McpToolError("INVALID_ARGUMENT", message, "Correct the input and retry.");

export class AutomationService {
  constructor(private readonly repository: AutomationRepository, private readonly repoService?: RepoService) {}

  mapScript(testCaseId: string, scriptRef: string, runnerLabels: string[]) {
    this.uuid(testCaseId, "testcase_id");
    if (!scriptRef.trim() || scriptRef.trim().length > 500) throw invalid("script_ref must contain between 1 and 500 characters");
    return this.repository.mapScript(testCaseId, scriptRef.trim(), normalizeLabels(runnerLabels));
  }

  enqueue(input: AutomationEnqueueInput) {
    if ((input.testCaseId ? 1 : 0) + (input.testPlanId ? 1 : 0) !== 1) throw invalid("provide exactly one of testcase_id or testplan_id");
    if (input.testCaseId) this.uuid(input.testCaseId, "testcase_id");
    if (input.testPlanId) this.uuid(input.testPlanId, "testplan_id");
    if (input.maxAttempts < 1 || input.maxAttempts > 10) throw invalid("max_attempts must be between 1 and 10");
    return this.repository.enqueue({ ...input, name: input.name?.trim() || undefined, runnerLabels: normalizeLabels(input.runnerLabels) });
  }

  async rerunFailed(input: AutomationRerunFailedInput) {
    this.uuid(input.issueId, "issue_id");
    if (input.confirmedBy) this.uuid(input.confirmedBy, "confirmed_by");
    if (input.explicitConfirmation && !input.confirmedBy) throw invalid("confirmed_by is required when explicit_confirmation is true");
    if (!input.explicitConfirmation && input.confirmedBy) throw invalid("explicit_confirmation must be true when confirmed_by is provided");
    if (input.maxAttempts < 1 || input.maxAttempts > 10) throw invalid("max_attempts must be between 1 and 10");
    const diffSignal = await this.resolveDiffSignal(input.issueId);
    const result = await this.repository.rerunFailed({
      ...input,
      name: input.name?.trim() || undefined,
      runnerLabels: normalizeLabels(input.runnerLabels),
      ...diffSignal,
    });
    if (isConfirmationRequired(result)) {
      throw new McpToolError(
        "HUMAN_CONFIRMATION_REQUIRED",
        `${result.selected_count} relevant automated tests exceed the configured safety limit of ${result.selection_limit}`,
        "Ask a human project member to review the regression scope, then retry with their profile UUID in confirmed_by and explicit_confirmation set to true.",
      );
    }
    return result;
  }

  verifyRegression(input: AutomationVerifyRegressionInput) {
    this.uuid(input.issueId, "issue_id");
    this.uuid(input.testRunId, "test_run_id");
    return this.repository.verifyRegression(input);
  }

  jobStatus(jobId: string) { this.uuid(jobId, "job_id"); return this.repository.jobStatus(jobId); }
  runnerList() { return this.repository.runnerList(); }
  private uuid(value: string, field: string) { if (!UUID.test(value)) throw invalid(`${field} must be a valid UUID`); }

  private async resolveDiffSignal(issueId: string): Promise<Pick<AutomationRerunFailedInput, "diffPaths" | "diffBase" | "diffHead">> {
    if (!this.repoService) return {};
    const context = await this.repository.regressionDiffContext(issueId);
    if (!context?.repositoryId || !context.baseCommit || !context.fixReferenceUrl) return {};
    const head = commitShaFromUrl(context.fixReferenceUrl);
    if (!head) return {};
    const diff = await this.repoService.diff(context.repositoryId, context.baseCommit, head);
    return { diffPaths: [...new Set(diff.files.flatMap((file) => [file.path, file.previousPath].filter((path): path is string => Boolean(path))))], diffBase: diff.base, diffHead: diff.head };
  }
}

const normalizeLabels = (labels: string[]): string[] => [...new Set(labels.map((label) => label.trim().toLowerCase()).filter(Boolean))];

const commitShaFromUrl = (value: string): string | null => {
  try {
    const match = new URL(value).pathname.match(/\/commit\/([0-9a-f]{7,64})(?:\/|$)/i);
    return match?.[1] ?? null;
  } catch { return null; }
};

const isConfirmationRequired = (value: unknown): value is { confirmation_required: true; selected_count: number; selection_limit: number } => {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return candidate.confirmation_required === true && typeof candidate.selected_count === "number" && typeof candidate.selection_limit === "number";
};
