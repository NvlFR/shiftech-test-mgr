import { Card } from 'primereact/card';
import { Message } from 'primereact/message';
import { ProgressSpinner } from 'primereact/progressspinner';
import { PageHeader } from '../../components/ui/PageHeader';
import { useRunnerDistribution } from '../../hooks/useRunnerDistribution';
import { runnerDistributionService } from '../../services/runnerDistributionService';

export function RunnerDistributionPage() {
  const { release, loading, error } = useRunnerDistribution();
  const origin = window.location.origin;

  return (
    <main className="surface-ground min-h-screen p-4 md:p-6">
      <div className="mx-auto" style={{ maxWidth: '60rem' }}>
        <PageHeader title="TestManager Local Runner" />
        <Card>
          {loading && <div className="flex justify-content-center"><ProgressSpinner /></div>}
          {error && <Message severity="warn" text={error} className="w-full" />}
          {release && (
            <div className="flex flex-column gap-4">
              <p className="m-0 line-height-3">Pasang runner dari instance self-hosted ini menggunakan Node.js {release.minimumNodeVersion} atau lebih baru.</p>
              <div>
                <label className="font-semibold block mb-2">Perintah instalasi</label>
                <pre className="surface-100 border-round p-3 overflow-x-auto m-0"><code>{runnerDistributionService.installCommand(release, origin)}</code></pre>
              </div>
              <div>
                <label className="font-semibold block mb-2">SHA256</label>
                <pre className="surface-100 border-round p-3 overflow-x-auto m-0"><code>{release.sha256}</code></pre>
              </div>
              <div className="flex flex-wrap gap-3">
                <a href={release.url} download={release.filename}>Unduh tarball v{release.version}</a>
                <a href={release.checksumUrl} download={release.checksumFilename}>Unduh checksum</a>
              </div>
              <small className="text-color-secondary">Ukuran {(release.size / 1024).toFixed(1)} KiB · dibuat {new Date(release.generatedAt).toLocaleString('id-ID')}</small>
            </div>
          )}
        </Card>
      </div>
    </main>
  );
}
