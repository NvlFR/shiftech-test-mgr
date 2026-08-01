import { useMemo, useState } from 'react';
import { Button } from 'primereact/button';
import { DataTable, type DataTableStateEvent } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Dropdown } from 'primereact/dropdown';
import { InputText } from 'primereact/inputtext';
import { Tag } from 'primereact/tag';
import { IconField } from 'primereact/iconfield';
import { InputIcon } from 'primereact/inputicon';
import { RowActionsMenu } from '../../components/ui/RowActionsMenu';
import { BulkActionsBar } from '../../components/ui/BulkActionsBar';
import type { Project, TestCase, TestCasePriority, TestCaseStatus, TestCaseWithDetails } from '../../types/domain';
import { exportTestCasesToExcel } from '../../helpers/excelExporter';
import { exportTestCasesToPdf } from '../../helpers/pdfExporter';
import { TEST_CASE_PRIORITY_LABEL, TEST_CASE_PRIORITY_SEVERITY, TEST_CASE_STATUS_LABEL, TEST_CASE_STATUS_SEVERITY } from '../../helpers/statusLabels';

type Option = { label: string; value: string };

type ProjectTestCaseTabProps = {
  project: Project;
  cases: TestCaseWithDetails[];
  loading?: boolean;
  canEditContent: boolean;
  canDeleteContent: boolean;
  moduleOptions: Option[];
  tagOptions: Option[];
  onCreate: () => void;
  onEdit: (row: TestCaseWithDetails) => void;
  onArchive: (row: TestCase) => void;
  onDelete: (row: TestCase) => void;
  onBulkDelete: (rows: TestCaseWithDetails[]) => void;
  onImportExcel: () => void;
  onImportLibrary: () => void;
  onRowClick: (row: TestCaseWithDetails) => void;
};

const PRIORITY_OPTIONS: { label: string; value: TestCasePriority }[] = (['low', 'medium', 'high', 'critical'] as const)
  .map((value) => ({ value, label: TEST_CASE_PRIORITY_LABEL[value] }));
const STATUS_OPTIONS: { label: string; value: TestCaseStatus }[] = (['draft', 'active', 'archived'] as const)
  .map((value) => ({ value, label: TEST_CASE_STATUS_LABEL[value] }));

