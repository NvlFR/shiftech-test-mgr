import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Tag } from 'primereact/tag';
import { Button } from 'primereact/button';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { Toast } from 'primereact/toast';
import { useProfiles } from '../../hooks/useProfiles';
import { profileService } from '../../services/profileService';
import type { Profile, UserRole } from '../../types/domain';
import { useAuthContext } from '../../hooks/useAuth';
import { formatDateTime } from '../../helpers/dateFormatter';
import { PageHeader } from '../../components/ui/PageHeader';

const ROLE_SEVERITY: Record<UserRole, 'warning' | 'info' | 'success'> = {
  pending: 'warning',
  user: 'info',
  admin: 'success',
};

export function UserManagementPage() {
  const { profiles, loading, reload } = useProfiles();
  const { profile: currentProfile } = useAuthContext();
  const navigate = useNavigate();
  const toast = useRef<Toast>(null);

  async function handleApprove(row: Profile) {
    await profileService.approve(row.id);
    toast.current?.show({ severity: 'success', summary: 'User disetujui', detail: row.email });
    await reload();
  }

  async function handlePromote(row: Profile) {
    await profileService.promoteToAdmin(row.id);
    await reload();
  }

  async function handleDemote(row: Profile) {
    await profileService.demoteToUser(row.id);
    await reload();
  }

  function handleRevokeAccess(row: Profile) {
    confirmDialog({
      header: 'Cabut Akses',
      message: `Akses "${row.email}" akan dicabut dan kembali berstatus pending sampai disetujui ulang. Lanjutkan?`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Cabut Akses',
      rejectLabel: 'Batal',
      acceptClassName: 'p-button-warning',
      accept: async () => {
        await profileService.revokeAccess(row.id);
        toast.current?.show({ severity: 'warn', summary: 'Akses dicabut', detail: row.email });
        await reload();
      },
    });
  }

  function handleDelete(row: Profile) {
    confirmDialog({
      header: 'Hapus User',
      message: `User "${row.email}" akan dihapus dari daftar. Lanjutkan?`,
      icon: 'pi pi-trash',
      acceptLabel: 'Hapus',
      rejectLabel: 'Batal',
      acceptClassName: 'p-button-danger',
      accept: async () => {
        await profileService.remove(row.id);
        toast.current?.show({ severity: 'success', summary: 'User dihapus', detail: row.email });
        await reload();
      },
    });
  }

  function actionsTemplate(row: Profile) {
    const isSelf = row.id === currentProfile?.id;
    return (
      <div className="flex gap-2">
        <Button icon="pi pi-eye" size="small" text rounded aria-label="Detail" onClick={() => navigate(`/users/${row.id}`)} />
        {row.role === 'pending' && (
          <Button label="Approve" icon="pi pi-check" size="small" onClick={() => handleApprove(row)} />
        )}
        {row.role === 'user' && (
          <Button label="Jadikan Admin" icon="pi pi-shield" size="small" severity="secondary" outlined onClick={() => handlePromote(row)} />
        )}
        {row.role === 'admin' && !isSelf && (
          <Button label="Turunkan ke User" icon="pi pi-user" size="small" severity="secondary" outlined onClick={() => handleDemote(row)} />
        )}
        {row.role !== 'pending' && !isSelf && (
          <Button icon="pi pi-lock" size="small" severity="warning" outlined aria-label="Cabut Akses" onClick={() => handleRevokeAccess(row)} />
        )}
        {!isSelf && (
          <Button icon="pi pi-trash" size="small" severity="danger" outlined aria-label="Hapus" onClick={() => handleDelete(row)} />
        )}
      </div>
    );
  }

  return (
    <div>
      <Toast ref={toast} />
      <ConfirmDialog />
      <PageHeader title="User Management" />
      <DataTable value={profiles} loading={loading} paginator rows={10} emptyMessage="Belum ada user" size="small">
        <Column field="email" header="Email" sortable />
        <Column field="fullName" header="Nama" sortable />
        <Column field="role" header="Role" body={(row: Profile) => <Tag value={row.role} severity={ROLE_SEVERITY[row.role]} />} sortable />
        <Column field="createdAt" header="Terdaftar" body={(row: Profile) => formatDateTime(row.createdAt)} sortable />
        <Column header="Aksi" body={actionsTemplate} />
      </DataTable>
    </div>
  );
}
