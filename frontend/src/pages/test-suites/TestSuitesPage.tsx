import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from 'primereact/button';
import { Card } from 'primereact/card';
import { Column } from 'primereact/column';
import { DataTable } from 'primereact/datatable';
import { Dropdown } from 'primereact/dropdown';
import { Tag } from 'primereact/tag';
import { Toast } from 'primereact/toast';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { PageHeader } from '../../components/ui/PageHeader';
import { FilterToolbar } from '../../components/ui/FilterToolbar';
import { SearchInput } from '../../components/ui/SearchInput';
import { RowActionsMenu } from '../../components/ui/RowActionsMenu';
import { TestSuiteDialog } from '../../components/dialogs/TestSuiteDialog';
import { testSuiteService } from '../../services/testSuiteService';
import type { TestSuite, TestSuiteVisibility } from '../../types/domain';

const VISIBILITY_OPTIONS: { label: string; value: TestSuiteVisibility }[] = [
  { label: 'Private', value: 'private' },
  { label: 'Unlisted', value: 'unlisted' },
  { label: 'Public', value: 'public' },
];

export function TestSuitesPage() {
  const navigate = useNavigate();
  const toast = useRef<Toast>(null);
  const [suites, setSuites] = useState<TestSuite[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [visibility, setVisibility] = useState<TestSuiteVisibility | 'all'>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit' | 'duplicate'>('create');
  const [editing, setEditing] = useState<TestSuite | null>(null);

  async function reload() {
    setLoading(true);
    try {
      setSuites(await testSuiteService.list());
    } catch (err) {
      toast.current?.show({ severity: 'error', summary: 'Gagal memuat suite', detail: err instanceof Error ? err.message : undefined });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void reload(); }, []);

  const filteredSuites = useMemo(() => suites.filter((suite) => {
    const query = search.trim().toLowerCase();
    const matchesSearch = !query || `${suite.name} ${suite.description ?? ''}`.toLowerCase().includes(query);
    return matchesSearch && (visibility === 'all' || suite.visibility === visibility);
  }), [search, suites, visibility]);

  function openDialog(mode: 'create' | 'edit' | 'duplicate', suite?: TestSuite) {
    setDialogMode(mode);
    setEditing(suite ?? null);
    setDialogOpen(true);
  }

  async function saveSuite(data: { name: string; description: string; visibility: TestSuiteVisibility }) {
    if (dialogMode === 'edit' && editing) {
      await testSuiteService.update(editing.id, data);
      toast.current?.show({ severity: 'success', summary: 'Suite diperbarui' });
    } else if (dialogMode === 'duplicate' && editing) {
      const copy = await testSuiteService.create({ name: data.name, description: data.description, visibility: data.visibility });
      const items = await testSuiteService.listItems(editing.id);
      if (items.length) {
        const copiedItems = [];
        for (const [index, item] of items.entries()) {
          const detailedSteps = item.stepType === 'detailed'
            ? (await testSuiteService.getItemWithSteps(item)).detailedSteps.map((step) => ({ action: step.action, expectedResult: step.expectedResult ?? undefined }))
            : undefined;
          copiedItems.push({
          suiteId: copy.id,
          moduleName: item.moduleName ?? undefined,
          title: item.title,
          objective: item.objective ?? undefined,
          preconditions: item.preconditions ?? undefined,
          steps: item.steps,
          expectedResult: item.expectedResult,
          priority: item.priority,
          targetRole: item.targetRole ?? undefined,
          tagNames: item.tagNames,
          stepType: item.stepType,
          orderIndex: index,
          detailedSteps,
          });
        }
        await testSuiteService.addItemsMany(copiedItems);
      }
      toast.current?.show({ severity: 'success', summary: 'Suite diduplikasi' });
    } else {
      await testSuiteService.create(data);
      toast.current?.show({ severity: 'success', summary: 'Suite dibuat' });
    }
    setDialogOpen(false);
    await reload();
  }

  function removeSuite(suite: TestSuite) {
    confirmDialog({
      header: 'Hapus Test Suite',
      message: `Suite "${suite.name}" dan seluruh itemnya akan dihapus. Lanjutkan?`,
      acceptLabel: 'Hapus', rejectLabel: 'Batal', acceptClassName: 'p-button-danger',
      accept: async () => { await testSuiteService.remove(suite.id); await reload(); toast.current?.show({ severity: 'success', summary: 'Suite dihapus' }); },
    });
  }

  return <div>
    <Toast ref={toast} />
    <ConfirmDialog />
    <PageHeader title="Test Suite" actions={<Button label="Suite Baru" icon="pi pi-plus" size="small" onClick={() => openDialog('create')} />} />
    <Card>
      <p className="text-color-secondary mt-0">Reusable test case templates yang bisa digunakan kembali pada project dan test plan.</p>
      <FilterToolbar primaryAction={<Button label="Suite Baru" icon="pi pi-plus" size="small" onClick={() => openDialog('create')} />}>
        <div className="col-12 md:col-6"><SearchInput value={search} onChange={setSearch} placeholder="Cari suite..." className="w-full" /></div>
        <div className="col-12 md:col-3"><Dropdown value={visibility} options={[{ label: 'Semua visibilitas', value: 'all' }, ...VISIBILITY_OPTIONS]} onChange={(e) => setVisibility(e.value)} className="w-full" /></div>
      </FilterToolbar>
      <DataTable value={filteredSuites} loading={loading} dataKey="id" emptyMessage="Belum ada test suite." paginator rows={10} rowHover onRowClick={(e) => navigate(`/test-suites/${(e.data as TestSuite).id}`)} className="cursor-pointer">
        <Column field="name" header="Nama" sortable />
        <Column field="description" header="Deskripsi" body={(row: TestSuite) => row.description || '-'} />
        <Column header="Visibilitas" body={(row: TestSuite) => <Tag value={row.visibility} severity={row.visibility === 'public' ? 'success' : row.visibility === 'unlisted' ? 'warning' : 'info'} />} />
        <Column field="updatedAt" header="Diperbarui" body={(row: TestSuite) => new Date(row.updatedAt).toLocaleDateString('id-ID')} />
        <Column header="" style={{ width: '3.5rem' }} body={(row: TestSuite) => <RowActionsMenu items={[
          { label: 'Lihat detail', icon: 'pi pi-eye', command: () => navigate(`/test-suites/${row.id}`) },
          { label: 'Duplikasi', icon: 'pi pi-copy', command: () => openDialog('duplicate', row) },
          { label: 'Edit', icon: 'pi pi-pencil', command: () => openDialog('edit', row) },
          { label: 'Hapus', icon: 'pi pi-trash', className: 'p-error', command: () => removeSuite(row) },
        ]} />} />
      </DataTable>
    </Card>
    <TestSuiteDialog visible={dialogOpen} mode={dialogMode} initialData={editing ? { name: dialogMode === 'duplicate' ? `${editing.name} (Copy)` : editing.name, description: editing.description, visibility: editing.visibility } : undefined} onHide={() => setDialogOpen(false)} onSave={saveSuite} />
  </div>;
}
