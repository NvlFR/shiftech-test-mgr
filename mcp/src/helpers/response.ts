export const DEFAULT_PAGE_SIZE = 50;
export const MAX_PAGE_SIZE = 100;
export const MAX_RESPONSE_BYTES = 256 * 1024;

export interface PaginationInput {
  cursor?: string;
  limit?: number;
}

export interface PaginationMeta {
  limit: number;
  returned: number;
  hasMore: boolean;
  nextCursor: string | null;
}

export interface SuccessEnvelope<T> {
  data: T;
  pagination?: PaginationMeta;
}

export interface ErrorDetail {
  code: string;
  message: string;
  hint: string;
}

export interface ErrorEnvelope {
  error: ErrorDetail;
}

export interface ToolResponse {
  content: Array<{ type: "text"; text: string }>;
  isError?: true;
}

export class McpToolError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly hint: string,
  ) {
    super(message);
    this.name = "McpToolError";
  }
}

const byteLength = (value: unknown): number =>
  Buffer.byteLength(JSON.stringify(value), "utf8");

const toolResponse = (envelope: SuccessEnvelope<unknown> | ErrorEnvelope, isError = false): ToolResponse => ({
  content: [{ type: "text", text: JSON.stringify(envelope) }],
  ...(isError ? { isError: true as const } : {}),
});

export const normalizePageSize = (limit: number | undefined): number => {
  if (limit === undefined) return DEFAULT_PAGE_SIZE;

  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_PAGE_SIZE) {
    throw new McpToolError(
      "INVALID_PAGINATION",
      `limit must be an integer between 1 and ${MAX_PAGE_SIZE}`,
      `Use a smaller positive limit; the default is ${DEFAULT_PAGE_SIZE}.`,
    );
  }

  return limit;
};

export const successResponse = <T>(data: T): ToolResponse => {
  const envelope: SuccessEnvelope<T> = { data };
  if (byteLength(envelope) > MAX_RESPONSE_BYTES) {
    throw new McpToolError(
      "RESPONSE_TOO_LARGE",
      "The response exceeds the MCP context size limit",
      "Narrow the query, request fewer fields, or use a paginated tool with a smaller limit.",
    );
  }

  return toolResponse(envelope);
};

/**
 * Builds a bounded page from at most `limit + 1` repository rows. The extra row
 * is used only to detect another page and is never returned to the agent.
 */
export const paginatedResponse = <T>(
  rows: readonly T[],
  input: PaginationInput,
  cursorFor: (row: T) => string,
): ToolResponse => {
  const limit = normalizePageSize(input.limit);
  const candidates = rows.slice(0, limit);
  const hasRepositoryRemainder = rows.length > limit;
  const page: T[] = [];

  for (const candidate of candidates) {
    const proposed = [...page, candidate];
    const proposedHasMore = hasRepositoryRemainder || proposed.length < candidates.length;
    const envelope: SuccessEnvelope<T[]> = {
      data: proposed,
      pagination: {
        limit,
        returned: proposed.length,
        hasMore: proposedHasMore,
        nextCursor: proposedHasMore ? cursorFor(candidate) : null,
      },
    };

    if (byteLength(envelope) > MAX_RESPONSE_BYTES) break;
    page.push(candidate);
  }

  if (candidates.length > 0 && page.length === 0) {
    throw new McpToolError(
      "RESPONSE_ITEM_TOO_LARGE",
      "A single result exceeds the MCP context size limit",
      "Use a detail tool, request fewer fields, or narrow the query.",
    );
  }

  const hasMore = hasRepositoryRemainder || page.length < candidates.length;
  const last = page.at(-1);
  const envelope: SuccessEnvelope<T[]> = {
    data: page,
    pagination: {
      limit,
      returned: page.length,
      hasMore,
      nextCursor: hasMore && last !== undefined ? cursorFor(last) : null,
    },
  };

  return toolResponse(envelope);
};

export const errorResponse = (error: unknown): ToolResponse => {
  const detail: ErrorDetail = error instanceof McpToolError
    ? { code: error.code, message: error.message, hint: error.hint }
    : {
        code: "INTERNAL_ERROR",
        message: "The tool could not complete the request",
        hint: "Retry once. If the error persists, ask an administrator to inspect the MCP server logs.",
      };

  return toolResponse({ error: detail }, true);
};

export const withErrorHandling = async (
  handler: () => Promise<ToolResponse>,
): Promise<ToolResponse> => {
  try {
    return await handler();
  } catch (error) {
    return errorResponse(error);
  }
};
