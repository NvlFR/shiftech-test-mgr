import { supabase } from '../config/supabaseClient';
import type {
  AiGatewayAssistantRequest,
  AiGatewayDuplicateRequest,
  AiGatewayIssueDraftRequest,
} from '../types/ai';

export const AI_GATEWAY_FUNCTION = 'ai-gateway';

type AiGatewayRequest = AiGatewayIssueDraftRequest | AiGatewayDuplicateRequest | AiGatewayAssistantRequest;

export const aiRepository = {
  async invoke(request: AiGatewayRequest): Promise<unknown> {
    // Supabase attaches the current authenticated session to this request.
    // Provider credentials must remain inside the Edge Function.
    const { data, error } = await supabase.functions.invoke(AI_GATEWAY_FUNCTION, { body: request });
    if (error) throw error;
    if (data === null || data === undefined) throw new Error('Respons AI kosong');
    if (typeof data === 'object' && data !== null && 'data' in data) {
      const envelope = data as { data?: unknown };
      return envelope.data ?? data;
    }
    return data;
  },

  async recordApproval(input: { projectId: string; targetType: 'test_case' | 'issue'; targetId: string }): Promise<void> {
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) throw new Error('Sesi user tidak tersedia untuk audit approval AI');
    const { error } = await supabase.from('ai_audit_events').insert({
      project_id: input.projectId,
      action: 'approve_draft',
      provider: 'user-review',
      model: 'n/a',
      prompt_version: 'n/a',
      status: 'completed',
      created_by: authData.user.id,
      target_type: input.targetType,
      target_id: input.targetId,
      request_hash: `approval:${input.targetType}:${input.targetId}`,
      completed_at: new Date().toISOString(),
    });
    if (error) throw error;
  },
};
