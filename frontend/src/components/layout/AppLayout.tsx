import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { classNames } from 'primereact/utils';
import { AppTopbar } from './AppTopbar';
import { AppSidebar, AppSidebarMask } from './AppSidebar';
import { LayoutProvider, useLayoutContext } from './LayoutContext';
import { BreadcrumbProvider } from './BreadcrumbContext';
import { ProjectProvider } from '../../hooks/useProjectContext';
import { useRealtimeSync } from '../../hooks/useRealtimeSync';
import { useUserPreferences } from '../../hooks/useUserPreferences';
import { useThemeContext } from '../../hooks/useTheme';

function AppLayoutInner() {
  useRealtimeSync();
  const { menuActive } = useLayoutContext();
  const { preferences } = useUserPreferences();
  const { mode, setMode } = useThemeContext();

  useEffect(() => {
    if (preferences?.theme && preferences.theme !== mode) {
      setMode(preferences.theme);
    }
  }, [preferences?.theme, mode, setMode]);

  const wrapperClass = classNames('layout-wrapper', {
    'layout-menu-active': menuActive,
  });

  return (
    <div className={wrapperClass}>
      <AppTopbar />
      <AppSidebar />
      <AppSidebarMask />
      <div className="layout-main-container">
        <div className="layout-main">
          <Outlet />
        </div>
      </div>
    </div>
  );
}

export function AppLayout() {
  return (
    <LayoutProvider>
      <BreadcrumbProvider>
        <ProjectProvider>
          <AppLayoutInner />
        </ProjectProvider>
      </BreadcrumbProvider>
    </LayoutProvider>
  );
}
