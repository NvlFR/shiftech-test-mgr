import { Outlet } from 'react-router-dom';
import { classNames } from 'primereact/utils';
import { AppTopbar } from './AppTopbar';
import { AppSidebar, AppSidebarMask } from './AppSidebar';
import { LayoutProvider, useLayoutContext } from './LayoutContext';

function AppLayoutInner() {
  const { layoutState } = useLayoutContext();

  const wrapperClass = classNames('layout-wrapper', {
    'layout-static-inactive': layoutState.staticMenuDesktopInactive,
    'layout-mobile-active': layoutState.staticMenuMobileActive,
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
      <AppLayoutInner />
    </LayoutProvider>
  );
}
