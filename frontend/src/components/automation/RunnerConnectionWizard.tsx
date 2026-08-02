import { useState } from 'react';
import { Button } from 'primereact/button';
import { Chips } from 'primereact/chips';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { Message } from 'primereact/message';
import { TabPanel, TabView } from 'primereact/tabview';
import { useRunnerConnection } from '../../hooks/useRunnerConnection';

interface Props { projectId?: string; projectName: string; visible: boolean; onHide: () => void; onConnected?: () => void }

export function RunnerConnectionWizard({ projectId, projectName, visible, onHide, onConnected }: Props) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState('Local Runner');
  const [labels, setLabels] = useState<string[]>([]);
  const [copied, setCopied] = useState<string | null>(null);
  const { bootstrap, connectedRunner, issuing, error, issue, reset } = useRunnerConnection(projectId, projectName);

  async function copy(id: string, value: string) { await navigator.clipboard.writeText(value); setCopied(id); window.setTimeout(() => setCopied(null), 1500); }
  async function createBootstrap() { if (await issue(name, labels)) setStep(2); }
  function close() { reset(); setStep(0); onHide(); if (connectedRunner) onConnected?.(); }

  return <Dialog header="Hubungkan Runner" visible={visible} onHide={close} style={{ width: 'min(46rem, 95vw)' }}>
    <div className="flex gap-2 mb-4" aria-label={`Langkah ${step + 1} dari 4`}>
      {['Nama', 'Kapabilitas', 'Instalasi', 'Koneksi'].map((label, index) => <span key={label} className={`flex-1 text-center border-round p-2 ${index <= step ? 'bg-primary text-primary-color' : 'surface-ground text-color-secondary'}`}>{index + 1}. {label}</span>)}
    </div>
    {step === 0 && <div className="flex flex-column gap-3"><p className="mt-0">Beri nama yang mudah dikenali, misalnya berdasarkan mesin atau tim.</p><label htmlFor="wizard-runner-name">Nama runner</label><InputText id="wizard-runner-name" value={name} maxLength={120} onChange={(event) => setName(event.target.value)} autoFocus /><Button label="Lanjut" icon="pi pi-arrow-right" iconPos="right" disabled={!name.trim()} onClick={() => setStep(1)} /></div>}
    {step === 1 && <div className="flex flex-column gap-3"><p className="mt-0">Tambahkan label kapabilitas agar job dapat diarahkan ke runner yang cocok, misalnya <code>chromium</code>, <code>staging</code>, atau <code>linux</code>.</p><label htmlFor="wizard-runner-labels">Label kapabilitas</label><Chips id="wizard-runner-labels" value={labels} onChange={(event) => setLabels(event.value ?? [])} separator="," placeholder="Ketik label lalu Enter" /><div className="flex justify-content-between"><Button label="Kembali" text onClick={() => setStep(0)} /><Button label="Buat bootstrap code" icon="pi pi-key" loading={issuing} onClick={() => void createBootstrap()} /></div></div>}
    {step === 2 && bootstrap && <div className="flex flex-column gap-3"><Message severity="warn" text="Bootstrap code hanya berlaku singkat dan sekali pakai. Token runner permanen dibuat di mesin lokal dan tidak pernah ditampilkan di browser." /><TabView><TabPanel header="npm"><pre className="surface-ground border-round p-3 overflow-auto"><code>{bootstrap.npmCommands}</code></pre><Button label={copied === 'npm' ? 'Tersalin' : 'Salin perintah npm'} icon="pi pi-copy" onClick={() => void copy('npm', bootstrap.npmCommands)} /></TabPanel><TabPanel header="Docker"><pre className="surface-ground border-round p-3 overflow-auto"><code>{bootstrap.dockerCommands}</code></pre><Button label={copied === 'docker' ? 'Tersalin' : 'Salin perintah Docker'} icon="pi pi-copy" onClick={() => void copy('docker', bootstrap.dockerCommands)} /></TabPanel></TabView><small className="text-color-secondary">Kode kedaluwarsa {new Date(bootstrap.expiresAt).toLocaleString('id-ID')}.</small><Button label="Saya sudah menjalankan perintah" icon="pi pi-arrow-right" iconPos="right" onClick={() => setStep(3)} /></div>}
    {step === 3 && <div className="text-center p-4">{connectedRunner ? <><i className="pi pi-check-circle text-green-500 text-5xl" /><h3>Runner terhubung</h3><p>{connectedRunner.name} siap menerima job untuk {projectName}.</p><Button label="Selesai" onClick={close} /></> : <><i className="pi pi-spin pi-spinner text-primary text-4xl" /><h3>Menunggu heartbeat pertama</h3><p className="text-color-secondary">Tidak perlu refresh. Halaman memeriksa koneksi runner secara otomatis.</p></>}</div>}
    {error && <Message className="mt-3" severity="error" text={error} />}
  </Dialog>;
}
