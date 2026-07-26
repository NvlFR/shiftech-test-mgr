import { supabase } from '../config/supabaseClient';
import { parseAiTestRunAnalysisResponse } from '../helpers/aiTestRunAnalysisSchema';
import {
  AI_GATEWAY_FUNCTION,
  AI_TEST_RUN_ANALYSIS_ACTION,
  AI_TEST_RUN_ANALYSIS_CONTRACT_VERSION,
  type AiTestRunAnalysisRequest,
  type AiTestRunAnalysisResponse,
} from '../types/aiTestRunAnalysis';

export const aiTestRunAnalysisRepository = {
  async analyze(input: Pick<AiTestRunAnalysisRequest, 'projectId' | 'testRunId'>): Promise<AiTestRunAnalysisResponse> {
    const request: AiTestRunAnalysisRequest = {
      contractVersion: AI_TEST_RUN_ANALYSIS_CONTRACT_VERSION,
      action: AI_TEST_RUN_ANALYSIS_ACTION,
      projectId: input.projectId,
      testRunId: input.testRunId,
    };

    const { data, error } = await supabase.functions.invoke(AI_GATEWAY_FUNCTION, { body: request });
    if (error) throw new Error('AI gateway tidak dapat memproses analisis Test Run');
    const payload = data && typeof data === 'object' && 'data' in data
      ? (data as { data?: unknown }).data
      : data;
    return parseAiTestRunAnalysisResponse(payload);
  },
};
