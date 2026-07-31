import { Card } from 'primereact/card';
import { Tag } from 'primereact/tag';
import { formatDateTime } from '../../helpers/dateFormatter';
import { useActivity } from '../../hooks/useActivity';

const TABLE_LABELS: Record<string, string> = { projects: 'Project', test_cases: 'Test Case', test_plans: 'Test Plan', test_runs: 'Test Run', test_results: 'Test Result', issues: 'Issue', comments: 'Komentar' };

export function ActivityPanel({ projectId }: { projectId: string }) {
  const { events } = useActivity(projectId);

  return <Card title="Activity" className="mb-3">
    {events.length === 0 ? <span className="text-color-secondary">Belum ada aktivitas.</span> : <div className="flex flex-column gap-3">
      {events.map((event) => <div key={event.id} className="flex align-items-center gap-2 border-bottom-1 surface-border pb-2">
        <i className={`pi ${event.action === 'created' ? 'pi-plus-circle text-green-500' : event.action === 'deleted' ? 'pi-trash text-red-500' : 'pi-pencil text-blue-500'}`} />
        <div className="flex-1"><span className="font-medium">{event.actor?.fullName ?? event.actor?.email ?? 'User'}</span>{' '}{event.action === 'created' ? 'membuat' : event.action === 'deleted' ? 'menghapus' : 'memperbarui'} <span className="font-medium">{TABLE_LABELS[event.tableName] ?? event.tableName}</span></div>
        <Tag value={formatDateTime(event.createdAt)} severity="secondary" />
      </div>)}
    </div>}
  </Card>;
}
