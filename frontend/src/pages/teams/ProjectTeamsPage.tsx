import { useMemo, useRef, useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { Button } from 'primereact/button';
import { Card } from 'primereact/card';
import { Column } from 'primereact/column';
import { DataTable } from 'primereact/datatable';
import { Dialog } from 'primereact/dialog';
import { Dropdown } from 'primereact/dropdown';
import { Toast } from 'primereact/toast';
import { useProjectRole } from '../../hooks/useProjectRole';
import { useProjectTeams } from '../../hooks/useProjectTeams';
import { useTeams } from '../../hooks/useTeams';
import { teamService } from '../../services/teamService';
import type { ProjectMemberRole, ProjectTeam, Team } from '../../types/domain';
import { PROJECT_MEMBER_ROLE_LABEL } from '../../helpers/statusLabels';

const roles = (['member', 'tester', 'supervisor', 'manager'] as ProjectMemberRole[]).map((value) => ({ value, label: PROJECT_MEMBER_ROLE_LABEL[value] }));
export function ProjectTeamsPage() {
  const { id } = useParams<{ id: string }>();
  const { loading: roleLoading, canManageSettings } = useProjectRole(id);
  const { projectTeams, loading, reload } = useProjectTeams(id);
  const { teams } = useTeams();
  const toast = useRef<Toast>(null);
  const [visible, setVisible] = useState(false);
  const [teamId, setTeamId] = useState<string | null>(null);
  const [role, setRole] = useState<ProjectMemberRole>('member');
  const available = useMemo(() => (teams as Team[]).filter((team) => !projectTeams.some((item) => item.teamId === team.id)), [projectTeams, teams]);
  if (!roleLoading && !canManageSettings) return <Navigate to={id ? `/projects/${id}` : '/'} replace />;
  async function add() {
    if (!id || !teamId) return;
    try {
      await teamService.addToProject(id, teamId, role); setVisible(false); setTeamId(null); await reload();
      toast.current?.show({ severity: 'success', summary: 'Akses team ditambahkan' });
    } catch (reason) { toast.current?.show({ severity: 'error', summary: 'Gagal menambahkan akses', detail: reason instanceof Error ? reason.message : undefined }); }
  }
  async function changeRole(item: ProjectTeam, nextRole: ProjectMemberRole) {
    try { await teamService.updateProjectAccess(item.id, nextRole); await reload(); }
    catch (reason) { toast.current?.show({ severity: 'error', summary: 'Gagal memperbarui akses', detail: reason instanceof Error ? reason.message : undefined }); }
  }
  async function remove(item: ProjectTeam) {
    try { await teamService.removeFromProject(item.id); await reload(); }
    catch (reason) { toast.current?.show({ severity: 'error', summary: 'Gagal melepas akses', detail: reason instanceof Error ? reason.message : undefined }); }
  }
  return <div><Toast ref={toast} /><Card title="Akses Team Project" subTitle="Anggota team memperoleh permission project sesuai role yang dipilih.">
    <div className="flex justify-content-end mb-3"><Button label="Tambah Team" icon="pi pi-plus" disabled={roleLoading} onClick={() => setVisible(true)} /></div>
    <DataTable value={projectTeams} loading={loading || roleLoading} dataKey="id" emptyMessage="Belum ada team dengan akses" size="small">
      <Column header="Team" body={(item: ProjectTeam) => item.team.name} /><Column header="Role" body={(item: ProjectTeam) => <Dropdown value={item.role} options={roles} onChange={(event) => void changeRole(item, event.value)} aria-label={`Role ${item.team.name}`} />} />
      <Column header="Aksi" body={(item: ProjectTeam) => <Button icon="pi pi-trash" text rounded severity="danger" aria-label="Lepas akses" onClick={() => remove(item)} />} />
    </DataTable>
  </Card><Dialog header="Tambah Akses Team" visible={visible} onHide={() => setVisible(false)} style={{ width: '30rem', maxWidth: '95vw' }}><div className="flex flex-column gap-3"><Dropdown value={teamId} options={available.map((team) => ({ label: team.name, value: team.id }))} onChange={(event) => setTeamId(event.value)} placeholder="Pilih team" /><Dropdown value={role} options={roles} onChange={(event) => setRole(event.value)} /><Button label="Tambahkan" disabled={!teamId} onClick={add} /></div></Dialog></div>;
}
