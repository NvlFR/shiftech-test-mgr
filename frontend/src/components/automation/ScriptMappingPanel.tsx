import { useMemo, useState } from 'react';
import { Button } from 'primereact/button';
import { Checkbox } from 'primereact/checkbox';
import { Chips } from 'primereact/chips';
import { Column } from 'primereact/column';
import { DataTable, type DataTableSelectionMultipleChangeEvent } from 'primereact/datatable';
import { Dropdown } from 'primereact/dropdown';
import { InputText } from 'primereact/inputtext';
import { Message } from 'primereact/message';
import { Tag } from 'primereact/tag';
import { useScreenSize } from '../../hooks/useScreenSize';
import type { AutomationJob, AutomationRunner, AutomationScript, TestCase } from '../../types/domain';

type RunnerEvaluation = { labelMatches: AutomationRunner[]; fileMatches: AutomationRunner[] };

interface Props {
  testCases: TestCase[];
  scripts: AutomationScript[];
  runners: AutomationRunner[];
  jobs: AutomationJob[];
  loading: boolean;
  saving: boolean;
  onCreate: (input: { testCaseId: string; scriptRef: string; runnerLabels: string[] }) => Promise<void>;
  onBulkCreate: (input: { testCases: TestCase[]; pattern: string; runnerLabels: string[] }) => Promise<void>;
  onDelete: (script: AutomationScript) => void;
  onRun: (script: AutomationScript) => void;
  buildScriptRef: (pattern: string, testCase: Pick<TestCase, 'code' | 'title'>) => string;
  evaluateRunners: (scriptRef: string, labels: string[], runners: AutomationRunner[], jobs: AutomationJob[]) => RunnerEvaluation;
}

