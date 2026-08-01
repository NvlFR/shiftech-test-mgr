import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Tag as PrimeTag } from 'primereact/tag';
import { Dropdown } from 'primereact/dropdown';
import { MultiSelect } from 'primereact/multiselect';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { testCaseService } from '../../services/testCaseService';
import { moduleService } from '../../services/moduleService';
import { tagService } from '../../services/tagService';
import { profileService } from '../../services/profileService';
import type { Module, Profile, Tag, TestCasePriority, TestCaseStatus, TestCaseWithDetails } from '../../types/domain';
import { useProjectContext } from '../../hooks/useProjectContext';
import { PageHeader } from '../../components/ui/PageHeader';
import { TEST_CASE_PRIORITY_LABEL, TEST_CASE_PRIORITY_SEVERITY, TEST_CASE_STATUS_LABEL, TEST_CASE_STATUS_SEVERITY } from '../../helpers/statusLabels';
import { AiTestCaseGeneratorDialog } from '../../components/ai/AiTestCaseGeneratorDialog';
import { AiAssistantPanel } from '../../components/ai/AiAssistantPanel';
import { SearchInput } from '../../components/ui/SearchInput';
import { FilterToolbar } from '../../components/ui/FilterToolbar';
import { useScreenSize } from '../../hooks/useScreenSize';
import { dataTablePaginatorProps } from '../../components/ui/dataTablePaginator';

const priorities: { label: string; value: TestCasePriority }[] = (['low', 'medium', 'high', 'critical'] as const).map((value) => ({ label: TEST_CASE_PRIORITY_LABEL[value], value }));
const statuses: { label: string; value: TestCaseStatus }[] = (['draft', 'active', 'archived'] as const).map((value) => ({ label: TEST_CASE_STATUS_LABEL[value], value }));

