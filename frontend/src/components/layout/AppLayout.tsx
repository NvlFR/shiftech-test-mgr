import { Outlet } from 'react-router-dom';
import { classNames } from 'primereact/utils';
import { AppTopbar } from './AppTopbar';
import { AppSidebar, AppSidebarMask } from './AppSidebar';
import { LayoutProvider, useLayoutContext } from './LayoutContext';
import { BreadcrumbProvider } from './BreadcrumbContext';

function AppLayoutInner() {
  const { menuActive } = useLayoutContext();

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
        <AppLayoutInner />
      </BreadcrumbProvider>
    </LayoutProvider>
  );
}
