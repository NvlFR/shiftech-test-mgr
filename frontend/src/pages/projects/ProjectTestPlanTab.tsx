import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from 'primereact/button';
import {
  DataTable,
  type DataTableSelectionMultipleChangeEvent,
  type DataTableStateEvent,
} from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Dropdown } from 'primereact/dropdown';
import { InputText } from 'primereact/inputtext';
import { MultiSelect } from 'primereact/multiselect';
import { Tag } from 'primereact/tag';
import { BulkActionsBar } from '../../components/ui/BulkActionsBar';
import type { TestPlan, TestPlanStatus } from '../../types/domain';
import { testPlanService } from '../../services/testPlanService';
import { formatDateTime } from '../../helpers/dateFormatter';
import { TEST_PLAN_STATUS_LABEL, TEST_PLAN_STATUS_SEVERITY } from '../../helpers/statusLabels';

type ProjectTestPlanTabProps = {
  plans: TestPlan[];
  loading: boolean;
  isMobile: boolean;
  search: string;
  onSearchChange: (value: string) => void;
  statusFilter: TestPlanStatus | null;
  onStatusFilterChange: (value: TestPlanStatus | null) => void;
  sortField: string;
  sortOrder: 1 | -1;
  onSort: (event: DataTableStateEvent) => void;
  selected: TestPlan[];
  onSelectedChange: (value: TestPlan[]) => void;
  canCreateContent: boolean;
  canUpdateContent: boolean;
  canDeleteContent: boolean;
  onCreate: () => void;
  onEdit: (plan: TestPlan) => void;
  onDelete: (plan: TestPlan) => void;
  onBulkDelete: () => void;
  onRefresh: () => Promise<void>;
};

const STATUS_OPTIONS = (['draft', 'active', 'completed', 'archived'] as const)
  .map((value) => ({ label: TEST_PLAN_STATUS_LABEL[value], value }));

