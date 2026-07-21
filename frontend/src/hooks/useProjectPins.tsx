import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'pinned-projects.v1';

function readStoredPins(): string[] {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

// Pin state is a per-browser UI preference (same pattern as useTheme.tsx), not shared team data,
// so it lives in localStorage instead of a new Supabase column.
export function useProjectPins() {
  const [pinnedIds, setPinnedIds] = useState<string[]>(() => readStoredPins());

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pinnedIds));
  }, [pinnedIds]);

  const isPinned = useCallback((id: string) => pinnedIds.includes(id), [pinnedIds]);

  const togglePin = useCallback((id: string) => {
    setPinnedIds((current) => (current.includes(id) ? current.filter((pinnedId) => pinnedId !== id) : [...current, id]));
  }, []);

  return { pinnedIds, isPinned, togglePin };
}
