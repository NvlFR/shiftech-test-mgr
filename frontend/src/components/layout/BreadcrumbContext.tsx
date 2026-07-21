import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';

export interface BreadcrumbItem {
  label: string;
  path?: string;
}

interface BreadcrumbContextValue {
  items: BreadcrumbItem[];
  setItems: (items: BreadcrumbItem[]) => void;
}

const BreadcrumbContext = createContext<BreadcrumbContextValue | undefined>(undefined);

export function BreadcrumbProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<BreadcrumbItem[]>([]);
  const { pathname } = useLocation();

  // Reset on route change, not on Breadcrumb unmount: a page with a Breadcrumb sets
  // its own items right after in the same navigation, while a page without one (e.g.
  // a plain list page) correctly ends up with an empty trail instead of a stale one.
  useEffect(() => {
    setItems([]);
  }, [pathname]);

  return <BreadcrumbContext.Provider value={{ items, setItems }}>{children}</BreadcrumbContext.Provider>;
}

export function useBreadcrumbContext() {
  const ctx = useContext(BreadcrumbContext);
  if (!ctx) throw new Error('useBreadcrumbContext must be used within BreadcrumbProvider');
  return ctx;
}
