import { useEffect, useState } from 'react';
import { Dialog } from 'primereact/dialog';
import { Dropdown } from 'primereact/dropdown';
import { MultiSelect } from 'primereact/multiselect';
import { Button } from 'primereact/button';
import { Tag } from 'primereact/tag';
import { useAuthContext } from '../../hooks/useAuth';
import { projectRepository } from '../../repositories/projectRepository';
import { testCaseRepository } from '../../repositories/testCaseRepository';
import type { Project, TestCase } from '../../types/domain';

type ImportCasesDialogProps = {
  visible: boolean;
  onHide: () => void;
  loading?: boolean;
  excludeProjectId?: string;
  onImport: (sourceProjectId: string, testCaseIds: string[]) => void;
};

export function ImportCasesDialog({ visible, onHide, loading = false, excludeProjectId, onImport }: ImportCasesDialogProps) {
  const { user } = useAuthContext();
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [cases, setCases] = useState<TestCase[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [loadingCases, setLoadingCases] = useState(false);

  useEffect(() => {
    if (!visible || !user) return;
    setLoadingProjects(true);
    projectRepository.findByOwner(user.id)
      .then((rows) => setProjects(rows.filter((project) => project.id !== excludeProjectId)))
      .finally(() => setLoadingProjects(false));
  }, [visible, user, excludeProjectId]);

  async function selectProject(value: string | null) {
    setProjectId(value);
    setSelectedIds([]);
    if (!value) { setCases([]); return; }
    setLoadingCases(true);
    try {
      const rows = await testCaseRepository.findAllByProject(value);
      setCases(rows.filter((testCase) => testCase.status === 'active'));
    } finally {
      setLoadingCases(false);
    }
  }

  function reset() {
    setProjectId(null);
    setCases([]);
    setSelectedIds([]);
  }

  function hide() { reset(); onHide(); }

  return (
    <Dialog header="Import Test Case" visible={visible} onHide={hide} style={{ width: '38rem' }}>
      <div className="flex flex-column gap-3">
        <p className="text-color-secondary text-sm m-0">Pilih project lain lalu pilih test case aktif yang ingin disalin ke project ini.</p>
        <Dropdown value={projectId} options={projects.map((project) => ({ label: project.name, value: project.id }))} onChange={(event) => selectProject(event.value)} placeholder="Pilih source project" filter showClear loading={loadingProjects} className="w-full" />
        {projectId && <MultiSelect value={selectedIds} options={cases.map((testCase) => ({ label: `${testCase.code} — ${testCase.title}`, value: testCase.id }))} onChange={(event) => setSelectedIds(event.value ?? [])} placeholder={loadingCases ? 'Memuat test case...' : 'Pilih test case'} filter display="chip" className="w-full" disabled={loadingCases} />}
        <div className="flex align-items-center justify-content-between">
          {selectedIds.length > 0 && <Tag value={`${selectedIds.length} dipilih`} severity="info" />}
          <Button label={`Import ${selectedIds.length || ''} Test Case`} icon="pi pi-download" size="small" loading={loading} disabled={!projectId || selectedIds.length === 0} onClick={() => projectId && onImport(projectId, selectedIds)} className="ml-auto" />
        </div>
      </div>
    </Dialog>
  );
}

export default ImportCasesDialog;
