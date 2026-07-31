import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DataTable, type DataTableSortEvent } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { Dropdown } from 'primereact/dropdown';
import { Tag } from 'primereact/tag';
import { Menu } from 'primereact/menu';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { Toast } from 'primereact/toast';
import { useProjects } from '../../hooks/useProjects';
import { Breadcrumb } from '../../components/ui/Breadcrumb';
import { projectService } from '../../services/projectService';
import type { Project, ProjectSortField, ProjectStatus } from '../../types/domain';
import type { ProjectQuery } from '../../repositories/projectRepository';
import { formatDate } from '../../helpers/dateFormatter';
import { PageHeader } from '../../components/ui/PageHeader';
import { PROJECT_STATUS_LABEL, PROJECT_STATUS_SEVERITY } from '../../helpers/statusLabels';
import { SearchInput } from '../../components/ui/SearchInput';
import { FilterToolbar } from '../../components/ui/FilterToolbar';
import { useScreenSize } from '../../hooks/useScreenSize';
import { dataTablePaginatorProps } from '../../components/ui/dataTablePaginator';

const STATUS_OPTIONS: { label: string; value: ProjectStatus | 'all' }[] = [
  { label: 'Semua Status', value: 'all' },
  { label: 'Aktif', value: 'active' },
  { label: 'Nonaktif', value: 'inactive' },
  { label: 'Arsip', value: 'archived' },
];

