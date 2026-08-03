import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from 'primereact/button';
import { Card } from 'primereact/card';
import { Checkbox } from 'primereact/checkbox';
import { Dropdown } from 'primereact/dropdown';
import { InputSwitch } from 'primereact/inputswitch';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { Message } from 'primereact/message';
import { MultiSelect } from 'primereact/multiselect';
import { Panel } from 'primereact/panel';
import { TabPanel, TabView } from 'primereact/tabview';
import { Tag } from 'primereact/tag';
import { Breadcrumb } from '../../components/ui/Breadcrumb';
import { PageHeader } from '../../components/ui/PageHeader';
import { useProjectConnection } from '../../hooks/useProjectConnection';
import { formatDateTime } from '../../helpers/dateFormatter';
import { RunnerConnectionWizard } from '../../components/automation/RunnerConnectionWizard';
import { SKILLS_CATALOG } from '../../services/projectConnectionService';

const DISABLED_MODES = [
  { name: 'API Token', reason: 'Belum tersedia pada tahap 1' },
  { name: 'Webhook', reason: 'Menunggu dukungan event koneksi' },
  { name: 'CI/CD', reason: 'Dikonfigurasi melalui integrasi project' },
  { name: 'Runner', reason: 'Menunggu alur bootstrap runner' },
] as const;

