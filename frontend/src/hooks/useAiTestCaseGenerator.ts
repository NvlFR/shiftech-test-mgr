import { useCallback, useState } from 'react';
import { aiTestCaseService } from '../services/aiTestCaseService';
import { parseRequirementFile, toAiTestCaseSource } from '../helpers/aiTestCaseParser';
import type { AiTestCaseDraft, AiTestCaseGenerationOptions, AiTestCaseGenerationResult, AiTestCaseSource } from '../types/aiTestCase';
import type { TestCaseWithDetails } from '../types/domain';

const DEFAULT_OPTIONS: AiTestCaseGenerationOptions = {
  includeScenarios: true,
  includeEdgeCases: true,
  maxCases: 10,
};

export function useAiTestCaseGenerator() {
  const [result, setResult] = useState<AiTestCaseGenerationResult | null>(null);
  const [source, setSource] = useState<AiTestCaseSource | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setTextSource = useCallback((content: string) => {
    setSource(toAiTestCaseSource(content));
    setError(null);
  }, []);

  const setFileSource = useCallback(async (file: File) => {
    const parsed = await parseRequirementFile(file);
    setSource(parsed);
    setError(null);
    return parsed;
  }, []);

  const generate = useCallback(async (projectId: string, options: AiTestCaseGenerationOptions = DEFAULT_OPTIONS, sourceOverride?: AiTestCaseSource) => {
    const generationSource = sourceOverride ?? source;
    if (!generationSource) throw new Error('Requirement atau dokumen wajib dipilih.');
    setLoading(true);
    setError(null);
    try {
      const nextResult = await aiTestCaseService.generate({ projectId, source: generationSource, options });
      setResult(nextResult);
      return nextResult;
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : 'Gagal menghasilkan test case.';
      setError(message);
      throw reason;
    } finally {
      setLoading(false);
    }
  }, [source]);

  const saveDraft = useCallback(async (projectId: string, draft: AiTestCaseDraft, moduleId: string | null) => {
    setSaving(true);
    try {
      return await aiTestCaseService.approveAndSave({ projectId, draft, moduleId });
    } finally {
      setSaving(false);
    }
  }, []);

  const findDuplicates = useCallback((draft: AiTestCaseDraft, existing: TestCaseWithDetails[]) => (
    aiTestCaseService.findPotentialDuplicates(draft, existing)
  ), []);

  const buildCsvPreview = useCallback((drafts: Array<AiTestCaseDraft & { moduleName?: string }>, existing: TestCaseWithDetails[]) => (
    aiTestCaseService.buildCsvPreview(drafts, existing)
  ), []);

  const reset = useCallback(() => {
    setResult(null);
    setSource(null);
    setError(null);
  }, []);

  return {
    result,
    drafts: result?.drafts ?? [],
    source,
    loading,
    saving,
    error,
    setTextSource,
    setFileSource,
    generate,
    saveDraft,
    findDuplicates,
    buildCsvPreview,
    reset,
  };
}