export function ProjectsPage() {
  const navigate = useNavigate();
  const toast = useRef<Toast>(null);
  const menuRef = useRef<Menu>(null);
  const { lt } = useScreenSize();
  const isMobile = lt.sm;
  const [menuRow, setMenuRow] = useState<Project | null>(null);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | 'all'>('all');
  const [sortField, setSortField] = useState<ProjectSortField>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const query: ProjectQuery = useMemo(
    () => ({ search, status: statusFilter, sortField, sortDirection }),
    [search, statusFilter, sortField, sortDirection],
  );
  const { projects, loading, reload } = useProjects(query);
  const hasActiveFilters = Boolean(search.trim()) || statusFilter !== 'all';

  function resetFilters() {
    setSearch('');
    setStatusFilter('all');
  }

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);

  function openCreateDialog() {
    setEditingId(null);
    setName('');
    setDescription('');
    setError(null);
    setDialogOpen(true);
  }

  function openEditDialog(row: Project) {
    setEditingId(row.id);
    setName(row.name);
    setDescription(row.description ?? '');
    setError(null);
    setDialogOpen(true);
  }

  async function handleSave() {
    setError(null);
    try {
      if (editingId) {
        await projectService.update(editingId, { name, description });
      } else {
        await projectService.create({ name, description });
      }
      setDialogOpen(false);
      await reload();
      toast.current?.show({ severity: 'success', summary: editingId ? 'Project diperbarui' : 'Project dibuat' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan project');
    }
  }

  async function handleChangeStatus(row: Project, status: ProjectStatus) {
    if (status === 'archived') {
      await projectService.archive(row.id);
    } else if (status === 'active' && row.status === 'archived') {
      await projectService.restore(row.id);
    } else {
      await projectService.changeStatus(row.id, status);
    }
    await reload();
    toast.current?.show({ severity: 'success', summary: 'Status diperbarui', detail: row.name });
  }

  function handleDeletePermanently(row: Project) {
    confirmDialog({
      header: 'Hapus Permanen',
      message: (
        <span>
          Project <strong>"{row.name}"</strong> beserta seluruh test plan dan test case di dalamnya akan{' '}
          <strong>dihapus permanen dan tidak bisa dikembalikan</strong>. Lanjutkan?
        </span>
      ),
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Hapus Permanen',
      rejectLabel: 'Batal',
      acceptClassName: 'p-button-danger',
      accept: async () => {
        await projectService.deletePermanently(row.id);
        await reload();
        toast.current?.show({ severity: 'success', summary: 'Project dihapus permanen', detail: row.name });
      },
    });
  }

  function onSort(e: DataTableSortEvent) {
    setSortField((e.sortField as ProjectSortField) ?? 'name');
    setSortDirection(e.sortOrder === 1 ? 'asc' : 'desc');
  }

  function openRowMenu(row: Project, event: React.MouseEvent) {
    setMenuRow(row);
    menuRef.current?.toggle(event);
  }

  const menuItems = menuRow
    ? [
      { label: 'Lihat Detail', icon: 'pi pi-eye', command: () => navigate(`/projects/${menuRow.id}`) },
      { label: 'Edit', icon: 'pi pi-pencil', command: () => openEditDialog(menuRow) },
      { separator: true },
      ...(menuRow.status !== 'active'
        ? [{ label: 'Jadikan Aktif', icon: 'pi pi-play', command: () => handleChangeStatus(menuRow, 'active') }]
        : []),
      ...(menuRow.status !== 'inactive'
        ? [{ label: 'Jadikan Nonaktif', icon: 'pi pi-pause', command: () => handleChangeStatus(menuRow, 'inactive') }]
        : []),
      ...(menuRow.status !== 'archived'
        ? [{ label: 'Arsipkan', icon: 'pi pi-inbox', command: () => handleChangeStatus(menuRow, 'archived') }]
        : []),
      { separator: true },
      { label: 'Hapus Permanen', icon: 'pi pi-trash', command: () => handleDeletePermanently(menuRow) },
    ]
    : [];

  return (
    <div>
      <Toast ref={toast} />
      <ConfirmDialog />
      <Menu model={menuItems} popup ref={menuRef} />

      <Breadcrumb items={[{ label: 'Projects' }]} />

      <PageHeader title="Projects" actions={<Button label="Project Baru" icon="pi pi-plus" size="small" onClick={openCreateDialog} />} />

      <FilterToolbar defaultVisible>
        <div className="col-12 md:col-2 p-1"><Dropdown value={statusFilter} options={STATUS_OPTIONS} onChange={(e) => setStatusFilter(e.value)} className="w-full" /></div>
        <div className="col-12 md:col p-1"><div className="flex gap-2"><SearchInput value={search} onChange={setSearch} placeholder="Cari project..." className="flex-1" /><Button icon="pi pi-refresh" outlined severity="secondary" disabled={!hasActiveFilters} onClick={resetFilters} tooltip="Reset filter" /></div></div>
      </FilterToolbar>

      <DataTable
        value={projects}
        loading={loading}
        {...dataTablePaginatorProps}
        rows={10}
        rowsPerPageOptions={[5, 10, 25, 50]}
        size="small"
        emptyMessage="Belum ada project"
        sortField={sortField}
        sortOrder={sortDirection === 'asc' ? 1 : -1}
        onSort={onSort}
        onRowClick={(e) => navigate(`/projects/${(e.data as Project).id}`)}
        rowHover
        className="cursor-pointer"
      >
        {isMobile && <Column body={(row: Project) => (
          <div className="flex flex-column gap-2 py-1">
            <span className="font-bold">{row.name}</span>
            <span className="text-sm text-color-secondary">{row.description || 'Tidak ada deskripsi'}</span>
            <span><Tag value={PROJECT_STATUS_LABEL[row.status]} severity={PROJECT_STATUS_SEVERITY[row.status]} /></span>
            <span className="text-sm text-color-secondary">Dibuat {formatDate(row.createdAt)}</span>
          </div>
        )} />}
        {!isMobile && <Column field="name" header="Nama" sortable />}
        {!isMobile && <Column field="description" header="Deskripsi" />}
        {!isMobile && <Column
          field="status"
          header="Status"
          body={(row: Project) => <Tag value={PROJECT_STATUS_LABEL[row.status]} severity={PROJECT_STATUS_SEVERITY[row.status]} />}
        />}
        {!isMobile && <Column field="createdAt" header="Dibuat" body={(row: Project) => formatDate(row.createdAt)} sortable />}
        <Column
          header=""
          style={{ width: '4rem' }}
          body={(row: Project) => (
            <Button
              icon="pi pi-ellipsis-v"
              text
              rounded
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                openRowMenu(row, e);
              }}
            />
          )}
        />
      </DataTable>

      <Dialog header={editingId ? 'Edit Project' : 'Project Baru'} visible={dialogOpen} onHide={() => setDialogOpen(false)} style={{ width: '30rem' }}>
        <div className="flex flex-column gap-3">
          {error && <small className="p-error">{error}</small>}
          <div className="flex flex-column gap-1">
            <label htmlFor="name">Nama</label>
            <InputText id="name" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          </div>
          <div className="flex flex-column gap-1">
            <label htmlFor="description">Deskripsi</label>
            <InputTextarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          </div>
          <Button label="Simpan" size="small" onClick={handleSave} />
        </div>
      </Dialog>
    </div>
  );
}
