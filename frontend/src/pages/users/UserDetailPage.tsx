import { useNavigate, useParams } from 'react-router-dom';
import { Button } from 'primereact/button';
import { Breadcrumb } from '../../components/ui/Breadcrumb';
import { ProfileView } from '../../components/profile/ProfileView';
import { useProfileView } from '../../hooks/useProfileView';

export function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profileView, loading, error } = useProfileView(id ?? '');

  if (loading) return <p>Memuat...</p>;
  if (!profileView) {
    const message = error instanceof Error ? error.message : 'User tidak ditemukan.';
    return <div className="flex flex-column gap-3"><p className="m-0">{message}</p><Button label="Kembali" icon="pi pi-arrow-left" text onClick={() => navigate('/users')} /></div>;
  }

  const { profile, projects, suites } = profileView;

  return (
    <div>
      <Breadcrumb
        items={[
          { label: 'Users', path: '/users' },
          { label: profile.fullName ?? profile.email },
        ]}
      />

      <Button label="Kembali" icon="pi pi-arrow-left" text onClick={() => navigate('/users')} className="mb-3" />

      <ProfileView profile={profile} projects={projects} suites={suites} />
    </div>
  );
}
