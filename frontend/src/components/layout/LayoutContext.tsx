import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

interface LayoutContextValue {
  menuActive: boolean;
  onMenuToggle: () => void;
  closeMenu: () => void;
}

const LayoutContext = createContext<LayoutContextValue | undefined>(undefined);

const DESKTOP_BREAKPOINT = 992;

function isDesktop() {
  return typeof window !== 'undefined' && window.innerWidth >= DESKTOP_BREAKPOINT;
}

export function LayoutProvider({ children }: { children: ReactNode }) {
  const [menuActive, setMenuActive] = useState(isDesktop);

  useEffect(() => {
    const handleResize = () => setMenuActive(isDesktop());
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  function onMenuToggle() {
    setMenuActive((prev) => !prev);
  }

  function closeMenu() {
    if (isDesktop()) return;
    setMenuActive(false);
  }

  return (
    <LayoutContext.Provider value={{ menuActive, onMenuToggle, closeMenu }}>
      {children}
    </LayoutContext.Provider>
  );
}

export function useLayoutContext() {
  const ctx = useContext(LayoutContext);
  if (!ctx) throw new Error('useLayoutContext must be used within LayoutProvider');
  return ctx;
}
