import { useMemo, useState } from 'react';
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
import type { AutomationArtifact, ScreenshotComparison, ViewableAutomationArtifact } from '../../types/domain';

const TAB_TYPES: Array<{ type: AutomationArtifact['type']; label: string; icon: string }> = [
  { type: 'screenshot', label: 'Screenshot', icon: 'pi pi-image' },
  { type: 'video', label: 'Video', icon: 'pi pi-video' },
  { type: 'trace', label: 'Trace', icon: 'pi pi-chart-line' },
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
      if (type === 'trace' && artifact.traceViewerUrl) {
        return <div key={key} className="border-1 surface-border border-round p-2">
          <div className="flex align-items-center justify-content-between flex-wrap gap-2 mb-2">
            <div className="font-medium">{artifact.name ?? `Playwright trace ${index + 1}`}</div>
            <div className="flex gap-2">
              <Button label="Buka Viewer" icon="pi pi-external-link" size="small" outlined onClick={() => window.open(artifact.traceViewerUrl!, '_blank', 'noopener,noreferrer')} />
              <Button label="Unduh Trace" icon="pi pi-download" size="small" text onClick={() => window.open(artifact.viewUrl!, '_blank', 'noopener,noreferrer')} />
            </div>
          </div>
          <iframe title={artifact.name ?? `Playwright trace ${index + 1}`} src={artifact.traceViewerUrl} className="w-full border-1 surface-border border-round" style={{ minHeight: '42rem' }} allow="clipboard-read; clipboard-write" />
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

function ScreenshotDiffViewer({ comparison }: { comparison: ScreenshotComparison | null }) {
  const [position, setPosition] = useState(50);
  if (!comparison) return <Message severity="info" text="Screenshot dari run sebelumnya untuk Test Case ini belum tersedia." className="w-full" />;

  const beforeScreenshots = comparison.before.artifacts.filter((artifact) => artifact.viewUrl);
  const afterScreenshots = comparison.after.artifacts.filter((artifact) => artifact.viewUrl);
  const pairs = afterScreenshots.map((after, index) => ({
    after,
    before: beforeScreenshots.find((artifact) => artifact.name && artifact.name === after.name) ?? beforeScreenshots[index],
  })).filter((pair) => pair.before);

  if (pairs.length === 0) return <Message severity="info" text="Tidak ada pasangan screenshot yang dapat dibandingkan." className="w-full" />;

  return <div className="flex flex-column gap-3">
    <div className="flex justify-content-between flex-wrap gap-2 text-sm text-color-secondary">
      <span><strong>Before:</strong> {comparison.before.runCode} — {comparison.before.runName}</span>
      <span><strong>After:</strong> {comparison.after.runCode} — {comparison.after.runName}</span>
    </div>
    <label className="flex align-items-center gap-3">
      <span>Before</span>
      <input type="range" min="0" max="100" value={position} onChange={(event) => setPosition(Number(event.target.value))} className="flex-1" aria-label="Posisi pembanding screenshot" />
      <span>After</span>
    </label>
    {pairs.map(({ before, after }, index) => <div key={`${after.path ?? after.url}-${index}`} className="border-1 surface-border border-round p-2">
      <div className="font-medium mb-2">{after.name ?? `Screenshot ${index + 1}`}</div>
      <div className="relative overflow-hidden border-round" style={{ lineHeight: 0 }}>
        <img src={after.viewUrl!} alt={`After ${after.name ?? index + 1}`} className="w-full h-auto" />
        <div className="absolute top-0 left-0 w-full h-full" style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}>
          <img src={before!.viewUrl!} alt={`Before ${before!.name ?? index + 1}`} className="w-full h-full" style={{ objectFit: 'fill' }} />
        </div>
        <div className="absolute top-0 h-full border-left-2 border-white" style={{ left: `${position}%` }} />
      </div>
    </div>)}
  </div>;
}

export function TestResultDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { result, artifacts, screenshotComparison, loading, error } = useTestResultDetail(id ?? null);
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
          <TabPanel header="Diff Screenshot" leftIcon="pi pi-clone mr-2">
            <ScreenshotDiffViewer comparison={screenshotComparison} />
          </TabPanel>
        </TabView>
      </Card>
    </>}
  </div>;
}
