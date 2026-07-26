import { useState } from 'react';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { Message } from 'primereact/message';
import { Panel } from 'primereact/panel';
import { Tag } from 'primereact/tag';
import { useAiAssistant } from '../../hooks/useAiAssistant';

export function AiAssistantPanel() {
  const assistant = useAiAssistant();
  const [query, setQuery] = useState('');

  async function search() { await assistant.search(query); }

  return (
    <Panel header="AI Assistant — Project aktif" toggleable collapsed className="mb-3">
      <div className="flex gap-2 mb-3"><InputText className="flex-1" value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') void search(); }} placeholder="Cari test case, run, result, issue, requirement…" /><Button label="Cari" icon="pi pi-search" loading={assistant.loading} disabled={!query.trim() || !assistant.projectId} onClick={() => { void search(); }} /></div>
      {assistant.error && <Message severity="error" text={assistant.error} className="w-full mb-2" />}
      {assistant.result && <div className="flex flex-column gap-2"><p className="m-0">{assistant.result.answer}</p>{assistant.result.matches.length === 0 ? <small className="text-color-secondary">Tidak ada hasil pada project aktif.</small> : assistant.result.matches.map((match) => <div key={`${match.entityType}-${match.entityId}`} className="surface-100 border-round p-2"><div className="flex align-items-center gap-2"><Tag value={match.entityType} severity="info" /><span className="font-medium">{match.code ? `${match.code} — ` : ''}{match.title}</span></div><small className="text-color-secondary">{match.snippet}</small></div>)}</div>}
    </Panel>
  );
}