export function TestCasesPage() {
  const navigate = useNavigate();
  const { lt } = useScreenSize();
  const isMobile = lt.sm;
  const { projects, projectId, setProjectId } = useProjectContext();
  const [testCases, setTestCases] = useState<TestCaseWithDetails[]>([]);
  const [selected, setSelected] = useState<TestCaseWithDetails[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<{ moduleId: string | null; tagId: string | null; priority: TestCasePriority | null; status: TestCaseStatus | null; assignedTo: string | null }>({ moduleId: null, tagId: null, priority: null, status: null, assignedTo: null });
  const [search, setSearch] = useState('');
  const [bulkOpen, setBulkOpen] = useState(false);
  const [aiDialogOpen, setAiDialogOpen] = useState(false);
  const [bulk, setBulk] = useState<{ priority: TestCasePriority | null; status: TestCaseStatus | null; moduleId: string | null; assignedTo: string | null; tagNames: string[] | null }>({ priority: null, status: null, moduleId: null, assignedTo: null, tagNames: null });

  const reload = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try { setTestCases(await testCaseService.listFiltered(projectId, filter)); }
    finally { setLoading(false); }
  }, [projectId, filter]);
  useEffect(() => { setSelected([]); if (projectId) { void reload(); Promise.all([moduleService.listByProject(projectId), tagService.listByProject(projectId), profileService.listAll()]).then(([m, t, p]) => { setModules(m); setTags(t); setProfiles(p); }); } else setTestCases([]); }, [projectId, reload]);

  const visibleTestCases = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return testCases;
    return testCases.filter((testCase) => testCase.code.toLowerCase().includes(query) || testCase.title.toLowerCase().includes(query));
  }, [search, testCases]);

  async function applyBulk() {
    const { tagNames, ...fieldChanges } = bulk;
    const changes = Object.fromEntries(Object.entries(fieldChanges).filter(([, value]) => value !== null));
    await testCaseService.bulkUpdate(selected.map((item) => item.id), projectId!, changes, tagNames ?? undefined);
    setBulkOpen(false); setSelected([]); await reload();
  }

  return <div>
    <PageHeader title="Test Cases" actions={<div className="flex gap-2"><Button label="Review Draf AI" icon="pi pi-verified" size="small" outlined onClick={() => navigate('/test-cases/ai-review')} /><Button label="Generate dengan AI" icon="pi pi-sparkles" size="small" outlined disabled={!projectId} onClick={() => setAiDialogOpen(true)} /><Button label={`Bulk update (${selected.length})`} icon="pi pi-pencil" size="small" disabled={!selected.length} onClick={() => setBulkOpen(true)} /><Dropdown value={projectId} options={projects.map((p) => ({ label: p.name, value: p.id }))} onChange={(e) => setProjectId(e.value)} placeholder="Pilih project" className="w-15rem" showClear /></div>} />
    {!projectId && <p className="text-color-secondary">Pilih project untuk melihat test case.</p>}
    {projectId && <AiAssistantPanel />}
    {projectId && <FilterToolbar>
      <SearchInput value={search} onChange={setSearch} placeholder="Cari kode atau judul test case..." className="col-12 md:col-6 lg:col-4" />
      <Dropdown value={filter.moduleId} options={modules.map((m) => ({ label: m.name, value: m.id }))} onChange={(e) => setFilter({ ...filter, moduleId: e.value })} placeholder="Semua module" showClear className="col-12 md:col-3 lg:col-2" />
      <Dropdown value={filter.tagId} options={tags.map((t) => ({ label: t.name, value: t.id }))} onChange={(e) => setFilter({ ...filter, tagId: e.value })} placeholder="Semua tag" showClear className="col-12 md:col-3 lg:col-2" />
      <Dropdown value={filter.priority} options={priorities} onChange={(e) => setFilter({ ...filter, priority: e.value })} placeholder="Semua prioritas" showClear className="col-12 md:col-3 lg:col-2" />
      <Dropdown value={filter.status} options={statuses} onChange={(e) => setFilter({ ...filter, status: e.value })} placeholder="Semua status" showClear className="col-12 md:col-3 lg:col-2" />
      <Dropdown value={filter.assignedTo} options={profiles.map((p) => ({ label: p.fullName ?? p.email, value: p.id }))} onChange={(e) => setFilter({ ...filter, assignedTo: e.value })} placeholder="Semua assignee" showClear className="col-12 md:col-3 lg:col-2" />
      <Button label="Reset" text onClick={() => { setSearch(''); setFilter({ moduleId: null, tagId: null, priority: null, status: null, assignedTo: null }); }} />
    </FilterToolbar>}
    <DataTable value={visibleTestCases} loading={loading} {...dataTablePaginatorProps} rows={10} rowsPerPageOptions={[5, 10, 25, 50]} selection={selected} selectionMode="multiple" onSelectionChange={(e) => setSelected(e.value as TestCaseWithDetails[])} dataKey="id" emptyMessage="Belum ada test case" size="small" rowHover>
      <Column selectionMode="multiple" headerStyle={{ width: '3rem' }} />
      {isMobile && <Column body={(row: TestCaseWithDetails) => <div className="flex flex-column gap-2 py-1"><span className="font-bold">{row.code}</span><span>{row.title}</span><span className="text-sm text-color-secondary">{row.module?.name ?? '-'}</span><div className="flex gap-2"><PrimeTag value={TEST_CASE_PRIORITY_LABEL[row.priority]} severity={TEST_CASE_PRIORITY_SEVERITY[row.priority]} /><PrimeTag value={TEST_CASE_STATUS_LABEL[row.status]} severity={TEST_CASE_STATUS_SEVERITY[row.status]} /></div></div>} />}
      {!isMobile && <Column field="code" header="Kode" sortable style={{ width: '7rem' }} />}
      {!isMobile && <Column field="title" header="Judul" sortable />}
      {!isMobile && <Column header="Module" body={(row: TestCaseWithDetails) => row.module?.name ?? '-'} sortable />}
      {!isMobile && <Column header="Assignee" body={(row: TestCaseWithDetails) => { const p = profiles.find((item) => item.id === row.assignedTo); return p?.fullName ?? p?.email ?? '-'; }} />}
      {!isMobile && <Column header="Prioritas" body={(row: TestCaseWithDetails) => <PrimeTag value={TEST_CASE_PRIORITY_LABEL[row.priority]} severity={TEST_CASE_PRIORITY_SEVERITY[row.priority]} />} sortable />}
      {!isMobile && <Column header="Status" body={(row: TestCaseWithDetails) => <PrimeTag value={TEST_CASE_STATUS_LABEL[row.status]} severity={TEST_CASE_STATUS_SEVERITY[row.status]} />} sortable />}
    </DataTable>
    <Dialog header="Bulk update Test Case" visible={bulkOpen} onHide={() => setBulkOpen(false)} style={{ width: '28rem' }}>
      <div className="flex flex-column gap-3"><small>Field yang dikosongkan tidak diubah.</small><Dropdown value={bulk.priority} options={priorities} onChange={(e) => setBulk({ ...bulk, priority: e.value })} placeholder="Prioritas" showClear /><Dropdown value={bulk.status} options={statuses} onChange={(e) => setBulk({ ...bulk, status: e.value })} placeholder="Status" showClear /><Dropdown value={bulk.moduleId} options={modules.map((m) => ({ label: m.name, value: m.id }))} onChange={(e) => setBulk({ ...bulk, moduleId: e.value })} placeholder="Module" showClear /><Dropdown value={bulk.assignedTo} options={profiles.map((p) => ({ label: p.fullName ?? p.email, value: p.id }))} onChange={(e) => setBulk({ ...bulk, assignedTo: e.value })} placeholder="Assignee" showClear /><MultiSelect value={bulk.tagNames} options={tags.map((t) => ({ label: t.name, value: t.name }))} onChange={(e) => setBulk({ ...bulk, tagNames: e.value })} placeholder="Tag" display="chip" filter showClear /><Button label="Terapkan" onClick={() => void applyBulk()} /></div>
    </Dialog>
    {projectId && <AiTestCaseGeneratorDialog visible={aiDialogOpen} projectId={projectId} modules={modules} tags={tags} existingTestCases={testCases} onHide={() => setAiDialogOpen(false)} onSaved={reload} />}
  </div>;
}
