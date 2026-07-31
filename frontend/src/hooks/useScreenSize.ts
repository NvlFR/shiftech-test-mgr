import { useEffect, useState } from 'react';

const SM_BREAKPOINT = 600;

interface ScreenSize {
  lt: { sm: boolean };
}

/** Small responsive contract used by source-new pages without replacing local layout hooks. */
export function useScreenSize(): ScreenSize {
  const [ltSm, setLtSm] = useState(() => typeof window !== 'undefined' && window.innerWidth < SM_BREAKPOINT);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const mediaQuery = window.matchMedia(`(max-width: ${SM_BREAKPOINT - 1}px)`);
    const handleChange = (event: MediaQueryListEvent) => setLtSm(event.matches);
    setLtSm(mediaQuery.matches);
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return { lt: { sm: ltSm } };
}
