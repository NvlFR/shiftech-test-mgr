import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Tag } from 'primereact/tag';
import { Dropdown } from 'primereact/dropdown';
import { useTestPlans } from '../../hooks/useTestPlans';
import { projectService } from '../../services/projectService';
import type { Project, TestPlan } from '../../types/domain';
import { formatDate } from '../../helpers/dateFormatter';
import { PageHeader } from '../../components/ui/PageHeader';
import { TEST_PLAN_STATUS_LABEL, TEST_PLAN_STATUS_SEVERITY } from '../../helpers/statusLabels';

export function TestPlansPage() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState<string | null>(null);
  const { testPlans, loading } = useTestPlans(projectId);

  useEffect(() => {
    projectService.list().then(setProjects);
  }, []);

  return (
    <div>
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

      <DataTable value={testPlans} loading={loading} paginator rows={10} emptyMessage="Belum ada test plan" size="small"
        selectionMode="single" onSelectionChange={(e) => navigate(`/test-plans/${(e.value as TestPlan).id}`)}>
        <Column field="code" header="Kode" sortable style={{ width: '7rem' }} />
        <Column field="name" header="Nama" sortable />
        <Column field="status" header="Status" body={(row: TestPlan) => <Tag value={TEST_PLAN_STATUS_LABEL[row.status]} severity={TEST_PLAN_STATUS_SEVERITY[row.status]} />} />
        <Column field="updatedAt" header="Update Terakhir" body={(row: TestPlan) => formatDate(row.updatedAt)} sortable />
      </DataTable>
    </div>
  );
}
