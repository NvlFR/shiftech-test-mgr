import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from 'primereact/button';
import { Card } from 'primereact/card';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Dialog } from 'primereact/dialog';
import { Dropdown } from 'primereact/dropdown';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { Tag } from 'primereact/tag';
import { PageHeader } from '../../components/ui/PageHeader';
import { useAuthContext } from '../../hooks/useAuth';
import { useRequirements } from '../../hooks/useRequirements';
import { requirementService } from '../../services/requirementService';
import { testCaseService } from '../../services/testCaseService';
import { testPlanService } from '../../services/testPlanService';
import { testRunService } from '../../services/testRunService';
import { issueService } from '../../services/issueService';
import type { RequirementLinkType, RequirementPriority, RequirementStatus, TestCase, TestPlan, TestResultWithDetails, TestRun, IssueWithDetails } from '../../types/domain';

type Option = { label: string; value: string };
const TYPES: { label: string; value: RequirementLinkType }[] = [{ label: 'Test Case', value: 'test_case' }, { label: 'Test Plan', value: 'test_plan' }, { label: 'Test Result', value: 'test_result' }, { label: 'Issue', value: 'issue' }];
const STATUSES: { label: string; value: RequirementStatus }[] = [{ label: 'Draft', value: 'draft' }, { label: 'Disetujui', value: 'approved' }, { label: 'Deprecated', value: 'deprecated' }];
const PRIORITIES: { label: string; value: RequirementPriority }[] = (['low', 'medium', 'high', 'critical'] as RequirementPriority[]).map((value) => ({ label: value, value }));

export function RequirementsPage() {
  const { id: projectId } = useParams<{ id: string }>(); const { profile } = useAuthContext(); const { requirements, loading, reload } = useRequirements(projectId ?? null);
  const [cases, setCases] = useState<TestCase[]>([]); const [plans, setPlans] = useState<TestPlan[]>([]); const [results, setResults] = useState<TestResultWithDetails[]>([]); const [issues, setIssues] = useState<IssueWithDetails[]>([]);
  const [dialog, setDialog] = useState<'create' | 'link' | null>(null); const [selectedId, setSelectedId] = useState<string | null>(null); const [key, setKey] = useState(''); const [title, setTitle] = useState(''); const [description, setDescription] = useState(''); const [status, setStatus] = useState<RequirementStatus>('draft'); const [priority, setPriority] = useState<RequirementPriority>('medium'); const [linkType, setLinkType] = useState<RequirementLinkType>('test_case'); const [targetId, setTargetId] = useState(''); const [error, setError] = useState<string | null>(null);
  useEffect(() => { if (!projectId) return; Promise.all([testCaseService.listByProject(projectId), testPlanService.listByProject(projectId), testRunService.listByProject(projectId), issueService.listByProject(projectId)]).then(async ([c, p, r, i]) => { setCases(c); setPlans(p); setIssues(i); const runResults = await Promise.all((r as TestRun[]).map((run) => testRunService.getWithResults(run.id))); setResults(runResults.flatMap((item) => item.results)); }); }, [projectId]);
  const options = useMemo<Option[]>(() => linkType === 'test_case' ? cases.map((x) => ({ label: `${x.code} — ${x.title}`, value: x.id })) : linkType === 'test_plan' ? plans.map((x) => ({ label: `${x.code} — ${x.name}`, value: x.id })) : linkType === 'test_result' ? results.map((x) => ({ label: `${x.testCase.code} — ${x.testCase.title}`, value: x.id })) : issues.map((x) => ({ label: `${x.code} — ${x.title}`, value: x.id })), [cases, plans, results, issues, linkType]);
  const coverage = { total: requirements.length, covered: requirements.filter((x) => x.links.some((link) => link.type === 'test_case' || link.type === 'test_plan')).length };
  const save = async () => { setError(null); try { if (!projectId || !profile) return; await requirementService.create({ projectId, key, title, description, status, priority, createdBy: profile.id }); setDialog(null); setKey(''); setTitle(''); setDescription(''); await reload(); } catch (e) { setError(e instanceof Error ? e.message : 'Gagal menyimpan'); } };
  const addLink = async () => { setError(null); try { if (!selectedId || !profile) return; await requirementService.addLink({ requirementId: selectedId, type: linkType, targetId, createdBy: profile.id }); setDialog(null); setTargetId(''); await reload(); } catch (e) { setError(e instanceof Error ? e.message : 'Gagal menambahkan link'); } };
  const openCreate = () => { setError(null); setDialog('create'); }; const openLink = (id: string) => { setSelectedId(id); setTargetId(''); setError(null); setDialog('link'); };
  return <div className="page-fade-in"><PageHeader title="Requirements" actions={<Button label="Requirement Baru" icon="pi pi-plus" size="small" onClick={openCreate} />} /><Card className="mb-3"><span className="text-color-secondary">Coverage: </span><strong>{coverage.covered}/{coverage.total}</strong><span className="ml-2">({coverage.total ? Math.round((coverage.covered / coverage.total) * 100) : 0}%)</span><span className="ml-4 text-color-secondary">Unmet: {coverage.total - coverage.covered}</span></Card><DataTable value={requirements} loading={loading} dataKey="id" emptyMessage="Belum ada requirement" size="small"><Column field="key" header="Kode" sortable /><Column field="title" header="Judul" sortable /><Column field="status" header="Status" body={(x) => <Tag value={x.status} />} /><Column field="priority" header="Prioritas" /><Column header="Traceability" body={(x) => <span>{x.links.length} link{x.links.length === 1 ? '' : 's'}</span>} /><Column header="Aksi" body={(x) => <div className="flex gap-2"><Button icon="pi pi-link" rounded text size="small" tooltip="Tambah traceability" onClick={() => openLink(x.id)} /><Button icon="pi pi-trash" rounded text severity="danger" size="small" onClick={async () => { await requirementService.remove(x.id); await reload(); }} /></div>} /></DataTable>
    <Dialog header="Requirement Baru" visible={dialog === 'create'} onHide={() => setDialog(null)} style={{ width: '32rem' }}><div className="flex flex-column gap-3">{error && <small className="p-error">{error}</small>}<span className="p-float-label"><InputText id="req-key" value={key} onChange={(e) => setKey(e.target.value)} className="w-full" /><label htmlFor="req-key">Kode</label></span><span className="p-float-label"><InputText id="req-title" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full" /><label htmlFor="req-title">Judul</label></span><InputTextarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Deskripsi (opsional)" rows={3} /><div className="flex gap-2"><Dropdown value={status} options={STATUSES} onChange={(e) => setStatus(e.value)} className="w-full" /><Dropdown value={priority} options={PRIORITIES} onChange={(e) => setPriority(e.value)} className="w-full" /></div><Button label="Simpan" onClick={save} /></div></Dialog>
    <Dialog header="Hubungkan Requirement" visible={dialog === 'link'} onHide={() => setDialog(null)} style={{ width: '32rem' }}><div className="flex flex-column gap-3">{error && <small className="p-error">{error}</small>}<Dropdown value={linkType} options={TYPES} onChange={(e) => { setLinkType(e.value); setTargetId(''); }} className="w-full" /><Dropdown value={targetId} options={options} onChange={(e) => setTargetId(e.value)} placeholder="Pilih target" filter className="w-full" /><Button label="Hubungkan" onClick={addLink} /></div></Dialog>
  </div>;
}
