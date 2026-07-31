import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

export function useTabQueryParam<T extends readonly string[]>(tabNames: T, defaultIndex = 0) {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTabIndex = useMemo(() => {
    const index = tabNames.indexOf(searchParams.get('tab') as T[number]);
    return index >= 0 ? index : defaultIndex;
  }, [defaultIndex, searchParams, tabNames]);

  const setActiveTabIndex = useCallback((index: number) => {
    if (index < 0 || index >= tabNames.length) return;
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      if (index === defaultIndex) next.delete('tab');
      else next.set('tab', tabNames[index]);
      return next;
    });
  }, [defaultIndex, setSearchParams, tabNames]);

  return [activeTabIndex, setActiveTabIndex] as const;
}