export function ProjectConnectPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { config, loading, error, setReadOnly, setFeatureGroups, setSelectedSkills, oneTimeToken, dismissOneTimeToken, tokenActionPending, tokenActionError, createToken, revokeToken } = useProjectConnection(id);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [clipboardFallback, setClipboardFallback] = useState<string | null>(null);
  const [tokenName, setTokenName] = useState('Claude Code');
  const [runnerWizardVisible, setRunnerWizardVisible] = useState(false);

  async function copyCommands(id: string, content: string) {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard API unavailable');
      await navigator.clipboard.writeText(content);
      setClipboardFallback(null);
      setCopiedId(id);
      window.setTimeout(() => setCopiedId((current) => current === id ? null : current), 1500);
    } catch {
      setCopiedId(null);
      setClipboardFallback(content);
    }
  }

  if (loading) return <p>Memuat konfigurasi koneksi...</p>;
  if (error) return <Message severity="error" text={error} />;
  if (!config) return <Message severity="warn" text="Project tidak ditemukan." />;

  return (
    <div className="page-fade-in">
      <Breadcrumb items={[
        { label: 'Projects', path: '/' },
        { label: config.projectName, path: `/projects/${config.projectId}` },
        { label: 'Connect Agent' },
      ]} />

      <PageHeader
        title="Connect Agent"
        actions={<Button label="Kembali ke project" icon="pi pi-arrow-left" severity="secondary" outlined size="small" onClick={() => navigate(`/projects/${config.projectId}`)} />}
      />

      <div className="surface-card border-round p-3 mb-3 flex align-items-center gap-3">
        <i className={`pi ${config.lastMcpUsedAt ? 'pi-check-circle text-green-500' : 'pi-info-circle text-primary'} text-2xl`} aria-hidden="true" />
        <div>
          <div className="font-medium">{config.lastMcpUsedAt ? 'Project sudah terhubung lewat MCP' : 'Belum ada penggunaan MCP'}</div>
          <div className="text-sm text-color-secondary mt-1">
            {config.lastMcpUsedAt
              ? `Terakhir dipakai ${formatDateTime(config.lastMcpUsedAt)}.`
              : 'Mulai dari langkah Setup Claude Code di bawah. Setelah agent memakai satu tool, status penggunaan terakhir akan muncul di sini.'}
          </div>
        </div>
      </div>

      {clipboardFallback && (
        <Message
          severity="warn"
          className="mb-3 w-full"
          content={(
            <div className="w-full">
              <div className="font-medium mb-1">Browser memblokir akses clipboard</div>
              <div className="text-sm mb-2">Pilih teks di bawah lalu salin manual dengan Ctrl/Cmd+C.</div>
              <InputTextarea
                value={clipboardFallback}
                readOnly
                autoResize
                rows={3}
                className="w-full font-family-monospace"
                aria-label="Teks untuk disalin manual"
                autoFocus
                onFocus={(event) => event.currentTarget.select()}
              />
              <Button label="Tutup" icon="pi pi-times" text size="small" className="mt-2" onClick={() => setClipboardFallback(null)} />
            </div>
          )}
        />
      )}

      <Card>
        <TabView activeIndex={0}>
          <TabPanel header="MCP (aktif)">
            <div className="flex flex-column gap-3">
              <div className="grid">
                <div className="col-12 md:col-6">
                  <label htmlFor="mcp-client" className="block font-medium mb-2">Client</label>
                  <Dropdown
                    inputId="mcp-client"
                    value={config.mcp.clientId}
                    options={config.mcp.clients}
                    optionLabel="name"
                    optionValue="id"
                    optionDisabled="disabled"
                    className="w-full"
                    itemTemplate={(option) => (
                      <div className="flex align-items-center justify-content-between gap-3 w-full">
                        <span>{option.name}</span>
                        {option.disabled && <Tag value="segera" severity="secondary" />}
                      </div>
                    )}
                    aria-label="Pilih client MCP"
                  />
                  <small className="text-color-secondary">Tahap 1 hanya mendukung Claude Code.</small>
                </div>
                <div className="col-12 md:col-6">
                  <div className="flex align-items-center justify-content-between gap-3 surface-ground border-round p-3 h-full">
                    <div>
                      <label htmlFor="mcp-read-only" className="block font-medium">Mode read-only</label>
                      <small className="text-color-secondary">Menonaktifkan seluruh tool tulis.</small>
                      <div className="mt-2">
                        <code className="text-color">{config.mcp.readonlyEnvironment}</code>
                      </div>
                    </div>
                    <InputSwitch
                      inputId="mcp-read-only"
                      checked={config.mcp.readOnly}
                      onChange={(event) => setReadOnly(event.value)}
                      aria-label="Aktifkan mode read-only"
                    />
                  </div>
                </div>
              </div>
              <div>
                <label htmlFor="mcp-feature-groups" className="block font-medium mb-2">Feature groups</label>
                <MultiSelect
                  inputId="mcp-feature-groups"
                  value={config.mcp.selectedFeatureGroups}
                  options={config.mcp.featureGroups}
                  optionLabel="label"
                  optionValue="id"
                  display="chip"
                  onChange={(event) => setFeatureGroups(event.value)}
                  placeholder="Pilih grup tool"
                  className="w-full"
                  aria-label="Pilih feature groups MCP"
                />
                <small className="text-color-secondary">
                  AUTOMATION dan REPO tidak aktif secara default karena lebih berat dan berisiko.
                </small>
              </div>
              <Message
                severity={config.mcp.exceedsToolCountWarning ? 'warn' : 'info'}
                text={`${config.mcp.availableToolCount} tool akan aktif${config.mcp.exceedsToolCountWarning ? ` — melewati ambang ${config.mcp.toolCountWarningThreshold}; context agent dapat membengkak.` : '.'}`}
              />
              {!config.mcp.readOnly && (
                <Message severity="warn" text="Read-only dimatikan. Agent dapat membuat dan mengubah data project sesuai feature group serta scope token yang dipilih." />
              )}
              <Panel header={`Preview tool (${config.mcp.availableToolCount})`} toggleable collapsed>
                {config.mcp.activeToolNames.length === 0
                  ? <p className="m-0 text-color-secondary">Tidak ada tool yang dipilih.</p>
                  : (
                    <ul className="m-0 pl-3">
                      {config.mcp.activeToolNames.map((toolName) => <li key={toolName}><code>{toolName}</code></li>)}
                    </ul>
                  )}
              </Panel>
              <Panel header="Agent Skills">
                <p className="mt-0 mb-3 text-color-secondary">
                  Pilih skill yang akan ikut dipasang bersama perintah instalasi di Langkah 3.
                  Centang semua untuk paket lengkap, atau hanya skill yang relevan untuk tim kamu.
                </p>
                <div className="flex flex-column gap-3">
                  {SKILLS_CATALOG.map((skill) => {
                    const isChecked = config.selectedSkills.includes(skill.id);
                    const toggleSkill = () => {
                      const next = isChecked
                        ? config.selectedSkills.filter((s) => s !== skill.id)
                        : [...config.selectedSkills, skill.id];
                      setSelectedSkills(next);
                    };
                    return (
                      <div
                        key={skill.id}
                        className={`flex align-items-start gap-3 border-round p-3 cursor-pointer surface-ground ${isChecked ? 'border-1 border-primary' : ''}`}
                        onClick={toggleSkill}
                        role="checkbox"
                        aria-checked={isChecked}
                        tabIndex={0}
                        onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); toggleSkill(); } }}
                      >
                        <Checkbox
                          inputId={`skill-${skill.id}`}
                          checked={isChecked}
                          onChange={toggleSkill}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <div className="min-w-0">
                          <label htmlFor={`skill-${skill.id}`} className="font-medium block cursor-pointer" onClick={(e) => e.stopPropagation()}>
                            <code>{skill.name}</code>
                          </label>
                          <p className="m-0 mt-1 text-sm text-color-secondary">{skill.description}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {config.selectedSkills.length === 0 && (
                  <Message className="mt-3 w-full" severity="warn" text="Tidak ada skill dipilih — perintah instalasi akan memasang semua skill." />
                )}
              </Panel>
              <Panel
                header="Setup Claude Code"
                headerTemplate={(options) => (
                  <div className={`${options.className} flex align-items-center justify-content-between gap-2 w-full`}>
                    <span className="font-semibold">Setup Claude Code</span>
                    <Button
                      label={copiedId === 'all' ? 'Tersalin' : 'Copy semua'}
                      icon={copiedId === 'all' ? 'pi pi-check' : 'pi pi-copy'}
                      size="small"
                      outlined
                      onClick={() => void copyCommands('all', config.setupSteps.map((step) => step.command).join('\n\n'))}
                    />
                  </div>
                )}
              >
                <div className="flex flex-column gap-4">
                  {config.setupSteps.map((step, index) => (
                    <section key={step.id} aria-labelledby={`setup-step-${step.id}`}>
                      <div className="flex align-items-start justify-content-between gap-3 mb-2">
                        <div className="flex align-items-start gap-2 min-w-0">
                          <Tag value={String(index + 1)} rounded />
                          <div>
                            <div className="flex align-items-center gap-2 flex-wrap">
                              <h3 id={`setup-step-${step.id}`} className="m-0 text-base">{step.title}</h3>
                              {step.optional && <Tag value="opsional" severity="secondary" />}
                            </div>
                            <p className="m-0 mt-1 text-color-secondary">{step.description}</p>
                          </div>
                        </div>
                        <Button
                          label={copiedId === step.id ? 'Tersalin' : 'Copy'}
                          icon={copiedId === step.id ? 'pi pi-check' : 'pi pi-copy'}
                          size="small"
                          text
                          onClick={() => void copyCommands(step.id, step.command)}
                        />
                      </div>
                      <pre
                        className="surface-ground border-round p-3 m-0"
                        style={{ overflowX: 'auto', maxWidth: '100%', whiteSpace: 'pre' }}
                        tabIndex={0}
                      ><code>{step.command}</code></pre>
                      {step.note && <Message className="mt-2 w-full" severity="warn" text={step.note} />}
                    </section>
                  ))}
                </div>
              </Panel>
              <Panel header="Token koneksi">
                <Message severity="warn" className="mb-3" text="Jangan tempel token ke perintah. Simpan token di environment variable TM_API_TOKEN agar tidak masuk shell history atau screenshot." />
                <div className="flex flex-column md:flex-row gap-2 mb-3">
                  <InputText value={tokenName} onChange={(event) => setTokenName(event.target.value)} placeholder="Nama token" maxLength={100} className="flex-1" aria-label="Nama token koneksi" />
                  <Button label="Buat token" icon="pi pi-key" loading={tokenActionPending} disabled={!tokenName.trim()} onClick={() => void createToken(tokenName)} />
                </div>
                {tokenActionError && <Message severity="error" className="mb-3" text={tokenActionError} />}
                {oneTimeToken && (
                  <div className="border-1 border-yellow-500 border-round p-3 mb-3">
                    <Message severity="warn" className="mb-2" text="Token hanya ditampilkan sekali. Salin sekarang, simpan di secret manager, lalu tutup panel ini. Jangan masukkan token langsung ke string perintah." />
                    <pre className="surface-ground border-round p-3 m-0 mb-2" style={{ overflowX: 'auto', whiteSpace: 'pre' }} tabIndex={0}><code>{oneTimeToken.token}</code></pre>
                    <div className="flex gap-2 flex-wrap">
                      <Button label={copiedId === 'one-time-token' ? 'Tersalin' : 'Copy token'} icon="pi pi-copy" size="small" onClick={() => void copyCommands('one-time-token', oneTimeToken.token)} />
                      <Button label="Sudah disimpan" severity="secondary" outlined size="small" onClick={dismissOneTimeToken} />
                    </div>
                  </div>
                )}
                <div className="surface-ground border-round p-3 mb-3">
                  <div className="font-medium mb-2">Contoh penggunaan aman</div>
                  <pre className="surface-card border-round p-3 m-0" style={{ overflowX: 'auto', whiteSpace: 'pre' }} tabIndex={0}><code>{'export TM_API_TOKEN="$(security-tool read testmanager)"\nclaude /mcp'}</code></pre>
                  <small className="text-color-secondary">Ganti <code>security-tool</code> dengan secret manager yang digunakan tim. String perintah tidak memuat nilai token.</small>
                </div>
                <h3 className="text-base mt-0">Token aktif</h3>
                {config.activeTokens.length === 0 ? (
                  <div className="surface-ground border-round p-3 flex gap-3 align-items-start">
                    <i className="pi pi-key text-primary text-xl" aria-hidden="true" />
                    <div>
                      <div className="font-medium">Belum ada token koneksi aktif</div>
                      <p className="text-color-secondary mt-1 mb-0">Buat token bernama sesuai agent atau perangkat agar mudah dikenali dan dicabut nanti. Token hanya ditampilkan sekali.</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-column gap-2">
                    {config.activeTokens.map((token) => (
                      <div key={token.id} className="surface-ground border-round p-3 flex align-items-start justify-content-between gap-3 flex-wrap">
                        <div>
                          <div className="font-medium">{token.name} <code className="ml-1">{token.tokenPrefix}…</code></div>
                          <div className="text-sm text-color-secondary mt-1">Dibuat {formatDateTime(token.createdAt)} · Kedaluwarsa {token.expiresAt ? formatDateTime(token.expiresAt) : 'belum ditetapkan'}</div>
                          <div className="text-sm text-color-secondary">Terakhir dipakai: {token.lastUsedAt ? formatDateTime(token.lastUsedAt) : 'belum pernah'}</div>
                        </div>
                        <Button label="Cabut" icon="pi pi-ban" severity="danger" outlined size="small" loading={tokenActionPending} onClick={() => { if (window.confirm(`Cabut token ${token.name}? Agent yang memakainya akan langsung kehilangan akses.`)) void revokeToken(token.id); }} />
                      </div>
                    ))}
                  </div>
                )}
              </Panel>
              <Panel header="Prompt starter">
                <p className="mt-0 text-color-secondary">
                  Prompt siap pakai dengan konteks project, module, dan environment yang tersedia.
                </p>
                <div className="flex flex-column gap-3">
                  {config.prompts.map((item) => (
                    <article key={item.id} className="surface-ground border-round p-3" aria-labelledby={`prompt-${item.id}`}>
                      <div className="flex align-items-start justify-content-between gap-3 mb-2">
                        <div className="min-w-0">
                          <Tag value={item.category} severity="info" className="mb-2" />
                          <h3 id={`prompt-${item.id}`} className="m-0 text-base">{item.title}</h3>
                          <p className="m-0 mt-1 text-color-secondary">{item.description}</p>
                        </div>
                        {item.requiresBootstrapCode ? <Button
                          label="Hubungkan Runner"
                          icon="pi pi-link"
                          size="small"
                          outlined
                          onClick={() => setRunnerWizardVisible(true)}
                        /> : <Button
                          label={copiedId === `prompt-${item.id}` ? 'Tersalin' : 'Copy prompt'}
                          icon={copiedId === `prompt-${item.id}` ? 'pi pi-check' : 'pi pi-copy'}
                          size="small"
                          outlined
                          onClick={() => void copyCommands(`prompt-${item.id}`, item.prompt)}
                        />}
                      </div>
                      {item.id === 'connect-runner' ? (
                        <p className="m-0 text-color-secondary">Wizard yang sama dengan tab Runner memandu nama, label kapabilitas, bootstrap code, instalasi, dan konfirmasi koneksi.</p>
                      ) : <pre
                        className="surface-card border-round p-3 m-0"
                        style={{ overflowX: 'auto', maxWidth: '100%', whiteSpace: 'pre-wrap' }}
                        tabIndex={0}
                      ><code>{item.prompt}</code></pre>}
                    </article>
                  ))}
                </div>
              </Panel>
              <div className="grid">
                <div className="col-12 md:col-6">
                  <div className="surface-ground border-round p-3 h-full">
                    <div className="text-sm text-color-secondary mb-1">Project</div>
                    <div className="font-medium">{config.projectName}</div>
                  </div>
                </div>
                <div className="col-12 md:col-6">
                  <div className="surface-ground border-round p-3 h-full">
                    <div className="text-sm text-color-secondary mb-1">Project ID</div>
                    <code className="text-color break-all">{config.projectId}</code>
                  </div>
                </div>
                <div className="col-12">
                  <div className="surface-ground border-round p-3">
                    <div className="text-sm text-color-secondary mb-1">Project URL</div>
                    <code className="text-color break-all">{config.projectUrl}</code>
                  </div>
                </div>
              </div>
            </div>
          </TabPanel>
          {DISABLED_MODES.map((mode) => (
            <TabPanel key={mode.name} header={`${mode.name} — ${mode.reason}`} disabled />
          ))}
        </TabView>
      </Card>
      <RunnerConnectionWizard projectId={config.projectId} projectName={config.projectName} visible={runnerWizardVisible} onHide={() => setRunnerWizardVisible(false)} />
    </div>
  );
}
