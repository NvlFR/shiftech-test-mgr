import { Link } from 'react-router-dom';
import { Button } from 'primereact/button';
import { AppMenu } from './AppMenu';
import { useLayoutContext } from './LayoutContext';

export function AppSidebar() {
  const { closeMenu } = useLayoutContext();

  return (
    <div className="layout-sidebar">
      <div className="layout-sidebar-header layout-sidebar-header-mobile">
        <Link to="/" className="layout-sidebar-logo" onClick={closeMenu}>
          <i className="pi pi-check-square" aria-hidden="true" />
          <span>TestManager</span>
        </Link>
        <Button icon="pi pi-times" text rounded severity="secondary" aria-label="Tutup menu" onClick={closeMenu} />
      </div>
      <AppMenu onNavigate={closeMenu} />
    </div>
  );
}

export function AppSidebarMask() {
  const { closeMenu } = useLayoutContext();
  return <div className="layout-mask" onClick={closeMenu} />;
}
