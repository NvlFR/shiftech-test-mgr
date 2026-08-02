import { Button } from 'primereact/button';
import { Card } from 'primereact/card';
import { Tag } from 'primereact/tag';
import { formatDurationSince, formatRelativeTime } from '../../helpers/relativeTime';
import type { RunnerReadableStatus } from '../../services/automationService';
import type { AutomationRunner } from '../../types/domain';
import type { AutomationRunnerDiagnostic } from '../../types/domain';
import { RunnerDiagnosticsPanel } from './RunnerDiagnosticsPanel';

const statusPresentation = {
  online: { label: 'Online', severity: 'success' as const },
  idle: { label: 'Idle', severity: 'info' as const },
  busy: { label: 'Sibuk', severity: 'warning' as const },
  offline: { label: 'Offline', severity: 'secondary' as const },
};

export function RunnerCard({ runner, status, diagnostic, testing, canManage, onRotate, onRevoke, onTestConnection }: { runner: AutomationRunner; status: RunnerReadableStatus; diagnostic: AutomationRunnerDiagnostic | null; testing: boolean; canManage: boolean; onRotate: () => void; onRevoke: () => void; onTestConnection: () => void }) {
  const presentation = statusPresentation[status];
  return <Card className="h-full" title={<div className="flex justify-content-between align-items-center gap-2"><span>{runner.name}</span><Tag value={presentation.label} severity={presentation.severity} /></div>}>
    <div className="flex flex-column gap-3">
      <small className="text-color-secondary">Heartbeat {formatRelativeTime(runner.lastSeenAt)}</small>
      <div><b>Label</b><div className="mt-1">{runner.labels.length ? runner.labels.map((label) => <Tag key={label} value={label} className="mr-1 mb-1" />) : <span className="text-color-secondary">Tidak ada</span>}</div></div>
      <div className="grid text-sm">
        <div className="col-6"><span className="text-color-secondary">Versi</span><br />{runner.version ?? 'Belum dilaporkan'}</div>
        <div className="col-6"><span className="text-color-secondary">OS</span><br />{runner.os ?? 'Belum dilaporkan'}</div>
        <div className="col-6"><span className="text-color-secondary">Browser tersedia</span><br />{runner.browsers.length ? runner.browsers.join(', ') : 'Belum terdeteksi'}</div>
        <div className="col-6"><span className="text-color-secondary">Uptime</span><br />{formatDurationSince(runner.startedAt)}</div>
      </div>
      <div><span className="text-color-secondary text-sm">Job terakhir</span><br />{runner.lastJob ? <span><Tag value={runner.lastJob.status} className="mr-2" />{runner.lastJob.browser} · {formatRelativeTime(runner.lastJob.finishedAt ?? runner.lastJob.startedAt ?? runner.lastJob.queuedAt)}</span> : 'Belum ada job'}</div>
      <RunnerDiagnosticsPanel runner={runner} diagnostic={diagnostic} testing={testing} onTest={onTestConnection} />
      {canManage && <div className="flex gap-2 pt-2 border-top-1 surface-border">
        <Button label="Rotate token" icon="pi pi-refresh" size="small" outlined onClick={onRotate} />
        <Button label="Revoke token" icon="pi pi-ban" size="small" severity="danger" outlined disabled={!runner.active} onClick={onRevoke} />
      </div>}
    </div>
  </Card>;
}
