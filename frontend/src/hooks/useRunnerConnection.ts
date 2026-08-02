import { useEffect, useState } from 'react';
import { projectConnectionService } from '../services/projectConnectionService';
import type { AutomationRunner } from '../types/domain';

export function useRunnerConnection(projectId: string | undefined, projectName: string) {
  const [bootstrap, setBootstrap] = useState<Awaited<ReturnType<typeof projectConnectionService.issueRunnerBootstrap>> | null>(null);
  const [connectedRunner, setConnectedRunner] = useState<AutomationRunner | null>(null);
  const [issuing, setIssuing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId || !bootstrap || connectedRunner) return;
    let active = true;
    const poll = async () => {
      try {
        const runner = await projectConnectionService.detectConnectedRunner(projectId, bootstrap.existingRunnerIds);
        if (active && runner) setConnectedRunner(runner);
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : 'Gagal memeriksa heartbeat runner');
      }
    };
    void poll();
    const interval = window.setInterval(() => void poll(), 2_000);
    return () => { active = false; window.clearInterval(interval); };
  }, [bootstrap, connectedRunner, projectId]);

  async function issue(name: string, labels: string[]) {
    if (!projectId) return false;
    setIssuing(true); setError(null); setConnectedRunner(null);
    try { setBootstrap(await projectConnectionService.issueRunnerBootstrap(projectId, projectName, name, labels)); return true; }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Gagal membuat bootstrap code runner'); return false; }
    finally { setIssuing(false); }
  }

  function reset() { setBootstrap(null); setConnectedRunner(null); setError(null); }
  return { bootstrap, connectedRunner, issuing, error, issue, reset };
}