export function ProjectTestCaseTab({
  project, cases, loading, canEditContent, canDeleteContent, moduleOptions, tagOptions,
  onCreate, onEdit, onArchive, onDelete, onBulkDelete, onImportExcel, onImportLibrary, onRowClick,
}: ProjectTestCaseTabProps) {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<TestCaseStatus | null>(null);
  const [priority, setPriority] = useState<TestCasePriority | null>(null);
  const [moduleId, setModuleId] = useState<string | null>(null);
  const [tagId, setTagId] = useState<string | null>(null);
  const [selected, setSelected] = useState<TestCaseWithDetails[]>([]);
  const [sortField, setSortField] = useState('code');
  const [sortOrder, setSortOrder] = useState<1 | -1>(1);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return cases.filter((row) => {
      if (status && row.status !== status) return false;
      if (priority && row.priority !== priority) return false;
      if (moduleId && row.moduleId !== moduleId) return false;
      if (tagId && !row.tags.some((tag) => tag.id === tagId)) return false;
      return !query || row.code.toLowerCase().includes(query) || row.title.toLowerCase().includes(query);
    });
  }, [cases, search, status, priority, moduleId, tagId]);

  const clearFilters = () => { setSearch(''); setStatus(null); setPriority(null); setModuleId(null); setTagId(null); };
  const hasFilters = Boolean(search || status || priority || moduleId || tagId);

  return (
    <div className="flex flex-column gap-2">
      <div className="flex justify-content-between align-items-center flex-wrap gap-2">
        <div className="flex align-items-center gap-2 flex-wrap">
          <IconField iconPosition="left"><InputIcon className="pi pi-search" /><InputText value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari judul/kode..." /></IconField>
          <Dropdown value={status} options={STATUS_OPTIONS} onChange={(e) => setStatus(e.value)} placeholder="Semua Status" showClear className="w-10rem" />
          <Dropdown value={priority} options={PRIORITY_OPTIONS} onChange={(e) => setPriority(e.value)} placeholder="Semua Prioritas" showClear className="w-10rem" />
          <Dropdown value={moduleId} options={moduleOptions} onChange={(e) => setModuleId(e.value)} placeholder="Semua Module" showClear className="w-10rem" />
          <Dropdown value={tagId} options={tagOptions} onChange={(e) => setTagId(e.value)} placeholder="Semua Tag" showClear className="w-10rem" />
          <Button icon="pi pi-refresh" outlined severity="secondary" size="small" disabled={!hasFilters} onClick={clearFilters} tooltip="Reset filter" />
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button label="Export Excel" icon="pi pi-download" size="small" outlined onClick={() => exportTestCasesToExcel(project, filtered)} disabled={!filtered.length} />
          <Button label="Export PDF" icon="pi pi-file-pdf" size="small" outlined onClick={() => exportTestCasesToPdf(project, filtered)} disabled={!filtered.length} />
          {canEditContent && <>
            <Button label="Import Library" icon="pi pi-folder-open" size="small" outlined onClick={onImportLibrary} />
            <Button label="Import Excel" icon="pi pi-file-excel" size="small" outlined onClick={onImportExcel} />
            <Button label="Test Case Baru" icon="pi pi-plus" size="small" onClick={onCreate} />
          </>}
        </div>
      </div>
      {canDeleteContent && <BulkActionsBar selectedCount={selected.length} onClear={() => setSelected([])} actions={<Button label="Hapus Terpilih" icon="pi pi-trash" size="small" severity="danger" outlined onClick={() => onBulkDelete(selected)} />} />}
      <DataTable
        value={filtered} loading={loading} size="small" paginator rows={10} rowsPerPageOptions={[5, 10, 25, 50]}
        dataKey="id" rowHover sortField={sortField} sortOrder={sortOrder}
        onSort={(event: DataTableStateEvent) => { setSortField(event.sortField ?? 'code'); setSortOrder((event.sortOrder ?? 1) as 1 | -1); }}
        selection={selected} onSelectionChange={(event) => setSelected(event.value as TestCaseWithDetails[])} selectionMode="checkbox"
        onRowClick={(event) => onRowClick(event.data as TestCaseWithDetails)} emptyMessage="Belum ada test case"
      >
        <Column selectionMode="multiple" style={{ width: '3rem' }} />
        <Column field="code" header="Kode" sortable style={{ width: '7rem' }} />
        <Column field="title" header="Judul" sortable />
        <Column field="module.name" header="Module" sortable body={(row: TestCaseWithDetails) => row.module?.name ?? '-'} />
        <Column field="targetRole.name" header="Role" sortable body={(row: TestCaseWithDetails) => row.targetRole ? <Tag value={row.targetRole.name} severity="secondary" /> : '-'} />
        <Column field="priority" header="Prioritas" sortable body={(row: TestCaseWithDetails) => <Tag value={TEST_CASE_PRIORITY_LABEL[row.priority]} severity={TEST_CASE_PRIORITY_SEVERITY[row.priority]} />} />
        <Column field="status" header="Status" sortable body={(row: TestCaseWithDetails) => <Tag value={TEST_CASE_STATUS_LABEL[row.status]} severity={TEST_CASE_STATUS_SEVERITY[row.status]} />} />
        <Column field="tags" header="Tag" body={(row: TestCaseWithDetails) => <div className="flex flex-wrap gap-1">{row.tags.map((tag) => <Tag key={tag.id} value={tag.name} severity="info" />)}</div>} />
        <Column header="" style={{ width: '3.5rem' }} body={(row: TestCaseWithDetails) => <RowActionsMenu items={[
          ...(canEditContent ? [{ label: 'Edit', icon: 'pi pi-pencil', command: () => onEdit(row) }, { label: row.status === 'active' ? 'Arsipkan' : 'Aktifkan', icon: 'pi pi-refresh', command: () => onArchive(row) }] : []),
          ...(canDeleteContent ? [{ label: 'Hapus', icon: 'pi pi-trash', className: 'p-error', command: () => onDelete(row) }] : []),
        ]} />} />
      </DataTable>
    </div>
  );
}

export default ProjectTestCaseTab;
