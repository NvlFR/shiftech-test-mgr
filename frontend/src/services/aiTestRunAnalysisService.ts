import { aiTestRunAnalysisRepository } from '../repositories/aiTestRunAnalysisRepository';
import type { AiTestRunAnalysisResponse } from '../types/aiTestRunAnalysis';

export const aiTestRunAnalysisService = {
  async analyzeTestRun(projectId: string, testRunId: string): Promise<AiTestRunAnalysisResponse> {
    if (!projectId.trim()) throw new Error('Project wajib dipilih untuk analisis AI');
    if (!testRunId.trim()) throw new Error('Test Run wajib dipilih untuk analisis AI');

    const analysis = await aiTestRunAnalysisRepository.analyze({ projectId: projectId.trim(), testRunId: testRunId.trim() });
    if (analysis.projectId !== projectId.trim() || analysis.testRunId !== testRunId.trim()) {
      throw new Error('Response AI berada di luar scope project atau Test Run yang diminta');
    }
    if (analysis.mode !== 'review_only') {
      throw new Error('Analisis AI harus berstatus review-only');
    }
    return analysis;
  },
};
