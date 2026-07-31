import { useCallback, useEffect, useRef, useState } from 'react';

function readStoredValue<T>(key: string, defaultValue: T): T {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(key) ?? 'null');
    if (parsed === null || Array.isArray(parsed) !== Array.isArray(defaultValue) || typeof parsed !== typeof defaultValue) return defaultValue;
    return parsed as T;
  } catch {
    return defaultValue;
  }
}

export function useStoredState<T>(key: string, defaultValue: T): [T, (value: T | ((previous: T) => T)) => void] {
  const keyRef = useRef(key);
  const [value, setValue] = useState(() => readStoredValue(key, defaultValue));

  useEffect(() => {
    if (keyRef.current === key) return;
    keyRef.current = key;
    setValue(readStoredValue(key, defaultValue));
  }, [defaultValue, key]);

  const setStoredValue = useCallback((next: T | ((previous: T) => T)) => {
    setValue((previous) => {
      const resolved = typeof next === 'function' ? (next as (previous: T) => T)(previous) : next;
      try { localStorage.setItem(key, JSON.stringify(resolved)); } catch { /* storage may be unavailable */ }
      return resolved;
    });
  }, [key]);

  return [value, setStoredValue];
}
