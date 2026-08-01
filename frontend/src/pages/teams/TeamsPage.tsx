import { useRef, useState } from 'react';
import { Button } from 'primereact/button';
import { Column } from 'primereact/column';
import { DataTable } from 'primereact/datatable';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { MultiSelect } from 'primereact/multiselect';
import { Toast } from 'primereact/toast';
import { confirmDialog, ConfirmDialog } from 'primereact/confirmdialog';
import { PageHeader } from '../../components/ui/PageHeader';
import { useTeams } from '../../hooks/useTeams';
import { useProfiles } from '../../hooks/useProfiles';
import { teamService } from '../../services/teamService';
import type { TeamWithMembers } from '../../types/domain';

export function TeamsPage() {
  const { teams, loading, reload } = useTeams(true);
  const { profiles } = useProfiles();
  const toast = useRef<Toast>(null);
  const [visible, setVisible] = useState(false);
  const [editing, setEditing] = useState<TeamWithMembers | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  function open(team?: TeamWithMembers) {
    setEditing(team ?? null); setName(team?.name ?? ''); setDescription(team?.description ?? '');
    setMemberIds(team?.members.map((member) => member.id) ?? []); setError(null); setVisible(true);
  }
  async function save() {
    setError(null);
    try {
      const team = editing ?? await teamService.create(name, description);
      if (editing) await teamService.update(editing.id, name, description);
      await teamService.setMembers(team.id, memberIds);
      setVisible(false); await reload();
      toast.current?.show({ severity: 'success', summary: editing ? 'Team diperbarui' : 'Team dibuat' });
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Gagal menyimpan team'); }
  }
  function remove(team: TeamWithMembers) {
    confirmDialog({ header: 'Hapus Team', message: `Hapus team "${team.name}"? Akses team ke seluruh project ikut dilepas.`, acceptLabel: 'Hapus', rejectLabel: 'Batal', acceptClassName: 'p-button-danger', accept: async () => { await teamService.remove(team.id); await reload(); } });
  }
  return <div>
    <Toast ref={toast} /><ConfirmDialog />
    <PageHeader title="Team Management" actions={<Button label="Team Baru" icon="pi pi-plus" onClick={() => open()} />} />
    <DataTable value={teams as TeamWithMembers[]} loading={loading} dataKey="id" emptyMessage="Belum ada team" size="small">
      <Column field="name" header="Nama" sortable /><Column field="description" header="Deskripsi" />
      <Column header="Anggota" body={(team: TeamWithMembers) => team.members.length ? team.members.map((member) => member.fullName ?? member.email).join(', ') : 'Belum ada anggota'} />
      <Column header="Aksi" body={(team: TeamWithMembers) => <div className="flex gap-2"><Button icon="pi pi-pencil" text rounded aria-label="Edit" onClick={() => open(team)} /><Button icon="pi pi-trash" text rounded severity="danger" aria-label="Hapus" onClick={() => remove(team)} /></div>} />
    </DataTable>
    <Dialog header={editing ? 'Edit Team' : 'Team Baru'} visible={visible} onHide={() => setVisible(false)} style={{ width: '34rem', maxWidth: '95vw' }}>
      <div className="flex flex-column gap-3">
        {error && <small className="p-error">{error}</small>}
        <div className="flex flex-column gap-1"><label htmlFor="team-name">Nama</label><InputText id="team-name" value={name} onChange={(event) => setName(event.target.value)} /></div>
        <div className="flex flex-column gap-1"><label htmlFor="team-description">Deskripsi</label><InputTextarea id="team-description" value={description} onChange={(event) => setDescription(event.target.value)} rows={3} /></div>
        <div className="flex flex-column gap-1"><label htmlFor="team-members">Anggota</label><MultiSelect inputId="team-members" value={memberIds} options={profiles.filter((profile) => profile.role === 'user' || profile.role === 'admin').map((profile) => ({ label: profile.fullName ? `${profile.fullName} (${profile.email})` : profile.email, value: profile.id }))} onChange={(event) => setMemberIds(event.value)} filter display="chip" placeholder="Pilih user" /></div>
        <Button label="Simpan" onClick={save} />
      </div>
    </Dialog>
  </div>;
}
