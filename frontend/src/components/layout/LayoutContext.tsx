import { createContext, useContext, useState, type ReactNode } from 'react';

interface LayoutContextValue {
  menuActive: boolean;
  onMenuToggle: () => void;
  closeMenu: () => void;
}

const LayoutContext = createContext<LayoutContextValue | undefined>(undefined);

// Sidebar always behaves as a slide-in overlay panel (same on desktop and
// mobile) — closed by default, opened via the topbar hamburger, closed via
// its own X button, a nav click, or the backdrop mask.
export function LayoutProvider({ children }: { children: ReactNode }) {
  const [menuActive, setMenuActive] = useState(false);

  function onMenuToggle() {
    setMenuActive((prev) => !prev);
  }

  function closeMenu() {
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
