import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card } from 'primereact/card';
import { Avatar } from 'primereact/avatar';
import { Button } from 'primereact/button';
import { publicProfileService } from '../../services/publicProfileService';
import { PageHeader } from '../../components/ui/PageHeader';
import type { PublicProfile } from '../../types/domain';

export function PublicProfilePage() {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadProfile() {
      if (!username) return;
      setLoading(true);
      setError(null);
      try {
        const data = await publicProfileService.getByUsername(username);
        if (!data) {
          setError('Profile not found');
        } else {
          setProfile(data);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    }
    
    loadProfile();
  }, [username]);

  if (loading) {
    return (
      <div className="flex align-items-center justify-content-center h-full">
        <i className="pi pi-spin pi-spinner" style={{ fontSize: '2rem' }} />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="flex flex-column align-items-center justify-content-center h-full gap-3">
        <i className="pi pi-user text-600" style={{ fontSize: '3rem' }} />
        <h2 className="m-0 text-600">User Not Found</h2>
        <p className="text-secondary m-0">{error || 'This public profile does not exist or has been removed.'}</p>
        <Button label="Back to Home" icon="pi pi-home" onClick={() => navigate('/')} className="mt-3" />
      </div>
    );
  }

  return (
    <div className="surface-ground h-full">
      <PageHeader title={`@${profile.username}`} />
      
      <div className="flex flex-column md:flex-row gap-4 mt-4">
        <Card className="flex-1 md:flex-none md:w-20rem">
          <div className="flex flex-column align-items-center text-center">
            {profile.avatarUrl ? (
              <img 
                src={profile.avatarUrl} 
                alt={profile.fullName} 
                className="border-circle shadow-2 mb-3" 
                style={{ width: '120px', height: '120px', objectFit: 'cover' }} 
              />
            ) : (
              <Avatar 
                icon="pi pi-user" 
                size="xlarge" 
                shape="circle" 
                className="mb-3 shadow-2"
                style={{ width: '120px', height: '120px', fontSize: '3rem' }}
              />
            )}
            <h2 className="m-0 mb-1">{profile.fullName || `@${profile.username}`}</h2>
            <span className="text-secondary text-sm">Joined {new Date(profile.createdAt).toLocaleDateString()}</span>
          </div>
        </Card>
        
        <Card className="flex-1">
          <h3 className="m-0 mb-3">Activity</h3>
          <div className="text-secondary">
            Public activity will be shown here in the future.
          </div>
        </Card>
      </div>
    </div>
  );
}
