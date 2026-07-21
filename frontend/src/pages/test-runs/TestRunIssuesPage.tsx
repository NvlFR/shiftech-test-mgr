import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Tag } from 'primereact/tag';
import { Dropdown } from 'primereact/dropdown';
import { useIssuesByTestRun } from '../../hooks/useIssues';
import { issueService } from '../../services/issueService';
import { profileService } from '../../services/profileService';
import type { Issue, IssueStatus, IssueWithDetails, Profile } from '../../types/domain';
import { PageHeader } from '../../components/ui/PageHeader';

const STATUS_OPTIONS: { label: string; value: IssueStatus }[] = [
  { label: 'Open', value: 'open' },
  { label: 'In Progress', value: 'in_progress' },
  { label: 'Resolved', value: 'resolved' },
  { label: 'Verified', value: 'verified' },
  { label: 'Closed', value: 'closed' },
];

const PRIORITY_SEVERITY: Record<Issue['priority'], 'success' | 'info' | 'warning' | 'danger'> = {
  low: 'success',
  medium: 'info',
  high: 'warning',
  critical: 'danger',
};

export function TestRunIssuesPage() {
  const { id } = useParams<{ id: string }>();
  const { issues, loading, reload } = useIssuesByTestRun(id ?? null);
  const [approvedUsers, setApprovedUsers] = useState<Profile[]>([]);

  useEffect(() => {
    profileService.listAll().then((all) => setApprovedUsers(all.filter((p) => p.role === 'user' || p.role === 'admin')));
  }, []);

  async function handleChangeStatus(row: IssueWithDetails, status: IssueStatus) {
    await issueService.changeStatus(row.id, status);
    await reload();
  }

  async function handleAssign(row: IssueWithDetails, assignedTo: string | null) {
    await issueService.assign(row.id, assignedTo);
    await reload();
  }

  return (
    <div>
      <PageHeader title="Issues" />

      <DataTable value={issues} loading={loading} paginator rows={10} emptyMessage="Belum ada issue" size="small">
        <Column field="title" header="Judul" sortable />
        <Column field="priority" header="Prioritas" body={(row: IssueWithDetails) => <Tag value={row.priority} severity={PRIORITY_SEVERITY[row.priority]} />} sortable />
        <Column
          field="status"
          header="Status"
          body={(row: IssueWithDetails) => (
            <Dropdown
              value={row.status}
              options={STATUS_OPTIONS}
              onChange={(e) => handleChangeStatus(row, e.value)}
              className="w-10rem"
              pt={{ input: { className: 'p-0' } }}
            />
          )}
        />
        <Column
          field="assignee"
          header="Ditugaskan Ke"
          body={(row: IssueWithDetails) => (
            <Dropdown
              value={row.assignedTo}
              options={approvedUsers.map((u) => ({ label: u.fullName ?? u.email, value: u.id }))}
              onChange={(e) => handleAssign(row, e.value)}
              placeholder="Belum ditugaskan"
              showClear
              className="w-12rem"
            />
          )}
        />
      </DataTable>
    </div>
  );
}
