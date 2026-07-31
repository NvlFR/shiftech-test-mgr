import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Tag } from 'primereact/tag';
import { Button } from 'primereact/button';
import { MultiSelect } from 'primereact/multiselect';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { Toast } from 'primereact/toast';
import { useProfiles } from '../../hooks/useProfiles';
import { profileService } from '../../services/profileService';
import type { Profile } from '../../types/domain';
import { useAuthContext } from '../../hooks/useAuth';
import { formatDateTime } from '../../helpers/dateFormatter';
import { PageHeader } from '../../components/ui/PageHeader';
import { USER_ROLE_LABEL, USER_ROLE_SEVERITY } from '../../helpers/statusLabels';
import { SearchInput } from '../../components/ui/SearchInput';
import { FilterToolbar } from '../../components/ui/FilterToolbar';
import { dataTablePaginatorProps } from '../../components/ui/dataTablePaginator';
import { useScreenSize } from '../../hooks/useScreenSize';
import type { UserRole } from '../../types/domain';

const ROLE_OPTIONS: { label: string; value: UserRole }[] = (['pending', 'user', 'admin'] as const)
  .map((value) => ({ label: USER_ROLE_LABEL[value], value }));

export function UserManagementPage() {
  const { profiles, loading, reload } = useProfiles();
  const { profile: currentProfile } = useAuthContext();
  const navigate = useNavigate();
  const toast = useRef<Toast>(null);
  const { lt } = useScreenSize();
  const isMobile = lt.sm;
  const [search, setSearch] = useState('');
  const [roles, setRoles] = useState<UserRole[]>([]);

  const visibleProfiles = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return profiles.filter((item) => {
      const matchesSearch = !query || item.email.toLocaleLowerCase().includes(query)
        || (item.fullName?.toLocaleLowerCase().includes(query) ?? false);
      return matchesSearch && (roles.length === 0 || roles.includes(item.role));
    });
  }, [profiles, roles, search]);

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
      <FilterToolbar>
        <MultiSelect value={roles} options={ROLE_OPTIONS} onChange={(event) => setRoles(event.value)} placeholder="Semua role" display="chip" className="col-12 md:col-3" />
        <SearchInput value={search} onChange={setSearch} placeholder="Cari nama atau email..." className="col-12 md:col" />
        <Button label="Reset" text disabled={!search && roles.length === 0} onClick={() => { setSearch(''); setRoles([]); }} />
      </FilterToolbar>
      <DataTable value={visibleProfiles} loading={loading} {...dataTablePaginatorProps} rows={10} rowsPerPageOptions={[5, 10, 25, 50]} emptyMessage="Belum ada user" size="small" dataKey="id">
        {isMobile && <Column body={(row: Profile) => <div className="flex flex-column gap-2 py-1"><span className="font-bold">{row.fullName ?? row.email}</span><span className="text-sm text-color-secondary">{row.email}</span><span><Tag value={USER_ROLE_LABEL[row.role]} severity={USER_ROLE_SEVERITY[row.role]} /></span><small className="text-color-secondary">Terdaftar {formatDateTime(row.createdAt)}</small></div>} />}
        {!isMobile && <Column field="email" header="Email" sortable />}
        {!isMobile && <Column field="fullName" header="Nama" sortable />}
        {!isMobile && <Column field="role" header="Role" body={(row: Profile) => <Tag value={USER_ROLE_LABEL[row.role]} severity={USER_ROLE_SEVERITY[row.role]} />} sortable />}
        {!isMobile && <Column field="createdAt" header="Terdaftar" body={(row: Profile) => formatDateTime(row.createdAt)} sortable />}
        <Column header="Aksi" body={actionsTemplate} />
      </DataTable>
    </div>
  );
}
