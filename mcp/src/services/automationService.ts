import { McpToolError } from "../helpers/response.js";
import type { AutomationEnqueueInput, AutomationRepository } from "../repositories/automationRepository.js";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const invalid = (message: string) => new McpToolError("INVALID_ARGUMENT", message, "Correct the input and retry.");

export class AutomationService {
  constructor(private readonly repository: AutomationRepository) {}

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

  jobStatus(jobId: string) { this.uuid(jobId, "job_id"); return this.repository.jobStatus(jobId); }
  runnerList() { return this.repository.runnerList(); }
  private uuid(value: string, field: string) { if (!UUID.test(value)) throw invalid(`${field} must be a valid UUID`); }
}

const normalizeLabels = (labels: string[]): string[] => [...new Set(labels.map((label) => label.trim().toLowerCase()).filter(Boolean))];
