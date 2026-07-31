import { Link, useNavigate } from 'react-router-dom';
import { Avatar } from 'primereact/avatar';
import { Button } from 'primereact/button';
import { Dropdown } from 'primereact/dropdown';
import { useAuthContext } from '../../hooks/useAuth';
import { useLayoutContext } from './LayoutContext';
import { useBreadcrumbContext } from './BreadcrumbContext';
import { BreadcrumbTrail } from '../ui/Breadcrumb';
import { ThemeToggle } from './ThemeToggle';
import { useProjectContext } from '../../hooks/useProjectContext';
import { NotificationPanel } from '../notifications/NotificationPanel';
import { useState } from 'react';
import { useNotifications } from '../../hooks/useNotifications';

export function AppTopbar() {
  const navigate = useNavigate();
  const { profile, signOut } = useAuthContext();
  const { onMenuToggle } = useLayoutContext();
  const { items } = useBreadcrumbContext();
  const { projects, projectId, setProjectId, loading } = useProjectContext();
  const { notifications, unreadCount, loading: notificationsLoading, error: notificationsError, markRead, markAllRead, remove, clearAll, getNavigationPath, mutating } = useNotifications();
  const [notificationPanelVisible, setNotificationPanelVisible] = useState(false);

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
          badge={unreadCount ? String(unreadCount) : undefined}
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
        unreadCount={unreadCount}
        onMarkRead={markRead}
        onMarkAllRead={markAllRead}
        onRemove={remove}
        onClearAll={clearAll}
        loading={notificationsLoading}
        error={notificationsError}
        disabled={mutating}
        onNotificationClick={(notification) => {
          setNotificationPanelVisible(false);
          const path = getNavigationPath(notification);
          if (path) navigate(path);
        }}
      />
    </div>
  );
}
