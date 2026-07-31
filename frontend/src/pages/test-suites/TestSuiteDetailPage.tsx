import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from 'primereact/button';
import { Card } from 'primereact/card';
import { Column } from 'primereact/column';
import { DataTable } from 'primereact/datatable';
import { Dialog } from 'primereact/dialog';
import { Dropdown } from 'primereact/dropdown';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { MultiSelect } from 'primereact/multiselect';
import { SelectButton } from 'primereact/selectbutton';
import { Tag } from 'primereact/tag';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { Toast } from 'primereact/toast';
import { useRef } from 'react';
import { Breadcrumb } from '../../components/ui/Breadcrumb';
import { FilterToolbar } from '../../components/ui/FilterToolbar';
import { SearchInput } from '../../components/ui/SearchInput';
import { RowActionsMenu } from '../../components/ui/RowActionsMenu';
import { TestSuiteDialog } from '../../components/dialogs/TestSuiteDialog';
import { testSuiteService } from '../../services/testSuiteService';
import { TEST_CASE_PRIORITY_LABEL, TEST_CASE_PRIORITY_SEVERITY } from '../../helpers/statusLabels';
import type { TestCasePriority, TestCaseStepType, TestSuite, TestSuiteItem } from '../../types/domain';

const PRIORITIES: { label: string; value: TestCasePriority }[] = (['low', 'medium', 'high', 'critical'] as const).map((value) => ({ label: TEST_CASE_PRIORITY_LABEL[value], value }));

type ItemForm = {
  moduleName: string; title: string; objective: string; preconditions: string; steps: string;
  expectedResult: string; priority: TestCasePriority; targetRole: string; tagNames: string;
  stepType: TestCaseStepType; detailedSteps: { action: string; expectedResult: string }[];
};

const EMPTY_FORM: ItemForm = { moduleName: '', title: '', objective: '', preconditions: '', steps: '', expectedResult: '', priority: 'medium', targetRole: '', tagNames: '', stepType: 'simple', detailedSteps: [] };

