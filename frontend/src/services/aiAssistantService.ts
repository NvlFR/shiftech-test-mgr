import { aiRepository } from '../repositories/aiRepository';
import { parseAssistantResult } from '../helpers/aiValidators';
import { assertAiProjectScope } from './aiIssueService';
import type { AiActorContext, AiAssistantEntityType, AiAssistantSearchResult, AiGatewayAssistantRequest } from '../types/ai';

export const aiAssistantService = {
  async search(input: {
    projectId: string;
    query: string;
    actor: AiActorContext;
    entityTypes?: AiAssistantEntityType[];
    limit?: number;
  }): Promise<AiAssistantSearchResult> {
    assertAiProjectScope(input.projectId, input.actor);
    const query = input.query.trim();
    if (!query) throw new Error('Pertanyaan assistant tidak boleh kosong');
    if (query.length > 500) throw new Error('Pertanyaan assistant terlalu panjang');
    const limit = Math.min(Math.max(input.limit ?? 10, 1), 50);

    const response = await aiRepository.invoke({
      action: 'assistant_search',
      projectId: input.projectId,
      query,
      entityTypes: input.entityTypes,
      limit,
    } satisfies AiGatewayAssistantRequest);
    const parsed = parseAssistantResult(response);
    return {
      answer: parsed.answer ?? null,
      // A provider response is never allowed to widen the active project scope.
      matches: parsed.matches
        .filter((match) => match.projectId === input.projectId)
        .slice(0, limit)
        .map((match) => ({ ...match, code: match.code ?? null })),
    };
  },
};
