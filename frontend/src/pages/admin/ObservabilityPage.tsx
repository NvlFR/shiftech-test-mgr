import { useState } from 'react';
import { Button } from 'primereact/button';
import { Card } from 'primereact/card';
import { Column } from 'primereact/column';
import { DataTable } from 'primereact/datatable';
import { Dropdown } from 'primereact/dropdown';
import { InputSwitch } from 'primereact/inputswitch';
import { Message } from 'primereact/message';
import { Tag } from 'primereact/tag';
import { PageHeader } from '../../components/ui/PageHeader';
import { SearchInput } from '../../components/ui/SearchInput';
import { FilterToolbar } from '../../components/ui/FilterToolbar';
import { dataTablePaginatorProps } from '../../components/ui/dataTablePaginator';
import { formatDateTime } from '../../helpers/dateFormatter';
import { useObservability } from '../../hooks/useObservability';
import type { OperationalErrorLog, OperationalHealthStatus, OperationalSource } from '../../types/domain';

const SOURCES = [{ label: 'Semua sumber', value: undefined }, { label: 'Worker', value: 'worker' }, { label: 'Queue', value: 'queue' }, { label: 'Storage', value: 'storage' }, { label: 'Integrasi', value: 'integration' }];
const HEALTH_SEVERITY: Record<OperationalHealthStatus, 'success' | 'warning' | 'danger'> = { healthy: 'success', warning: 'warning', down: 'danger' };

export function ObservabilityPage() {
  const [source, setSource] = useState<OperationalSource | undefined>();
  const [search, setSearch] = useState('');
  const [unresolvedOnly, setUnresolvedOnly] = useState(false);
  const { health, logs, loading, error, reload } = useObservability({ source, search, unresolvedOnly });
  return <div>
    <PageHeader title="Observability & Monitoring" actions={<Button label="Periksa ulang" icon="pi pi-refresh" loading={loading} onClick={() => void reload()} />} />
    {error && <Message severity="error" text={error} className="w-full mb-3" />}
    <div className="grid mb-3">
      {health?.components.map((item) => <div key={item.name} className="col-12 sm:col-6 xl:col-3"><Card title={item.label}><div className="flex align-items-center justify-content-between gap-2"><span>{item.summary}</span><Tag value={item.status.toUpperCase()} severity={HEALTH_SEVERITY[item.status]} /></div></Card></div>)}
    </div>
    <h3>Log Error</h3>
    <FilterToolbar>
      <Dropdown value={source} options={SOURCES} onChange={(event) => setSource(event.value)} className="col-12 md:col-3" />
      <SearchInput value={search} onChange={setSearch} placeholder="Cari pesan, kode, atau resource..." className="col-12 md:col" />
      <label className="flex align-items-center gap-2"><InputSwitch checked={unresolvedOnly} onChange={(event) => setUnresolvedOnly(Boolean(event.value))} />Belum selesai</label>
    </FilterToolbar>
    <DataTable value={logs} loading={loading} {...dataTablePaginatorProps} rows={20} rowsPerPageOptions={[20, 50, 100]} dataKey="id" emptyMessage="Tidak ada error operasional">
      <Column field="occurredAt" header="Waktu" body={(row: OperationalErrorLog) => formatDateTime(row.occurredAt)} sortable />
      <Column field="source" header="Sumber" body={(row: OperationalErrorLog) => <Tag value={row.source} />} sortable />
      <Column field="severity" header="Severity" body={(row: OperationalErrorLog) => <Tag value={row.severity} severity={row.severity === 'warning' ? 'warning' : 'danger'} />} sortable />
      <Column field="code" header="Kode" />
      <Column field="message" header="Pesan" />
      <Column header="Resource" body={(row: OperationalErrorLog) => row.resourceType && row.resourceId ? `${row.resourceType}: ${row.resourceId}` : '-'} />
    </DataTable>
  </div>;
}
