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
import { NotificationPanel } from '../notifications/NotificationPanel';
import type { Notification } from '../../types/domain';
import { useEffect, useState } from 'react';
import { supabase } from '../../config/supabaseClient';

export function AppTopbar() {
  const { profile, signOut } = useAuthContext();
  const { onMenuToggle } = useLayoutContext();
  const { items } = useBreadcrumbContext();
  const { projects, projectId, setProjectId, loading } = useProjectContext();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notificationPanelVisible, setNotificationPanelVisible] = useState(false);

  useEffect(() => {
    if (!profile) return;
    const load = () => notificationService.listUnread(profile.id).then(setNotifications).catch(() => undefined);
    void load();
    const channel = supabase.channel(`notifications:${profile.id}`).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `recipient_id=eq.${profile.id}` }, load).subscribe();
    const timer = window.setInterval(load, 60000);
    return () => { window.clearInterval(timer); void supabase.removeChannel(channel); };
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
        <Button
          icon="pi pi-bell"
          text
          rounded
          badge={notifications.length ? String(notifications.length) : undefined}
          aria-label="Notifikasi"
          onClick={() => setNotificationPanelVisible(true)}
        />
        <Avatar image={profile?.avatarUrl ?? undefined} icon={profile?.avatarUrl ? undefined : 'pi pi-user'} shape="circle" size="normal" />
        <span className="text-sm hidden md:inline">{profile?.fullName ?? profile?.email}</span>
        <ThemeToggle />
        <Button icon="pi pi-sign-out" text rounded aria-label="Keluar" onClick={signOut} />
      </div>
      <NotificationPanel
        visible={notificationPanelVisible}
        onHide={() => setNotificationPanelVisible(false)}
        notifications={notifications}
        unreadCount={notifications.length}
        onMarkRead={(id) => { void notificationService.markRead(id).then(() => setNotifications((items) => items.filter((item) => item.id !== id))); }}
        onMarkAllRead={() => { if (profile) void notificationService.markAllRead(profile.id).then(() => setNotifications([])); }}
        onNotificationClick={() => setNotificationPanelVisible(false)}
      />
    </div>
  );
}