export function TestSuiteDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useRef<Toast>(null);
  const [suite, setSuite] = useState<TestSuite | null>(null);
  const [items, setItems] = useState<TestSuiteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState(false);
  const [search, setSearch] = useState('');
  const [moduleFilter, setModuleFilter] = useState<string[]>([]);
  const [priorityFilter, setPriorityFilter] = useState<TestCasePriority[]>([]);
  const [stepTypeFilter, setStepTypeFilter] = useState<TestCaseStepType[]>([]);
  const [selected, setSelected] = useState<TestSuiteItem[]>([]);
  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [itemMode, setItemMode] = useState<'create' | 'edit' | 'duplicate'>('create');
  const [editingItem, setEditingItem] = useState<TestSuiteItem | null>(null);
  const [form, setForm] = useState<ItemForm>(EMPTY_FORM);
  const [suiteDialogOpen, setSuiteDialogOpen] = useState(false);

  async function reload() {
    if (!id) return;
    setLoading(true);
    try {
      const [nextSuite, nextItems] = await Promise.all([testSuiteService.getById(id), testSuiteService.listItems(id)]);
      setSuite(nextSuite);
      setItems(nextItems);
    } catch (err) {
      toast.current?.show({ severity: 'error', summary: 'Gagal memuat suite', detail: err instanceof Error ? err.message : undefined });
    } finally { setLoading(false); }
  }
  useEffect(() => { void reload(); }, [id]);

  const moduleOptions = useMemo(() => [...new Set(items.map((item) => item.moduleName).filter((value): value is string => Boolean(value)))].sort().map((value) => ({ label: value, value })), [items]);
  const filteredItems = useMemo(() => items.filter((item) => {
    const query = search.trim().toLowerCase();
    return (!query || `${item.title} ${item.moduleName ?? ''} ${item.targetRole ?? ''}`.toLowerCase().includes(query))
      && (!moduleFilter.length || (item.moduleName ? moduleFilter.includes(item.moduleName) : false))
      && (!priorityFilter.length || priorityFilter.includes(item.priority))
      && (!stepTypeFilter.length || stepTypeFilter.includes(item.stepType));
  }), [items, moduleFilter, priorityFilter, stepTypeFilter, search]);

  function openItem(mode: 'create' | 'edit' | 'duplicate', item?: TestSuiteItem) {
    setItemMode(mode);
    setEditingItem(item ?? null);
    setForm(item ? { moduleName: item.moduleName ?? '', title: mode === 'duplicate' ? `${item.title} (Copy)` : item.title, objective: item.objective ?? '', preconditions: item.preconditions ?? '', steps: item.steps, expectedResult: item.expectedResult, priority: item.priority, targetRole: item.targetRole ?? '', tagNames: item.tagNames.join(', '), stepType: item.stepType, detailedSteps: [] } : EMPTY_FORM);
    if (item?.stepType === 'detailed') void testSuiteService.getItemWithSteps(item).then((value) => setForm((current) => ({ ...current, detailedSteps: value.detailedSteps.map((step) => ({ action: step.action, expectedResult: step.expectedResult ?? '' })) })));
    setItemDialogOpen(true);
  }

  async function saveItem() {
    if (!id) return;
    const tagNames = form.tagNames.split(',').map((tag) => tag.trim()).filter(Boolean);
    try {
      if (itemMode === 'edit' && editingItem) {
        await testSuiteService.updateItem(editingItem.id, { ...form, moduleName: form.moduleName.trim() || null, objective: form.objective.trim() || null, preconditions: form.preconditions.trim() || null, targetRole: form.targetRole.trim() || null, tagNames }, form.stepType === 'detailed' ? form.detailedSteps : undefined);
      } else {
        await testSuiteService.addItem({ suiteId: id, ...form, moduleName: form.moduleName.trim() || undefined, objective: form.objective.trim() || undefined, preconditions: form.preconditions.trim() || undefined, targetRole: form.targetRole.trim() || undefined, tagNames, orderIndex: items.length, detailedSteps: form.stepType === 'detailed' ? form.detailedSteps : undefined });
      }
      setItemDialogOpen(false);
      await reload();
      toast.current?.show({ severity: 'success', summary: itemMode === 'edit' ? 'Item diperbarui' : itemMode === 'duplicate' ? 'Item diduplikasi' : 'Item ditambahkan' });
    } catch (err) { toast.current?.show({ severity: 'error', summary: 'Gagal menyimpan item', detail: err instanceof Error ? err.message : undefined }); }
  }

  function deleteItem(item: TestSuiteItem) {
    confirmDialog({ header: 'Hapus item', message: `Item "${item.title}" akan dihapus. Lanjutkan?`, acceptLabel: 'Hapus', rejectLabel: 'Batal', acceptClassName: 'p-button-danger', accept: async () => { await testSuiteService.removeItem(item.id); await reload(); } });
  }

  function deleteSelected() {
    confirmDialog({ header: 'Hapus item terpilih', message: `${selected.length} item akan dihapus. Lanjutkan?`, acceptLabel: 'Hapus', rejectLabel: 'Batal', acceptClassName: 'p-button-danger', accept: async () => { await testSuiteService.removeItemsMany(selected.map((item) => item.id)); setSelected([]); await reload(); } });
  }

  if (!loading && !suite) return <p>Test suite tidak ditemukan.</p>;
  const setField = <K extends keyof ItemForm>(key: K, value: ItemForm[K]) => setForm((current) => ({ ...current, [key]: value }));

  return <div>
    <Toast ref={toast} />
    <ConfirmDialog />
    <Breadcrumb items={[{ label: 'Test Suite', path: '/test-suites' }, { label: suite?.name ?? 'Memuat...' }]} />
    <Card className="mb-3">
      <div className="flex align-items-center justify-content-between gap-2"><div className="flex align-items-center gap-2"><Button icon="pi pi-arrow-left" text rounded onClick={() => navigate('/test-suites')} /><h2 className="m-0">{suite?.name ?? 'Test Suite'}</h2>{suite && <Tag value={suite.visibility} severity={suite.visibility === 'public' ? 'success' : suite.visibility === 'unlisted' ? 'warning' : 'info'} />}</div><div className="flex gap-1"><Button icon="pi pi-pencil" text rounded onClick={() => setSuiteDialogOpen(true)} disabled={!suite} /><Button icon={collapsed ? 'pi pi-chevron-down' : 'pi pi-chevron-up'} text rounded onClick={() => setCollapsed(!collapsed)} /></div></div>
      {!collapsed && <p className="text-color-secondary mb-0 mt-2">{suite?.description || 'Tidak ada deskripsi.'}</p>}
    </Card>
    <FilterToolbar primaryAction={<Button label="Item Baru" icon="pi pi-plus" size="small" onClick={() => openItem('create')} />}>
      <div className="col-12 md:col-3"><SearchInput value={search} onChange={setSearch} placeholder="Cari title/module..." className="w-full" /></div>
      <div className="col-12 md:col-3"><MultiSelect value={moduleFilter} options={moduleOptions} onChange={(e) => setModuleFilter(e.value)} placeholder="Semua module" className="w-full" /></div>
      <div className="col-12 md:col-3"><MultiSelect value={priorityFilter} options={PRIORITIES} onChange={(e) => setPriorityFilter(e.value)} placeholder="Semua prioritas" className="w-full" /></div>
      <div className="col-12 md:col-3"><MultiSelect value={stepTypeFilter} options={[{ label: 'Simple', value: 'simple' }, { label: 'Detailed', value: 'detailed' }]} onChange={(e) => setStepTypeFilter(e.value)} placeholder="Semua mode" className="w-full" /></div>
    </FilterToolbar>
    {selected.length > 0 && <div className="flex align-items-center gap-2 mb-2"><span>{selected.length} item dipilih</span><Button label="Hapus terpilih" icon="pi pi-trash" severity="danger" outlined size="small" onClick={deleteSelected} /><Button label="Batal" text size="small" onClick={() => setSelected([])} /></div>}
    <Card title={`Test Cases (${filteredItems.length})`}><DataTable value={filteredItems} loading={loading} dataKey="id" selection={selected} onSelectionChange={(e) => setSelected(e.value)} selectionMode="checkbox" emptyMessage="Belum ada test case di suite ini." paginator rows={10} size="small">
      <Column selectionMode="multiple" style={{ width: '3rem' }} /><Column field="orderIndex" header="#" /><Column field="title" header="Judul" sortable /><Column field="moduleName" header="Module" body={(row: TestSuiteItem) => row.moduleName || '-'} /><Column field="priority" header="Prioritas" body={(row: TestSuiteItem) => <Tag value={TEST_CASE_PRIORITY_LABEL[row.priority]} severity={TEST_CASE_PRIORITY_SEVERITY[row.priority]} />} /><Column field="stepType" header="Mode" body={(row: TestSuiteItem) => row.stepType === 'detailed' ? 'Detailed' : 'Simple'} /><Column header="" style={{ width: '3.5rem' }} body={(row: TestSuiteItem) => <RowActionsMenu items={[{ label: 'Edit', icon: 'pi pi-pencil', command: () => openItem('edit', row) }, { label: 'Duplikasi', icon: 'pi pi-copy', command: () => openItem('duplicate', row) }, { label: 'Hapus', icon: 'pi pi-trash', className: 'p-error', command: () => deleteItem(row) }]} />} />
    </DataTable></Card>
    <TestSuiteDialog visible={suiteDialogOpen} mode="edit" initialData={suite ? { name: suite.name, description: suite.description, visibility: suite.visibility } : undefined} onHide={() => setSuiteDialogOpen(false)} onSave={async (data) => { if (!id) return; await testSuiteService.update(id, data); setSuiteDialogOpen(false); await reload(); }} />
    <Dialog header={itemMode === 'edit' ? 'Edit Item' : itemMode === 'duplicate' ? 'Duplikasi Item' : 'Item Baru'} visible={itemDialogOpen} onHide={() => setItemDialogOpen(false)} style={{ width: '42rem' }} footer={<><Button label="Batal" text onClick={() => setItemDialogOpen(false)} /><Button label="Simpan" onClick={saveItem} /></>}>
      <div className="flex flex-column gap-3"><div className="grid"><div className="col-12 md:col-6"><InputText value={form.title} onChange={(e) => setField('title', e.target.value)} placeholder="Judul *" className="w-full" autoFocus /></div><div className="col-12 md:col-3"><Dropdown value={form.priority} options={PRIORITIES} onChange={(e) => setField('priority', e.value)} className="w-full" /></div><div className="col-12 md:col-3"><InputText value={form.moduleName} onChange={(e) => setField('moduleName', e.target.value)} placeholder="Module" className="w-full" /></div></div><InputText value={form.objective} onChange={(e) => setField('objective', e.target.value)} placeholder="Objective (opsional)" /><InputTextarea value={form.preconditions} onChange={(e) => setField('preconditions', e.target.value)} placeholder="Prerequisites (opsional)" rows={2} /><SelectButton value={form.stepType} options={[{ label: 'Simple', value: 'simple' }, { label: 'Detailed', value: 'detailed' }]} onChange={(e) => e.value && setField('stepType', e.value)} />{form.stepType === 'simple' ? <><InputTextarea value={form.steps} onChange={(e) => setField('steps', e.target.value)} placeholder="Test steps *" rows={3} /><InputTextarea value={form.expectedResult} onChange={(e) => setField('expectedResult', e.target.value)} placeholder="Expected result *" rows={3} /></> : <div className="flex flex-column gap-2"><span className="text-sm text-color-secondary">Detailed steps</span>{form.detailedSteps.map((step, index) => <div className="flex gap-2" key={index}><InputText value={step.action} onChange={(e) => setField('detailedSteps', form.detailedSteps.map((current, i) => i === index ? { ...current, action: e.target.value } : current))} placeholder="Action" className="flex-1" /><InputText value={step.expectedResult} onChange={(e) => setField('detailedSteps', form.detailedSteps.map((current, i) => i === index ? { ...current, expectedResult: e.target.value } : current))} placeholder="Expected result" className="flex-1" /><Button icon="pi pi-times" text onClick={() => setField('detailedSteps', form.detailedSteps.filter((_, i) => i !== index))} /></div>)}<Button label="Tambah step" icon="pi pi-plus" text onClick={() => setField('detailedSteps', [...form.detailedSteps, { action: '', expectedResult: '' }])} /></div>}<InputText value={form.targetRole} onChange={(e) => setField('targetRole', e.target.value)} placeholder="Role target (opsional)" /><InputText value={form.tagNames} onChange={(e) => setField('tagNames', e.target.value)} placeholder="Tags, pisahkan dengan koma" /></div>
    </Dialog>
  </div>;
}
