import { useEffect, useState } from 'react';
import { Dialog } from 'primereact/dialog';
import { Dropdown } from 'primereact/dropdown';
import { MultiSelect } from 'primereact/multiselect';
import { Button } from 'primereact/button';
import { Tag } from 'primereact/tag';
import { useAuthContext } from '../../hooks/useAuth';
import { projectService } from '../../services/projectService';
import { testCaseService } from '../../services/testCaseService';
import type { Project, TestCase } from '../../types/domain';

type ImportCasesDialogProps = {
  visible: boolean;
  onHide: () => void;
  loading?: boolean;
  excludeProjectId?: string;
  onImport: (sourceProjectId: string, testCaseIds: string[]) => Promise<void>;
};

export function ImportCasesDialog({ visible, onHide, loading = false, excludeProjectId, onImport }: ImportCasesDialogProps) {
  const { profile } = useAuthContext();
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [cases, setCases] = useState<TestCase[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [loadingCases, setLoadingCases] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible || !profile) return;
    setLoadingProjects(true);
    setError(null);
    // RLS sudah membatasi project yang boleh diakses user ini.
    projectService.list({ status: 'active' })
      .then((rows: Project[]) => setProjects(rows.filter((project) => project.id !== excludeProjectId)))
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Gagal memuat project'))
      .finally(() => setLoadingProjects(false));
  }, [visible, profile, excludeProjectId]);

  async function selectProject(value: string | null) {
    setProjectId(value);
    setError(null);
    setSelectedIds([]);
    if (!value) { setCases([]); return; }
    setLoadingCases(true);
    try {
      const rows = await testCaseService.listFiltered(value, { status: 'active' });
      setCases(rows);
    } catch (err) {
      setCases([]);
      setError(err instanceof Error ? err.message : 'Gagal memuat test case');
    } finally {
      setLoadingCases(false);
    }
  }

  function reset() {
    setProjectId(null);
    setCases([]);
    setSelectedIds([]);
    setError(null);
  }

  function hide() { reset(); onHide(); }

  async function importSelected() {
    if (!projectId || selectedIds.length === 0) return;
    setError(null);
    try {
      await onImport(projectId, selectedIds);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mengimport test case');
    }
  }

  return (
    <Dialog header="Import Test Case" visible={visible} onHide={loading ? () => undefined : hide} closable={!loading} style={{ width: '38rem' }}>
      <div className="flex flex-column gap-3">
        <p className="text-color-secondary text-sm m-0">Pilih project lain lalu pilih test case aktif yang ingin disalin ke project ini.</p>
        {error && <small className="p-error">{error}</small>}
        <Dropdown value={projectId} options={projects.map((project) => ({ label: project.name, value: project.id }))} onChange={(event) => selectProject(event.value)} placeholder="Pilih source project" filter showClear loading={loadingProjects} className="w-full" />
        {projectId && <MultiSelect value={selectedIds} options={cases.map((testCase) => ({ label: `${testCase.code} — ${testCase.title}`, value: testCase.id }))} onChange={(event) => setSelectedIds(event.value ?? [])} placeholder={loadingCases ? 'Memuat test case...' : 'Pilih test case'} filter display="chip" className="w-full" disabled={loadingCases} />}
        <div className="flex align-items-center justify-content-between">
          {selectedIds.length > 0 && <Tag value={`${selectedIds.length} dipilih`} severity="info" />}
          <Button label={`Import ${selectedIds.length || ''} Test Case`} icon="pi pi-download" size="small" loading={loading} disabled={!projectId || selectedIds.length === 0} onClick={() => void importSelected()} className="ml-auto" />
        </div>
      </div>
    </Dialog>
  );
}

export default ImportCasesDialog;
