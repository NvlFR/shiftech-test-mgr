import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Tag } from 'primereact/tag';
import { Dropdown } from 'primereact/dropdown';
import { Toast } from 'primereact/toast';
import { useTestPlans } from '../../hooks/useTestPlans';
import { useProjectRole } from '../../hooks/useProjectRole';
import { useProjectContext } from '../../hooks/useProjectContext';
import { testPlanService } from '../../services/testPlanService';
import type { TestPlan, TestPlanStatus } from '../../types/domain';
import { formatDate } from '../../helpers/dateFormatter';
import { PageHeader } from '../../components/ui/PageHeader';
import { Breadcrumb } from '../../components/ui/Breadcrumb';
import { RowActionsMenu } from '../../components/ui/RowActionsMenu';
import { TEST_PLAN_STATUS_LABEL, TEST_PLAN_STATUS_SEVERITY } from '../../helpers/statusLabels';
import { SearchInput } from '../../components/ui/SearchInput';
import { FilterToolbar } from '../../components/ui/FilterToolbar';

const TEST_PLAN_STATUS_OPTIONS: TestPlanStatus[] = ['draft', 'active', 'completed', 'archived'];

export function TestPlansPage() {
  const navigate = useNavigate();
  const toast = useRef<Toast>(null);
  const { projects, projectId, setProjectId } = useProjectContext();
  const { testPlans, loading, reload } = useTestPlans(projectId);
  const { canEditContent } = useProjectRole(projectId ?? undefined);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<TestPlanStatus | null>(null);

  const filteredPlans = useMemo(() => {
    const query = search.trim().toLowerCase();
    return testPlans.filter((plan) =>
      (!query || plan.code.toLowerCase().includes(query) || plan.name.toLowerCase().includes(query)) &&
      (!statusFilter || plan.status === statusFilter),
    );
  }, [search, statusFilter, testPlans]);

  async function handleChangeStatus(row: TestPlan, status: TestPlanStatus) {
    if (status === row.status) return;
    await testPlanService.changeStatus(row.id, status);
    await reload();
    toast.current?.show({ severity: 'success', summary: `Status diubah ke ${TEST_PLAN_STATUS_LABEL[status]}` });
  }

  return (
    <div>
      <Toast ref={toast} />
      <Breadcrumb items={[{ label: 'Test Plans' }]} />
      <PageHeader
        title="Test Plans"
        actions={
          <Dropdown
            value={projectId}
            options={projects.map((p) => ({ label: p.name, value: p.id }))}
            onChange={(e) => setProjectId(e.value)}
            placeholder="Pilih project"
            className="w-15rem"
            showClear
          />
        }
      />

      {!projectId && (
        <p className="text-color-secondary">
          Pilih project di atas untuk melihat test plan-nya. Test plan baru dibuat dari halaman detail project.
        </p>
      )}

      {projectId && (
        <FilterToolbar>
          <SearchInput value={search} onChange={setSearch} placeholder="Cari kode atau nama test plan..." className="col-12 md:col-6 lg:col-4" />
          <Dropdown
            value={statusFilter}
            options={TEST_PLAN_STATUS_OPTIONS.map((status) => ({ label: TEST_PLAN_STATUS_LABEL[status], value: status }))}
            onChange={(e) => setStatusFilter(e.value)}
            placeholder="Semua status"
            showClear
            className="col-12 md:col-4 lg:col-3"
          />
        </FilterToolbar>
      )}

      <DataTable value={filteredPlans} loading={loading} paginator rows={10} emptyMessage="Belum ada test plan" size="small"
        selectionMode="single" rowHover onSelectionChange={(e) => navigate(`/test-plans/${(e.value as TestPlan).id}`)}>
        <Column field="code" header="Kode" sortable style={{ width: '7rem' }} />
        <Column field="name" header="Nama" sortable />
        <Column field="status" header="Status" body={(row: TestPlan) => <Tag value={TEST_PLAN_STATUS_LABEL[row.status]} severity={TEST_PLAN_STATUS_SEVERITY[row.status]} />} />
        <Column field="updatedAt" header="Update Terakhir" body={(row: TestPlan) => formatDate(row.updatedAt)} sortable />
        {canEditContent && (
          <Column
            header=""
            style={{ width: '4rem' }}
            body={(row: TestPlan) => (
              <RowActionsMenu
                items={TEST_PLAN_STATUS_OPTIONS.filter((s) => s !== row.status).map((status) => ({
                  label: `Ubah ke ${TEST_PLAN_STATUS_LABEL[status]}`,
                  command: () => handleChangeStatus(row, status),
                }))}
              />
            )}
          />
        )}
      </DataTable>
    </div>
  );
}
