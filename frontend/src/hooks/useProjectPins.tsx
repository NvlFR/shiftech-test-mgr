import { useCallback } from 'react';
import { useStoredState } from './useStoredState';

const STORAGE_KEY = 'pinned-projects.v1';

// Pin state is a per-browser UI preference (same pattern as useTheme.tsx), not shared team data,
// so it lives in localStorage instead of a new Supabase column.
export function useProjectPins() {
  const [pinnedIds, setPinnedIds] = useStoredState<string[]>(STORAGE_KEY, []);

  const isPinned = useCallback((id: string) => pinnedIds.includes(id), [pinnedIds]);

  const togglePin = useCallback((id: string) => {
    setPinnedIds((current) => (current.includes(id) ? current.filter((pinnedId) => pinnedId !== id) : [...current, id]));
  }, []);

  return { pinnedIds, isPinned, togglePin };
}
