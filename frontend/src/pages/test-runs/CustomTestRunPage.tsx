import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from 'primereact/button';
import { Card } from 'primereact/card';
import { Column } from 'primereact/column';
import { DataTable } from 'primereact/datatable';
import { InputText } from 'primereact/inputtext';
import { Toast } from 'primereact/toast';
import { useRef } from 'react';
import { Breadcrumb } from '../../components/ui/Breadcrumb';
import { testCaseService } from '../../services/testCaseService';
import { testRunService } from '../../services/testRunService';
import { useProjectRole } from '../../hooks/useProjectRole';
import type { TestCase } from '../../types/domain';

export function CustomTestRunPage() {
  const { id: projectId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useRef<Toast>(null);
  const { canRunTests, loading: roleLoading } = useProjectRole(projectId);
  const [cases, setCases] = useState<TestCase[]>([]);
  const [selected, setSelected] = useState<TestCase[]>([]);
  const [name, setName] = useState(`Ad-hoc Run ${new Date().toLocaleDateString('id-ID')}`);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (projectId) testCaseService.listByProject(projectId).then(setCases).finally(() => setLoading(false)); }, [projectId]);

  async function start() {
    if (!projectId || !name.trim() || selected.length === 0) return;
    setSaving(true);
    try {
      const run = await testRunService.startCustom(projectId, selected.map((testCase) => testCase.id), name);
      navigate(`/test-runs/${run.id}`);
    } catch (err) {
      toast.current?.show({ severity: 'error', summary: 'Gagal membuat custom run', detail: err instanceof Error ? err.message : undefined });
    } finally { setSaving(false); }
  }

  return <div>
    <Toast ref={toast} />
    <Breadcrumb items={[{ label: 'Projects', path: '/' }, { label: 'Custom Test Run' }]} />
    <Card title="Custom Test Run">
      <p className="text-color-secondary mt-0">Pilih test case secara langsung tanpa membuat Test Plan. Scope akan disnapshot ke run ini.</p>
      <div className="flex gap-2 align-items-center mb-3">
        <InputText value={name} onChange={(e) => setName(e.target.value)} placeholder="Nama run" className="w-20rem" />
        <Button label="Mulai Run" icon="pi pi-play" onClick={start} loading={saving} disabled={!canRunTests || roleLoading || !name.trim() || selected.length === 0} />
      </div>
      <DataTable value={cases} loading={loading} dataKey="id" selection={selected} onSelectionChange={(e) => setSelected(e.value as TestCase[])} selectionMode="multiple" paginator rows={12} emptyMessage="Belum ada test case di project ini.">
        <Column selectionMode="multiple" headerStyle={{ width: '3rem' }} />
        <Column field="code" header="Kode" sortable />
        <Column field="title" header="Test Case" sortable />
        <Column field="priority" header="Prioritas" sortable />
      </DataTable>
    </Card>
  </div>;
}
