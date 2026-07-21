import { AppMenu } from './AppMenu';
import { useLayoutContext } from './LayoutContext';

export function AppSidebar() {
  const { onMenuToggle, isDesktop } = useLayoutContext();

  function handleNavigate() {
    if (!isDesktop()) onMenuToggle();
  }

  return (
    <div className="layout-sidebar">
      <AppMenu onNavigate={handleNavigate} />
    </div>
  );
}

export function AppSidebarMask() {
  const { onMenuToggle } = useLayoutContext();
  return <div className="layout-mask" onClick={onMenuToggle} />;
}
