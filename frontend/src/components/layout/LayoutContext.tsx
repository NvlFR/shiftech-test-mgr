import { createContext, useContext, useState, type ReactNode } from 'react';

interface LayoutState {
  staticMenuDesktopInactive: boolean;
  staticMenuMobileActive: boolean;
}

interface LayoutContextValue {
  layoutState: LayoutState;
  onMenuToggle: () => void;
  isDesktop: () => boolean;
}

const LayoutContext = createContext<LayoutContextValue | undefined>(undefined);

// Mirrors PrimeReact's Sakai admin template layout state machine, trimmed to
// the single "static" menu mode: sidebar pushes content on desktop, overlays on mobile.
export function LayoutProvider({ children }: { children: ReactNode }) {
  const [layoutState, setLayoutState] = useState<LayoutState>({
    staticMenuDesktopInactive: false,
    staticMenuMobileActive: false,
  });

  function isDesktop() {
    return window.innerWidth > 991;
  }

  function onMenuToggle() {
    if (isDesktop()) {
      setLayoutState((prev) => ({ ...prev, staticMenuDesktopInactive: !prev.staticMenuDesktopInactive }));
    } else {
      setLayoutState((prev) => ({ ...prev, staticMenuMobileActive: !prev.staticMenuMobileActive }));
    }
  }

  return (
    <LayoutContext.Provider value={{ layoutState, onMenuToggle, isDesktop }}>
      {children}
    </LayoutContext.Provider>
  );
}

export function useLayoutContext() {
  const ctx = useContext(LayoutContext);
  if (!ctx) throw new Error('useLayoutContext must be used within LayoutProvider');
  return ctx;
}
