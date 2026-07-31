import { McpToolError } from "../helpers/response.js";
import type { TestCaseChanges, TestCaseWriteInput, WriteRepository } from "../repositories/writeRepository.js";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const marker = (data: unknown) => ({ status: "draft" as const, mode: "review_only" as const, data });

export class WriteService {
  constructor(private readonly repository: WriteRepository) {}
  async createTestCases(cases: TestCaseWriteInput[]) {
    if (cases.length < 1 || cases.length > 100) throw invalid("cases must contain between 1 and 100 items");
    cases.forEach((item, index) => this.validateCase(item, `cases[${index}]`));
    return marker(await this.repository.createTestCases(cases));
  }
  async updateTestCase(id: string, changes: TestCaseChanges) {
    this.uuid(id, "testcase_id");
    if (!Object.keys(changes).length) throw invalid("changes must contain at least one editable field");
    this.validateCase(changes, "changes", false);
    return marker(await this.repository.updateTestCase(id, changes));
  }
  async duplicateTestCase(id: string, title?: string) { this.uuid(id, "testcase_id"); if (title !== undefined) this.text(title, "title"); return marker(await this.repository.duplicateTestCase(id, title?.trim())); }
  async archiveTestCase(id: string) { this.uuid(id, "testcase_id"); return marker(await this.repository.archiveTestCase(id)); }
  async createTestPlan(input: { name: string; description?: string | null }) { this.text(input.name, "name"); return marker(await this.repository.createTestPlan({ ...input, name: input.name.trim() })); }
  async addTestPlanCases(id: string, ids: string[]) { this.uuid(id, "testplan_id"); this.ids(ids); return marker(await this.repository.addTestPlanCases(id, [...new Set(ids)])); }
  async removeTestPlanCases(id: string, ids: string[]) { this.uuid(id, "testplan_id"); this.ids(ids); return marker(await this.repository.removeTestPlanCases(id, [...new Set(ids)])); }
  async approveTestPlan(id: string, approverId: string, explicitApproval: boolean) {
    this.uuid(id, "testplan_id"); this.uuid(approverId, "approver_id");
    if (explicitApproval !== true) throw invalid("explicit_approval must be true for API-token approval");
    return this.repository.approveTestPlan(id, approverId, explicitApproval);
  }
  private ids(ids: string[]) { if (ids.length < 1 || ids.length > 100) throw invalid("testcase_ids must contain between 1 and 100 IDs"); ids.forEach((id) => this.uuid(id, "testcase_ids")); }
  private validateCase(value: TestCaseChanges, path: string, required = true) {
    for (const field of ["title", "steps", "expectedResult"] as const) { const text = value[field]; if (required || text !== undefined) this.text(text, `${path}.${field}`); }
    if (value.moduleId) this.uuid(value.moduleId, `${path}.module_id`);
    if (value.priority !== undefined && !["low", "medium", "high", "critical"].includes(value.priority)) throw invalid(`${path}.priority is invalid`);
  }
  private text(value: unknown, field: string) { if (typeof value !== "string" || !value.trim()) throw invalid(`${field} must be a non-empty string`); }
  private uuid(value: string, field: string) { if (!UUID.test(value)) throw invalid(`${field} must be a valid UUID`); }
}
const invalid = (message: string) => new McpToolError("INVALID_ARGUMENT", message, "Correct the input and retry.");
