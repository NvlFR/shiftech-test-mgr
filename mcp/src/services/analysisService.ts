import { McpToolError } from "../helpers/response.js";
import type { AnalysisRepository } from "../repositories/analysisRepository.js";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export class AnalysisService {
  constructor(private readonly repository: AnalysisRepository) {}

  async runSummary(testRunId: string) {
    this.assertRunId(testRunId);
    const value = await this.repository.runSummary(testRunId);
    if (!value) throw new McpToolError("NOT_FOUND", "Test run was not found", "Check the ID and confirm it belongs to the scoped project.");
    return value;
  }
  flakyCandidates(input: { lookbackRuns?: number; minExecutions?: number; limit?: number }) {
    return this.repository.flakyCandidates(input.lookbackRuns ?? 10, input.minExecutions ?? 3, input.limit ?? 25);
  }
  suggestRetest(input: { testRunId: string; lookbackRuns?: number; limit?: number }) {
    this.assertRunId(input.testRunId);
    return this.repository.suggestRetest(input.testRunId, input.lookbackRuns ?? 10, input.limit ?? 25);
  }
  private assertRunId(value: string): void {
    if (!UUID_PATTERN.test(value)) throw new McpToolError("INVALID_ARGUMENT", "testrun_id must be a valid UUID", "Pass a UUID returned by testrun.list.");
  }
}
