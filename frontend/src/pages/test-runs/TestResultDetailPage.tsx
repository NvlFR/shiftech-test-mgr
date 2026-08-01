import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from 'primereact/button';
import { Card } from 'primereact/card';
import { Message } from 'primereact/message';
import { ProgressSpinner } from 'primereact/progressspinner';
import { TabPanel, TabView } from 'primereact/tabview';
import { Tag } from 'primereact/tag';
import { Breadcrumb } from '../../components/ui/Breadcrumb';
import { TEST_RESULT_STATUS_LABEL, TEST_RESULT_STATUS_SEVERITY } from '../../helpers/statusLabels';
import { useTestResultDetail } from '../../hooks/useTestResultDetail';
import type { AutomationArtifact, ViewableAutomationArtifact } from '../../types/domain';

const TAB_TYPES: Array<{ type: AutomationArtifact['type']; label: string; icon: string }> = [
  { type: 'screenshot', label: 'Screenshot', icon: 'pi pi-image' },
  { type: 'video', label: 'Video', icon: 'pi pi-video' },
  { type: 'log', label: 'Console', icon: 'pi pi-align-left' },
  { type: 'network', label: 'Network', icon: 'pi pi-globe' },
  { type: 'dom', label: 'DOM', icon: 'pi pi-code' },
];

function displayText(artifact: ViewableAutomationArtifact): string {
  if (!artifact.textContent) return '';
  if (artifact.type !== 'network') return artifact.textContent;
  try {
    return JSON.stringify(JSON.parse(artifact.textContent), null, 2);
  } catch {
    return artifact.textContent;
  }
}

function EmptyEvidence() {
  return <Message severity="info" text="Bukti jenis ini tidak tersedia." className="w-full" />;
}

function EvidenceViewer({ type, artifacts }: { type: AutomationArtifact['type']; artifacts: ViewableAutomationArtifact[] }) {
  if (artifacts.length === 0) return <EmptyEvidence />;

  return <div className="flex flex-column gap-3">
    {artifacts.map((artifact, index) => {
      const key = `${artifact.path ?? artifact.url}-${index}`;
      if (type === 'screenshot' && artifact.viewUrl) {
        return <div key={key} className="border-1 surface-border border-round p-2">
          <div className="font-medium mb-2">{artifact.name ?? `Screenshot ${index + 1}`}</div>
          <img src={artifact.viewUrl} alt={artifact.name ?? `Bukti screenshot ${index + 1}`} className="w-full h-auto border-round" />
        </div>;
      }
      if (type === 'video' && artifact.viewUrl) {
        return <div key={key} className="border-1 surface-border border-round p-2">
          <div className="font-medium mb-2">{artifact.name ?? `Video ${index + 1}`}</div>
          <video src={artifact.viewUrl} controls preload="metadata" className="w-full border-round">Browser tidak mendukung pemutar video.</video>
        </div>;
      }
      if (type === 'dom' && artifact.textContent) {
        return <div key={key} className="border-1 surface-border border-round p-2">
          <div className="font-medium mb-2">{artifact.name ?? `DOM snapshot ${index + 1}`}</div>
          <iframe title={artifact.name ?? `DOM snapshot ${index + 1}`} srcDoc={artifact.textContent} sandbox="" className="w-full border-1 surface-border border-round" style={{ minHeight: '32rem' }} />
        </div>;
      }
      if ((type === 'log' || type === 'network') && artifact.textContent) {
        return <div key={key} className="border-1 surface-border border-round p-2">
          <div className="font-medium mb-2">{artifact.name ?? `${type === 'log' ? 'Console log' : 'Network log'} ${index + 1}`}</div>
          <pre className="m-0 p-3 surface-100 border-round overflow-auto white-space-pre-wrap text-sm" style={{ maxHeight: '36rem' }}>{displayText(artifact)}</pre>
        </div>;
      }
      return <Message key={key} severity="warn" text={`${artifact.name ?? 'Bukti'} tidak dapat dibuka dari aplikasi.`} className="w-full" />;
    })}
  </div>;
}

export function TestResultDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { result, artifacts, loading, error } = useTestResultDetail(id ?? null);
  const artifactsByType = useMemo(() => Object.fromEntries(TAB_TYPES.map(({ type }) => [type, artifacts.filter((artifact) => artifact.type === type)])), [artifacts]);

  return <div>
    <Breadcrumb items={[
      { label: 'Test Run', path: result ? `/test-runs/${result.testRunId}` : undefined },
      { label: result?.testCase.code ?? 'Test Result' },
    ]} />

    {loading && <div className="flex justify-content-center p-6"><ProgressSpinner /></div>}
    {error && <Message severity="error" text={error} className="w-full" />}
    {result && <>
      <Card title={`${result.testCase.code} — ${result.testCase.title}`} className="mb-3">
        <div className="flex align-items-center flex-wrap gap-3">
          <Tag value={TEST_RESULT_STATUS_LABEL[result.status]} severity={TEST_RESULT_STATUS_SEVERITY[result.status]} />
          <span className="text-color-secondary">Tester: {result.tester?.fullName ?? result.tester?.email ?? '-'}</span>
          <Button label="Kembali ke Test Run" icon="pi pi-arrow-left" size="small" text onClick={() => navigate(`/test-runs/${result.testRunId}`)} />
        </div>
        {result.notes && <p className="mb-0 white-space-pre-line">{result.notes}</p>}
      </Card>

      <Card title="Bukti Eksekusi">
        <TabView>
          {TAB_TYPES.map(({ type, label, icon }) => <TabPanel key={type} header={`${label} (${artifactsByType[type]?.length ?? 0})`} leftIcon={`${icon} mr-2`}>
            <EvidenceViewer type={type} artifacts={artifactsByType[type] ?? []} />
          </TabPanel>)}
        </TabView>
      </Card>
    </>}
  </div>;
}