export function ScriptMappingPanel(props: Props) {
  const { lt } = useScreenSize();
  const [testCaseId, setTestCaseId] = useState<string | null>(null);
  const [scriptRef, setScriptRef] = useState('');
  const [labels, setLabels] = useState<string[]>([]);
  const [selected, setSelected] = useState<TestCase[]>([]);
  const [pattern, setPattern] = useState('tests/{code}.spec.ts');
  const [bulkLabels, setBulkLabels] = useState<string[]>([]);
  const unmapped = useMemo(() => props.testCases.filter((testCase) => !props.scripts.some((script) => script.testCaseId === testCase.id)), [props.testCases, props.scripts]);
  const currentEvaluation = props.evaluateRunners(scriptRef, labels, props.runners, props.jobs);

  const resetSingle = () => { setTestCaseId(null); setScriptRef(''); setLabels([]); };
  const submitSingle = async () => { if (!testCaseId) return; try { await props.onCreate({ testCaseId, scriptRef, runnerLabels: labels }); resetSingle(); } catch { /* parent displays the failure */ } };
  const submitBulk = async () => { try { await props.onBulkCreate({ testCases: selected, pattern, runnerLabels: bulkLabels }); setSelected([]); } catch { /* parent displays the failure */ } };
  let bulkExample = '';
  try { if (selected[0]) bulkExample = props.buildScriptRef(pattern, selected[0]); } catch { /* validation is shown on submit */ }

  const toggleSelected = (testCase: TestCase, checked: boolean) => setSelected((current) => checked
    ? [...current, testCase]
    : current.filter((item) => item.id !== testCase.id));

  const scriptCard = (script: AutomationScript) => {
    const testCase = props.testCases.find((item) => item.id === script.testCaseId);
    const evaluation = props.evaluateRunners(script.scriptRef, script.runnerLabels, props.runners, props.jobs);
    return <article key={script.id} className="surface-card border-1 surface-border border-round p-3">
      <b>{testCase ? `${testCase.code} — ${testCase.title}` : script.testCaseId}</b>
      <code className="block mt-2 text-color-secondary" style={{ overflowWrap: 'anywhere' }}>{script.scriptRef}</code>
      <div className="mt-3">{script.runnerLabels.length ? script.runnerLabels.map((label) => <Tag key={label} value={label} className="mr-1 mb-1" />) : <Tag value="Tanpa label" severity="secondary" />}</div>
      <small className="block mt-2 text-color-secondary">{evaluation.fileMatches.length ? `Runner: ${evaluation.fileMatches.map((runner) => runner.name).join(', ')}` : 'Tidak ada runner online dengan file ini'}</small>
      <div className="flex gap-2 mt-3 flex-wrap"><Button size="small" icon="pi pi-play" label="Run locally" onClick={() => props.onRun(script)} /><Button size="small" severity="danger" outlined icon="pi pi-trash" label="Hapus" onClick={() => props.onDelete(script)} /></div>
    </article>;
  };

  return <div className="flex flex-column gap-4">
    <section className="surface-ground border-round p-3">
      <div className="flex justify-content-between align-items-start gap-3 flex-wrap mb-3">
        <div><h3 className="m-0">Belum punya script</h3><p className="mt-1 mb-0 text-color-secondary">Prioritas pekerjaan mapping yang masih tersisa.</p></div>
        <Tag value={`${unmapped.length} Test Case`} severity={unmapped.length ? 'warning' : 'success'} />
      </div>
      {props.loading && !props.testCases.length ? <div className="surface-card border-1 surface-border border-round p-4 text-center" role="status"><b>Memuat Test Case dan mapping script</b><small className="block mt-2 text-color-secondary">Daftar pekerjaan yang belum dipetakan akan muncul di sini.</small></div> : lt.sm ? <div className="flex flex-column gap-2">
        {unmapped.map((testCase) => <label key={testCase.id} htmlFor={`mapping-${testCase.id}`} className="surface-card border-1 surface-border border-round p-3 flex gap-3 align-items-start cursor-pointer">
          <Checkbox inputId={`mapping-${testCase.id}`} checked={selected.some((item) => item.id === testCase.id)} onChange={(event) => toggleSelected(testCase, event.checked ?? false)} />
          <span><b className="block">{testCase.code}</b><span className="text-color-secondary">{testCase.title}</span></span>
        </label>)}
        {!unmapped.length && <div className="surface-card border-1 surface-border border-round p-4 text-center"><i className="pi pi-check-circle text-green-500 text-3xl" aria-hidden="true" /><h4 className="mb-1">Semua sudah dipetakan</h4><small className="text-color-secondary">Tidak ada Test Case yang menunggu mapping script.</small></div>}
      </div> : <DataTable value={unmapped} selection={selected} onSelectionChange={(event: DataTableSelectionMultipleChangeEvent<TestCase[]>) => setSelected(event.value)} dataKey="id" selectionMode="checkbox" size="small" loading={props.loading} emptyMessage="Semua Test Case sudah memiliki script">
        <Column selectionMode="multiple" style={{ width: '3rem' }} />
        <Column field="code" header="Kode" />
        <Column field="title" header="Test Case" />
      </DataTable>}
      <div className="flex gap-2 align-items-end flex-wrap mt-3">
        <span className="flex flex-column gap-1 flex-1"><label htmlFor="bulk-script-pattern">Pola nama file</label><InputText id="bulk-script-pattern" value={pattern} onChange={(event) => setPattern(event.target.value)} placeholder="tests/{code}.spec.ts" /></span>
        <Chips value={bulkLabels} onChange={(event) => setBulkLabels(event.value ?? [])} placeholder="Label runner (opsional)" />
        <Button label={`Petakan ${selected.length} pilihan`} icon="pi pi-link" disabled={!selected.length || !pattern.trim()} loading={props.saving} onClick={() => void submitBulk()} />
      </div>
      <small className="text-color-secondary">Placeholder: <code>{'{code}'}</code> untuk kode Test Case, <code>{'{slug}'}</code> untuk judul berbentuk slug.</small>
      {bulkExample && <div className="mt-2 text-color-secondary">Contoh: <code>{bulkExample}</code></div>}
    </section>

    <section>
      <h3 className="mt-0">Mapping satu Test Case</h3>
      <div className="flex gap-2 mb-2 flex-wrap align-items-end">
        <Dropdown value={testCaseId} options={unmapped.map((testCase) => ({ label: `${testCase.code} — ${testCase.title}`, value: testCase.id }))} onChange={(event) => setTestCaseId(event.value)} placeholder="Test Case" filter className="w-20rem" />
        <InputText value={scriptRef} onChange={(event) => setScriptRef(event.target.value)} placeholder="Referensi script, mis. tests/login.spec.ts" className="flex-1" />
        <Chips value={labels} onChange={(event) => setLabels(event.value ?? [])} placeholder="Label runner (opsional)" />
        <Button label="Petakan" icon="pi pi-link" onClick={() => void submitSingle()} loading={props.saving} disabled={!testCaseId || !scriptRef.trim()} />
      </div>
      {scriptRef.trim() && <Message severity={currentEvaluation.fileMatches.length ? 'success' : 'warn'} className="mb-3" text={currentEvaluation.fileMatches.length
        ? `File ditemukan dan label dipenuhi oleh: ${currentEvaluation.fileMatches.map((runner) => runner.name).join(', ')}`
        : currentEvaluation.labelMatches.length ? `Runner yang memenuhi label (${currentEvaluation.labelMatches.map((runner) => runner.name).join(', ')}) tidak memiliki file ini.` : 'Tidak ada runner online yang memenuhi label tersebut.'} />}
    </section>

    <section>
      <h3>Sudah dipetakan</h3>
      {lt.sm ? <div className="flex flex-column gap-2">
        {props.scripts.map(scriptCard)}
        {!props.loading && !props.scripts.length && <div className="surface-ground border-round p-4 text-center"><i className="pi pi-link text-primary text-3xl" aria-hidden="true" /><h4 className="mb-1">Belum ada mapping script</h4><small className="text-color-secondary">Petakan satu atau beberapa Test Case dari bagian di atas.</small></div>}
      </div> : <DataTable value={props.scripts} loading={props.loading} size="small" emptyMessage="Belum ada mapping script">
        <Column header="Test Case" body={(script: AutomationScript) => { const testCase = props.testCases.find((item) => item.id === script.testCaseId); return testCase ? `${testCase.code} — ${testCase.title}` : script.testCaseId; }} />
        <Column field="scriptRef" header="Script" />
        <Column header="Label & runner yang memenuhi" body={(script: AutomationScript) => { const evaluation = props.evaluateRunners(script.scriptRef, script.runnerLabels, props.runners, props.jobs); return <div>{script.runnerLabels.length ? script.runnerLabels.map((label) => <Tag key={label} value={label} className="mr-1" />) : <Tag value="Tanpa label" severity="secondary" />}<small className="block mt-1 text-color-secondary">{evaluation.fileMatches.length ? evaluation.fileMatches.map((runner) => runner.name).join(', ') : 'Tidak ada runner online dengan file ini'}</small></div>; }} />
        <Column header="Aksi" body={(script: AutomationScript) => <div className="flex gap-1"><Button text size="small" icon="pi pi-play" label="Run locally" onClick={() => props.onRun(script)} /><Button text size="small" severity="danger" icon="pi pi-trash" tooltip="Hapus mapping" onClick={() => props.onDelete(script)} /></div>} />
      </DataTable>}
    </section>
  </div>;
}
