import { Link } from 'react-router-dom';
import { Avatar } from 'primereact/avatar';
import { Button } from 'primereact/button';
import { classNames } from 'primereact/utils';
import { useAuthContext } from '../../hooks/useAuth';
import { useLayoutContext } from './LayoutContext';
import { ThemeToggle } from './ThemeToggle';

export function AppTopbar() {
  const { profile, signOut } = useAuthContext();
  const { layoutState, onMenuToggle, isDesktop } = useLayoutContext();

  const menuClosed = isDesktop() ? layoutState.staticMenuDesktopInactive : layoutState.staticMenuMobileActive;

  return (
    <div className="layout-topbar">
      <Button
        icon="pi pi-sidebar"
        text
        rounded
        className={classNames('layout-menu-button', { 'layout-menu-button-flipped': menuClosed })}
        aria-label="Toggle menu"
        onClick={onMenuToggle}
      />
      <Link to="/" className="layout-topbar-logo">
        <span>TestMan</span>
      </Link>
      <div className="flex-1" />
      <div className="flex align-items-center gap-2">
        <Avatar image={profile?.avatarUrl ?? undefined} icon={profile?.avatarUrl ? undefined : 'pi pi-user'} shape="circle" size="normal" />
        <span className="text-sm hidden md:inline">{profile?.fullName ?? profile?.email}</span>
        <ThemeToggle />
        <Button icon="pi pi-sign-out" text rounded aria-label="Keluar" onClick={signOut} />
      </div>
    </div>
  );
}
