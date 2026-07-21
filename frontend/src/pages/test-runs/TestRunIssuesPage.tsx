import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Tag } from 'primereact/tag';
import { Dropdown } from 'primereact/dropdown';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { useIssuesByTestRun } from '../../hooks/useIssues';
import { issueService } from '../../services/issueService';
import { profileService } from '../../services/profileService';
import type { IssueStatus, IssueWithDetails, Profile } from '../../types/domain';
import { PageHeader } from '../../components/ui/PageHeader';
import { Breadcrumb } from '../../components/ui/Breadcrumb';
import { RowActionsMenu } from '../../components/ui/RowActionsMenu';
import { testRunService } from '../../services/testRunService';
import { testPlanService } from '../../services/testPlanService';
import { projectService } from '../../services/projectService';
import type { TestPlan, TestRun } from '../../types/domain';
import { ISSUE_PRIORITY_LABEL, ISSUE_PRIORITY_SEVERITY, ISSUE_STATUS_LABEL } from '../../helpers/statusLabels';

const STATUS_OPTIONS: { label: string; value: IssueStatus }[] = (
  ['open', 'in_progress', 'resolved', 'verified', 'closed'] as const
).map((value) => ({ label: ISSUE_STATUS_LABEL[value], value }));

export function TestRunIssuesPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { issues, loading, reload } = useIssuesByTestRun(id ?? null);
  const [approvedUsers, setApprovedUsers] = useState<Profile[]>([]);
  const [testRun, setTestRun] = useState<TestRun | null>(null);
  const [testPlan, setTestPlan] = useState<TestPlan | null>(null);
  const [projectName, setProjectName] = useState<string | null>(null);

  useEffect(() => {
    profileService.listAll().then((all) => setApprovedUsers(all.filter((p) => p.role === 'user' || p.role === 'admin')));
  }, []);

  useEffect(() => {
    if (id) testRunService.getById(id).then(setTestRun);
  }, [id]);

  useEffect(() => {
    if (testRun) testPlanService.getById(testRun.testPlanId).then(setTestPlan);
  }, [testRun]);

  useEffect(() => {
    if (testPlan) projectService.getById(testPlan.projectId).then((p) => setProjectName(p?.name ?? null));
  }, [testPlan]);

  async function handleChangeStatus(row: IssueWithDetails, status: IssueStatus) {
    await issueService.changeStatus(row.id, status);
    await reload();
  }

  async function handleAssign(row: IssueWithDetails, assignedTo: string | null) {
    await issueService.assign(row.id, assignedTo);
    await reload();
  }

  function handleDelete(row: IssueWithDetails) {
    confirmDialog({
      header: 'Hapus Issue',
      message: `Issue "${row.title}" akan dihapus permanen. Lanjutkan?`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Hapus',
      rejectLabel: 'Batal',
      acceptClassName: 'p-button-danger',
      accept: async () => {
        await issueService.remove(row.id);
        await reload();
      },
    });
  }

  return (
    <div>
      <ConfirmDialog />

      {testRun && testPlan && (
        <Breadcrumb
          items={[
            { label: 'Projects', path: '/' },
            { label: projectName ?? '...', path: `/projects/${testPlan.projectId}` },
            { label: `${testPlan.code} — ${testPlan.name}`, path: `/test-plans/${testPlan.id}` },
            { label: `${testRun.code} — ${testRun.name}`, path: `/test-runs/${testRun.id}` },
            { label: 'Issues' },
          ]}
        />
      )}

      <PageHeader title="Issues" />

      <DataTable
        value={issues}
        loading={loading}
        paginator
        rows={10}
        emptyMessage="Belum ada issue"
        size="small"
        onRowClick={(e) => navigate(`/issues/${(e.data as IssueWithDetails).id}?testRunId=${id}`)}
        rowHover
        className="cursor-pointer"
      >
        <Column field="title" header="Judul" sortable />
        <Column field="priority" header="Prioritas" body={(row: IssueWithDetails) => <Tag value={ISSUE_PRIORITY_LABEL[row.priority]} severity={ISSUE_PRIORITY_SEVERITY[row.priority]} />} sortable />
        <Column
          field="status"
          header="Status"
          body={(row: IssueWithDetails) => (
            <div onClick={(e) => e.stopPropagation()}>
              <Dropdown
                value={row.status}
                options={STATUS_OPTIONS}
                onChange={(e) => handleChangeStatus(row, e.value)}
                className="w-12rem"
              />
            </div>
          )}
        />
        <Column
          field="assignee"
          header="Ditugaskan Ke"
          body={(row: IssueWithDetails) => (
            <div onClick={(e) => e.stopPropagation()}>
              <Dropdown
                value={row.assignedTo}
                options={approvedUsers.map((u) => ({ label: u.fullName ?? u.email, value: u.id }))}
                onChange={(e) => handleAssign(row, e.value)}
                placeholder="Belum ditugaskan"
                showClear
                className="w-12rem"
              />
            </div>
          )}
        />
        <Column
          header=""
          style={{ width: '3.5rem' }}
          body={(row: IssueWithDetails) => (
            <RowActionsMenu
              items={[
                { label: 'Buka Detail', icon: 'pi pi-external-link', command: () => navigate(`/issues/${row.id}?testRunId=${id}`) },
                { label: 'Hapus', icon: 'pi pi-trash', className: 'p-error', command: () => handleDelete(row) },
              ]}
            />
          )}
        />
      </DataTable>
    </div>
  );
}
