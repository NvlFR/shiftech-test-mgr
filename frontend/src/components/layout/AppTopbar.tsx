import { Link } from 'react-router-dom';
import { Avatar } from 'primereact/avatar';
import { Button } from 'primereact/button';
import { Dropdown } from 'primereact/dropdown';
import { useAuthContext } from '../../hooks/useAuth';
import { useLayoutContext } from './LayoutContext';
import { useBreadcrumbContext } from './BreadcrumbContext';
import { BreadcrumbTrail } from '../ui/Breadcrumb';
import { ThemeToggle } from './ThemeToggle';
import { useProjectContext } from '../../hooks/useProjectContext';
import { notificationService } from '../../services/notificationService';
import type { Notification } from '../../types/domain';
import { useEffect, useState } from 'react';

export function AppTopbar() {
  const { profile, signOut } = useAuthContext();
  const { onMenuToggle } = useLayoutContext();
  const { items } = useBreadcrumbContext();
  const { projects, projectId, setProjectId, loading } = useProjectContext();
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    if (!profile) return;
    const load = () => notificationService.listUnread(profile.id).then(setNotifications).catch(() => undefined);
    void load();
    const timer = window.setInterval(load, 30000);
    return () => window.clearInterval(timer);
  }, [profile]);

  return (
    <div className="layout-topbar">
      <Button
        icon="pi pi-sidebar"
        text
        rounded
        className="layout-menu-button"
        aria-label="Toggle menu"
        onClick={onMenuToggle}
      />
      <Link to="/" className="layout-topbar-logo">
        <span>Testify</span>
      </Link>
      {items.length > 0 && (
        <>
          <i className="pi pi-angle-right text-color-secondary hidden lg:inline" style={{ fontSize: '0.7rem' }} />
          <BreadcrumbTrail items={items} className="hidden lg:flex align-items-center flex-wrap gap-2 text-sm" />
        </>
      )}
      <div className="flex-1" />
      <div className="flex align-items-center gap-2">
        <Dropdown
          value={projectId}
          options={projects.map((project) => ({ label: project.name, value: project.id }))}
          onChange={(event) => setProjectId(event.value)}
          placeholder="Project aktif"
          loading={loading}
          className="hidden md:inline-flex w-14rem"
          aria-label="Project aktif"
        />
        <Avatar image={profile?.avatarUrl ?? undefined} icon={profile?.avatarUrl ? undefined : 'pi pi-user'} shape="circle" size="normal" />
        <Button icon="pi pi-bell" text rounded badge={notifications.length ? String(notifications.length) : undefined} aria-label="Notifikasi" onClick={() => notifications[0] && notificationService.markRead(notifications[0].id).then(() => setNotifications((items) => items.slice(1)))} />
        <span className="text-sm hidden md:inline">{profile?.fullName ?? profile?.email}</span>
        <ThemeToggle />
        <Button icon="pi pi-sign-out" text rounded aria-label="Keluar" onClick={signOut} />
      </div>
    </div>
  );
}
