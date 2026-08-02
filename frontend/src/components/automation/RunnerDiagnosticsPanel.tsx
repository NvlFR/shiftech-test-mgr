import { Button } from 'primereact/button';
import { Message } from 'primereact/message';
import { Tag } from 'primereact/tag';
import { formatRelativeTime } from '../../helpers/relativeTime';
import { AUTOMATION_SERVER_VERSION, isRunnerVersionOutdated } from '../../services/automationService';
import type { AutomationRunner, AutomationRunnerDiagnostic } from '../../types/domain';

function Check({ label, value, detail }: { label: string; value: boolean | null; detail?: string }) {
  return <div className="flex justify-content-between gap-2 align-items-center"><span>{label}{detail && <small className="block text-color-secondary">{detail}</small>}</span><Tag value={value == null ? 'Belum dicek' : value ? 'OK' : 'Gagal'} severity={value == null ? 'secondary' : value ? 'success' : 'danger'} /></div>;
}

export function RunnerDiagnosticsPanel({ runner, diagnostic, testing, onTest }: { runner: AutomationRunner; diagnostic: AutomationRunnerDiagnostic | null; testing: boolean; onTest: () => void }) {
  const pending = diagnostic?.status === 'queued' || diagnostic?.status === 'running';
  const outdated = isRunnerVersionOutdated(runner.version);
  const diskDetail = diagnostic?.diskFreeBytes == null ? undefined : `${(diagnostic.diskFreeBytes / 1024 ** 3).toFixed(1)} GB tersedia`;
  return <div className="border-top-1 surface-border pt-3 flex flex-column gap-3">
    <div className="flex justify-content-between align-items-center gap-2"><b>Diagnostik</b><Button label="Uji koneksi" icon="pi pi-bolt" size="small" outlined loading={testing || pending} disabled={!runner.active || pending} onClick={onTest} /></div>
    {outdated && <Message severity="warn" text={`Runner ${runner.version} tertinggal dari server ${AUTOMATION_SERVER_VERSION}. Perbarui paket @testmanager/runner.`} />}
    {diagnostic ? <>
      <small className="text-color-secondary">Pemeriksaan terakhir {formatRelativeTime(diagnostic.finishedAt ?? diagnostic.requestedAt)} · {diagnostic.status === 'queued' ? 'menunggu runner' : diagnostic.status === 'running' ? 'sedang diperiksa' : diagnostic.status === 'passed' ? 'jalur end-to-end berhasil' : 'ditemukan masalah'}</small>
      <Check label="Base URL terjangkau" value={diagnostic.baseUrlReachable} detail={diagnostic.baseUrl ?? 'Environment belum memiliki Base URL'} />
      <Check label="Browser Playwright terpasang" value={diagnostic.browserInstalled} />
      <Check label="Versi Playwright" value={diagnostic.playwrightVersion == null ? null : true} detail={diagnostic.playwrightVersion ?? undefined} />
      <Check label="Ruang disk" value={diagnostic.diskFreeBytes == null ? null : diagnostic.diskFreeBytes > 1024 ** 3} detail={diskDetail} />
      {diagnostic.baseUrlReachable === false && <Message severity="error" text="Base URL tidak dapat dijangkau dari mesin runner. Periksa URL environment, DNS, VPN, firewall, dan apakah aplikasi sedang berjalan." />}
      {diagnostic.browserInstalled === false && <Message severity="error" text="Browser Playwright belum tersedia. Jalankan npx playwright install pada workspace runner." />}
      {diagnostic.diskFreeBytes != null && diagnostic.diskFreeBytes <= 1024 ** 3 && <Message severity="warn" text="Ruang disk kurang dari 1 GB. Hapus artifact/cache lama sebelum menjalankan automation." />}
      {diagnostic.errorMessage && <Message severity="error" text={diagnostic.errorMessage} />}
    </> : <small className="text-color-secondary">Belum ada sanity check. Uji koneksi mengirim job no-op ke runner dan memeriksa jalur end-to-end.</small>}
  </div>;
}
