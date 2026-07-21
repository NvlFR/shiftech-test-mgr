import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Tag } from 'primereact/tag';
import { Dropdown } from 'primereact/dropdown';
import { testRunService } from '../../services/testRunService';
import { projectService } from '../../services/projectService';
import type { Project, TestRun } from '../../types/domain';
import { PageHeader } from '../../components/ui/PageHeader';
import { formatDateTime } from '../../helpers/dateFormatter';
import {
  TEST_RUN_STATUS_LABEL,
  TEST_RUN_STATUS_SEVERITY,
  TEST_RESULT_STATUS_SEVERITY,
} from '../../helpers/statusLabels';

export function TestRunsPage() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [testRuns, setTestRuns] = useState<(TestRun & { testPlanName: string; total: number; pass: number; fail: number })[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    projectService.list().then(setProjects);
  }, []);

  useEffect(() => {
    if (!projectId) {
      setTestRuns([]);
      return;
    }
    setLoading(true);
    testRunService.listByProjectWithSummary(projectId).then(setTestRuns).finally(() => setLoading(false));
  }, [projectId]);

  return (
    <div>
      <PageHeader
        title="Test Runs"
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
          Pilih project di atas untuk melihat test run-nya. Test run baru dimulai dari tab "Test Runs" di halaman detail Test Plan.
        </p>
      )}

      <DataTable
        value={testRuns}
        loading={loading}
        paginator
        rows={10}
        emptyMessage="Belum ada test run"
        onRowClick={(e) => navigate(`/test-runs/${(e.data as TestRun).id}`)}
        rowHover
        className="cursor-pointer"
        size="small"
      >
        <Column field="code" header="Kode" sortable style={{ width: '7rem' }} />
        <Column field="name" header="Nama Run" sortable />
        <Column field="testPlanName" header="Test Plan" sortable />
        <Column field="status" header="Status" body={(row: TestRun) => <Tag value={TEST_RUN_STATUS_LABEL[row.status]} severity={TEST_RUN_STATUS_SEVERITY[row.status]} />} sortable />
        <Column
          header="Hasil"
          body={(row: TestRun & { total: number; pass: number; fail: number }) => (
            <div className="flex gap-1 align-items-center">
              <Tag value={String(row.pass)} severity={TEST_RESULT_STATUS_SEVERITY.pass} />
              <Tag value={String(row.fail)} severity={TEST_RESULT_STATUS_SEVERITY.fail} />
              <span className="text-color-secondary text-sm">/{row.total}</span>
            </div>
          )}
          sortable
          sortField="pass"
        />
        <Column
          header="Tester"
          body={(row: TestRun & { testers: { id: string; fullName: string | null }[] }) =>
            row.testers.length > 0
              ? row.testers.map((t) => t.fullName ?? t.id).join(', ')
              : '-'
          }
        />
        <Column field="completedAt" header="Selesai" body={(row: TestRun) => (row.completedAt ? formatDateTime(row.completedAt) : '-')} />
      </DataTable>
    </div>
  );
}
