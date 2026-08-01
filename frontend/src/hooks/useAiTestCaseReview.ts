import { useCallback, useEffect, useState } from 'react';
import { moduleService } from '../services/moduleService';
import { tagService } from '../services/tagService';
import { testCaseService } from '../services/testCaseService';
import type { Module, Tag, TestCase, TestCaseWithDetails } from '../types/domain';

export function useAiTestCaseReview(projectId: string | null) {
  const [drafts, setDrafts] = useState<TestCaseWithDetails[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reload = useCallback(async () => {
    if (!projectId) { setDrafts([]); setModules([]); setTags([]); return; }
    setLoading(true); setError(null);
    try {
      const [nextDrafts, nextModules, nextTags] = await Promise.all([testCaseService.listPendingAiReview(projectId), moduleService.listByProject(projectId), tagService.listByProject(projectId)]);
      setDrafts(nextDrafts); setModules(nextModules); setTags(nextTags);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Gagal memuat antrean review.'); }
    finally { setLoading(false); }
  }, [projectId]);
  useEffect(() => { void reload(); }, [reload]);
  const review = useCallback(async (ids: string[], decision: 'approved' | 'rejected') => {
    setSaving(true); setError(null);
    try { const count = await testCaseService.reviewAiDrafts(ids, decision); await reload(); return count; }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Review gagal disimpan.'); throw reason; }
    finally { setSaving(false); }
  }, [reload]);
  const update = useCallback(async (draft: TestCaseWithDetails, changes: Partial<TestCase>, tagNames: string[]) => {
    if (!projectId) return;
    setSaving(true); setError(null);
    try { await testCaseService.update(draft.id, projectId, changes, tagNames); await reload(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Perubahan draf gagal disimpan.'); throw reason; }
    finally { setSaving(false); }
  }, [projectId, reload]);
  return { drafts, modules, tags, loading, saving, error, reload, review, update };
}
