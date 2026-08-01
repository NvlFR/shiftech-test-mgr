import type { GovernanceRepository } from "../repositories/governanceRepository.js";

export class ToolRateLimitError extends Error {
  constructor() {
    super("MCP tool rate limit exceeded");
    this.name = "ToolRateLimitError";
  }
}

export class GovernanceService {
  constructor(private readonly repository: GovernanceRepository, private readonly now: () => number = Date.now) {}

  async execute<T>(toolName: string, operation: () => Promise<T>): Promise<T> {
    const startedAt = this.now();
    const audit = await this.repository.beginToolCall(toolName);
    if (!audit.allowed) throw new ToolRateLimitError();
    let result: T;
    try {
      result = await operation();
    } catch (error) {
      await this.repository.completeToolCall(audit.auditId, "failed", Math.max(0, this.now() - startedAt));
      throw error;
    }
    const failed = typeof result === "object" && result !== null && "isError" in result && result.isError === true;
    await this.repository.completeToolCall(audit.auditId, failed ? "failed" : "completed", Math.max(0, this.now() - startedAt));
    return result;
  }
}
