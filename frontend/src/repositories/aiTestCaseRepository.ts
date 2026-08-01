import { supabase } from '../config/supabaseClient';
import { parseAiTestCaseResponse } from '../helpers/aiTestCaseParser';
import type { AiTestCaseGenerationRequest, AiTestCaseGenerationResult } from '../types/aiTestCase';

const EDGE_FUNCTION_NAME = import.meta.env.VITE_AI_EDGE_FUNCTION_NAME || 'ai-gateway';

function mockResult(request: AiTestCaseGenerationRequest): AiTestCaseGenerationResult {
  const firstLine = request.source.content.split(/\r?\n/).map((line) => line.trim()).find(Boolean) ?? 'Fitur aplikasi';
  const includeScenarios = request.options.includeScenarios;
  const includeEdgeCases = request.options.includeEdgeCases;
  return {
    provider: 'mock',
    model: 'local-mock',
    promptVersion: 'frontend-mock-v1',
    drafts: ([
      { scenarioType: 'happy_path', title: `Validasi ${firstLine.slice(0, 150)}`, steps: '1. Buka fitur terkait.\n2. Masukkan data sesuai requirement.\n3. Jalankan aksi utama.', expectedResult: 'Sistem memproses aksi dan menampilkan hasil sesuai requirement tanpa error.' },
      { scenarioType: 'negative', title: `Tolak input invalid untuk ${firstLine.slice(0, 120)}`, steps: '1. Buka fitur terkait.\n2. Masukkan data invalid.\n3. Jalankan aksi utama.', expectedResult: 'Sistem menolak input dan menampilkan validasi yang jelas.' },
      { scenarioType: 'edge_case', title: `Tangani nilai batas untuk ${firstLine.slice(0, 120)}`, steps: '1. Buka fitur terkait.\n2. Masukkan data pada nilai batas.\n3. Jalankan aksi utama.', expectedResult: 'Sistem menangani nilai batas secara konsisten tanpa error.' },
    ] as const).map((scenario) => ({
      requirementRef: firstLine.slice(0, 500),
      scenarioType: scenario.scenarioType,
      title: scenario.title,
      objective: `Memastikan requirement berikut berjalan sesuai tujuan: ${firstLine}`,
      preconditions: 'Pengguna memiliki akses yang diperlukan dan data uji tersedia.',
      steps: scenario.steps,
      expectedResult: scenario.expectedResult,
      priority: 'medium',
      tags: ['AI-draft'],
      notes: 'Draf dari mock provider. Review sebelum disimpan.',
      scenarios: includeScenarios ? ['Alur utama dengan input valid', 'Pengguna mengulangi aksi setelah berhasil'] : [],
      edgeCases: includeEdgeCases ? ['Input kosong atau hanya spasi', 'Koneksi terputus saat aksi diproses'] : [],
    })),
  };
}

export const aiTestCaseRepository = {
  async generate(request: AiTestCaseGenerationRequest): Promise<AiTestCaseGenerationResult> {
    if (import.meta.env.DEV && import.meta.env.VITE_AI_PROVIDER === 'mock') return mockResult(request);

    const { data, error } = await supabase.functions.invoke(EDGE_FUNCTION_NAME, {
      body: {
        action: 'generate_test_cases',
        projectId: request.projectId,
        source: request.source,
        options: request.options,
      },
    });
    if (error) throw new Error(`AI gateway gagal: ${error.message}`);

    const drafts = parseAiTestCaseResponse(data);
    const response = data && typeof data === 'object' ? data as Record<string, unknown> : {};
    return {
      drafts,
      provider: typeof response.provider === 'string' ? response.provider : 'edge-function',
      model: typeof response.model === 'string' ? response.model : null,
      promptVersion: typeof response.promptVersion === 'string' ? response.promptVersion : null,
    };
  },
};
