import { useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Avatar } from 'primereact/avatar';
import { Button } from 'primereact/button';
import { OverlayPanel } from 'primereact/overlaypanel';
import { Skeleton } from 'primereact/skeleton';
import { Tag } from 'primereact/tag';
import { useNavigate } from 'react-router-dom';
import { profileRepository } from '../../repositories/profileRepository';

interface UserHoverCardProps {
  userId: string;
  isOwner?: boolean;
  children: React.ReactNode;
}

const OPEN_DELAY_MS = 300;
const CLOSE_DELAY_MS = 150;

/** Preview profil ala source new, disesuaikan dengan Profile lokal (fullName/email). */
export function UserHoverCard({ userId, isOwner, children }: UserHoverCardProps) {
  const overlayRef = useRef<OverlayPanel>(null);
  const openTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [enabled, setEnabled] = useState(false);
  const navigate = useNavigate();
  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile', userId],
    queryFn: () => profileRepository.findById(userId),
    enabled,
  });

  function scheduleOpen(target: HTMLElement) {
    clearTimeout(closeTimer.current);
    clearTimeout(openTimer.current);
    openTimer.current = setTimeout(() => {
      setEnabled(true);
      overlayRef.current?.show(null, target);
    }, OPEN_DELAY_MS);
  }

  function scheduleClose() {
    clearTimeout(openTimer.current);
    closeTimer.current = setTimeout(() => overlayRef.current?.hide(), CLOSE_DELAY_MS);
  }

  return (
    <>
      <span className="cursor-pointer" onMouseEnter={(event) => scheduleOpen(event.currentTarget)} onMouseLeave={scheduleClose} onClick={(event) => { event.stopPropagation(); clearTimeout(openTimer.current); overlayRef.current?.hide(); navigate(`/users/${userId}`); }}>
        {children}
      </span>
      <OverlayPanel ref={overlayRef} showCloseIcon={false} className="user-hover-card" onMouseEnter={() => clearTimeout(closeTimer.current)} onMouseLeave={scheduleClose}>
        {isLoading ? (
          <div className="flex align-items-center gap-3" style={{ width: '260px' }}>
            <Skeleton shape="circle" size="3rem" />
            <div className="flex-1"><Skeleton width="8rem" className="mb-2" /><Skeleton width="10rem" /></div>
          </div>
        ) : profile ? (
          <div style={{ width: '260px' }}>
            <div className="flex align-items-center gap-3">
              <Avatar image={profile.avatarUrl ?? undefined} icon={profile.avatarUrl ? undefined : 'pi pi-user'} shape="circle" size="xlarge" />
              <div className="min-w-0">
                <div className="font-bold white-space-nowrap overflow-hidden text-overflow-ellipsis">{profile.fullName || profile.email}</div>
                <div className="username-text text-sm white-space-nowrap overflow-hidden text-overflow-ellipsis">{profile.email}</div>
              </div>
            </div>
            {isOwner !== undefined && <Tag className="mt-3" value={isOwner ? 'Owner' : 'Bukan owner'} severity={isOwner ? 'success' : 'secondary'} icon={isOwner ? 'pi pi-star-fill' : undefined} />}
            <Button label="Lihat profil" icon="pi pi-external-link" text size="small" className="mt-3 p-0" onClick={() => { overlayRef.current?.hide(); navigate(`/users/${userId}`); }} />
          </div>
        ) : <span className="text-color-secondary text-sm">User tidak ditemukan.</span>}
      </OverlayPanel>
    </>
  );
}