export function ProjectTestPlanTab({
  plans, loading, isMobile, search, onSearchChange, statusFilter,
  onStatusFilterChange, sortField, sortOrder, onSort, selected, onSelectedChange,
  canCreateContent, canUpdateContent, canDeleteContent, onCreate, onEdit, onDelete, onBulkDelete, onRefresh,
}: ProjectTestPlanTabProps) {
  const navigate = useNavigate();
  const [editing, setEditing] = useState<{ id: string; field: 'name' | 'status' } | null>(null);
  const [editValue, setEditValue] = useState<string>('');

  async function commit(plan: TestPlan, field: 'name' | 'status', value: string) {
    setEditing(null);
    if (field === 'name') {
      const name = value.trim();
      if (!name || name === plan.name) return;
      await testPlanService.rename(plan.id, name);
    } else if (value !== plan.status) {
      if (value === 'active') await testPlanService.approve(plan.id, true);
      else await testPlanService.changeStatus(plan.id, value as TestPlanStatus);
    }
    await onRefresh();
  }

  const mobileBody = (plan: TestPlan) => (
    <div className="flex flex-column gap-1">
      <span className="font-medium">{plan.name}</span>
      <div className="flex gap-2 align-items-center flex-wrap text-sm">
        <span className="text-color-secondary">{plan.code}</span>
        <Tag value={TEST_PLAN_STATUS_LABEL[plan.status]} severity={TEST_PLAN_STATUS_SEVERITY[plan.status]} />
        <span className="text-color-secondary">{formatDateTime(plan.updatedAt)}</span>
      </div>
    </div>
  );

  return (
    <>
      <div className="flex justify-content-between align-items-center flex-wrap gap-2 mb-2">
        <div className="flex align-items-center gap-2 flex-wrap">
          <InputText value={search} onChange={(event) => onSearchChange(event.target.value)} placeholder="Cari nama/kode..." />
          <MultiSelect
            value={statusFilter ? [statusFilter] : []}
            options={STATUS_OPTIONS}
            onChange={(event) => onStatusFilterChange(event.value?.[0] ?? null)}
            placeholder="Semua status"
            showClear
            className="w-12rem"
          />
        </div>
        {canCreateContent && <Button label="Test Plan Baru" icon="pi pi-plus" size="small" onClick={onCreate} />}
      </div>
      {(canUpdateContent || canDeleteContent) && (
        <BulkActionsBar
          selectedCount={selected.length}
          onClear={() => onSelectedChange([])}
          actions={canDeleteContent ? <Button label="Hapus Terpilih" icon="pi pi-trash" size="small" severity="danger" outlined onClick={onBulkDelete} /> : undefined}
        />
      )}
      <DataTable
        value={plans}
        loading={loading}
        size="small"
        emptyMessage="Belum ada test plan"
        paginator
        rows={10}
        rowsPerPageOptions={[5, 10, 25, 50]}
        rowHover
        onRowClick={isMobile ? (event) => navigate(`/test-plans/${(event.data as TestPlan).id}`) : undefined}
        sortField={isMobile ? undefined : sortField}
        sortOrder={isMobile ? undefined : sortOrder}
        onSort={isMobile ? undefined : onSort}
        selection={selected}
        onSelectionChange={(event: DataTableSelectionMultipleChangeEvent<TestPlan[]>) =>
          onSelectedChange(event.value)
        }
        dataKey="id"
        selectionMode={isMobile ? null : 'checkbox'}
      >
        <Column selectionMode="multiple" style={{ width: '3rem' }} hidden={isMobile} />
        <Column field="code" header="Kode" sortable={!isMobile} style={{ width: '7rem' }} hidden={isMobile}
          body={(plan: TestPlan) => <a className="entity-link" href={`/test-plans/${plan.id}`} onClick={(event) => { event.preventDefault(); navigate(`/test-plans/${plan.id}`); }}>{plan.code}</a>} />
        <Column field="name" header="Nama" sortable={!isMobile} body={isMobile ? mobileBody : (plan: TestPlan) => {
          if (editing?.id === plan.id && editing.field === 'name') {
            return <InputText autoFocus value={editValue} onChange={(event) => setEditValue(event.target.value)} onBlur={() => void commit(plan, 'name', editValue)} onKeyDown={(event) => { if (event.key === 'Enter') void commit(plan, 'name', editValue); if (event.key === 'Escape') setEditing(null); }} className="w-full" />;
          }
          return <span onClick={(event) => { event.stopPropagation(); if (canUpdateContent) { setEditing({ id: plan.id, field: 'name' }); setEditValue(plan.name); } }} style={{ cursor: canUpdateContent ? 'pointer' : undefined }}>{plan.name}</span>;
        }} />
        <Column field="status" header="Status" sortable hidden={isMobile} body={(plan: TestPlan) => editing?.id === plan.id && editing.field === 'status'
          ? <Dropdown autoFocus value={editValue} options={STATUS_OPTIONS} onChange={(event) => void commit(plan, 'status', event.value)} onHide={() => setEditing(null)} className="w-10rem" />
          : <span onClick={(event) => { event.stopPropagation(); if (canUpdateContent) { setEditing({ id: plan.id, field: 'status' }); setEditValue(plan.status); } }} style={{ cursor: canUpdateContent ? 'pointer' : undefined }}><Tag value={TEST_PLAN_STATUS_LABEL[plan.status]} severity={TEST_PLAN_STATUS_SEVERITY[plan.status]} /></span>} />
        <Column field="updatedAt" header="Update Terakhir" sortable hidden={isMobile} body={(plan: TestPlan) => formatDateTime(plan.updatedAt)} />
        <Column header="" style={{ width: '3.5rem' }} body={(plan: TestPlan) => (
          <div className="flex gap-1">
            {canUpdateContent && <Button icon="pi pi-pencil" text rounded size="small" aria-label="Edit test plan" onClick={() => onEdit(plan)} />}
            {canDeleteContent && <Button icon="pi pi-trash" text rounded size="small" severity="danger" aria-label="Hapus test plan" onClick={() => onDelete(plan)} />}
          </div>
        )} />
      </DataTable>
    </>
  );
}
