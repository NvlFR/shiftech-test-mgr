import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card } from 'primereact/card';
import { Avatar } from 'primereact/avatar';
import { Tag } from 'primereact/tag';
import { Button } from 'primereact/button';
import { profileService } from '../../services/profileService';
import type { Profile } from '../../types/domain';
import { formatDateTime } from '../../helpers/dateFormatter';
import { USER_ROLE_LABEL, USER_ROLE_SEVERITY } from '../../helpers/statusLabels';

export function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    profileService.getById(id).then((result) => {
      setProfile(result);
      setLoading(false);
    });
  }, [id]);

  if (loading) return <p>Memuat...</p>;
  if (!profile) return <p>User tidak ditemukan.</p>;

  return (
    <div>
      <Button label="Kembali" icon="pi pi-arrow-left" text onClick={() => navigate('/users')} className="mb-3" />

      <Card>
        <div className="flex align-items-center gap-3 mb-4">
          <Avatar image={profile.avatarUrl ?? undefined} icon={profile.avatarUrl ? undefined : 'pi pi-user'} shape="circle" size="xlarge" />
          <div>
            <h2 className="m-0">{profile.fullName ?? profile.email}</h2>
            <p className="m-0 text-color-secondary">{profile.email}</p>
          </div>
          <div className="flex-1" />
          <Tag value={USER_ROLE_LABEL[profile.role]} severity={USER_ROLE_SEVERITY[profile.role]} />
        </div>

        <div className="grid">
          <div className="col-12 md:col-6">
            <label className="block text-color-secondary text-sm mb-1">Terdaftar</label>
            <p className="mt-0">{formatDateTime(profile.createdAt)}</p>
          </div>
          <div className="col-12 md:col-6">
            <label className="block text-color-secondary text-sm mb-1">Update Terakhir</label>
            <p className="mt-0">{formatDateTime(profile.updatedAt)}</p>
          </div>
          <div className="col-12 md:col-6">
            <label className="block text-color-secondary text-sm mb-1">User ID</label>
            <p className="mt-0 text-sm font-mono">{profile.id}</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
