import { Card } from 'primereact/card';
import { Button } from 'primereact/button';
import { ProgressSpinner } from 'primereact/progressspinner';
import { Tag } from 'primereact/tag';
import { formatDateTime } from '../../helpers/dateFormatter';
import { useActivity } from '../../hooks/useActivity';

const TABLE_LABELS: Record<string, string> = { projects: 'Project', test_cases: 'Test Case', test_plans: 'Test Plan', test_runs: 'Test Run', test_results: 'Test Result', issues: 'Issue', comments: 'Komentar' };

function activityDetail(event: { action: string; oldData: Record<string, unknown> | null; newData: Record<string, unknown> | null }) {
  if (event.action !== 'updated') return null;
  const before = event.oldData?.status;
  const after = event.newData?.status;
  if (typeof before === 'string' && typeof after === 'string' && before !== after) {
    return `Status: ${before} → ${after}`;
  }
  return null;
}

export function ActivityPanel({ projectId }: { projectId: string }) {
  const { events, loading, error, reload } = useActivity(projectId);

  return <Card title="Activity" className="mb-3">
    {loading ? <div className="flex justify-content-center p-4"><ProgressSpinner style={{ width: '2rem', height: '2rem' }} /></div>
      : error ? <div className="flex align-items-center justify-content-between gap-3"><span className="text-red-500">Gagal memuat aktivitas: {error}</span><Button label="Coba lagi" icon="pi pi-refresh" text onClick={() => void reload()} /></div>
      : events.length === 0 ? <span className="text-color-secondary">Belum ada aktivitas.</span> : <div className="flex flex-column gap-3">
      {events.map((event) => <div key={event.id} className="flex align-items-center gap-2 border-bottom-1 surface-border pb-2">
        <i className={`pi ${event.action === 'created' ? 'pi-plus-circle text-green-500' : event.action === 'deleted' ? 'pi-trash text-red-500' : 'pi-pencil text-blue-500'}`} />
        <div className="flex-1"><div><span className="font-medium">{event.actorType === 'agent' ? 'AI Agent' : event.actorType === 'system' ? 'Sistem' : (event.actor?.fullName ?? event.actor?.email ?? 'User')}</span>{' '}{event.action === 'created' ? 'membuat' : event.action === 'deleted' ? 'menghapus' : 'memperbarui'} <span className="font-medium">{TABLE_LABELS[event.tableName] ?? event.tableName}</span>{event.actorType === 'agent' && <Tag value="AGENT" severity="info" className="ml-2" />}</div>{activityDetail(event) && <small className="text-color-secondary">{activityDetail(event)}</small>}</div>
        <Tag value={formatDateTime(event.createdAt)} severity="secondary" />
      </div>)}
    </div>}
  </Card>;
}
