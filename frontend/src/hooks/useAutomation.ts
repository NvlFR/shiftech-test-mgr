import { useCallback, useEffect, useState } from 'react';
import { automationService, buildBulkScriptRef, getEligibleScriptRunners } from '../services/automationService';
import { testResultService } from '../services/testResultService';
import type { AutomationJob, AutomationRunner, AutomationRunnerDiagnostic, AutomationScript, AutomationStepCommand, TestCase } from '../types/domain';
import type { AutomationBrowser } from '../types/domain';

export function useAutomation(projectId: string | null) {
  const [runners, setRunners] = useState<AutomationRunner[]>([]);
  const [scripts, setScripts] = useState<AutomationScript[]>([]);
  const [jobs, setJobs] = useState<AutomationJob[]>([]);
  const [diagnostics, setDiagnostics] = useState<AutomationRunnerDiagnostic[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!projectId) { setRunners([]); setScripts([]); setJobs([]); return; }
    setLoading(true); setError(null);
    try {
      const [r, s, j, d] = await Promise.all([
        automationService.listRunners(projectId),
        automationService.listScripts(projectId),
        automationService.listJobs(projectId),
        automationService.listRunnerDiagnostics(projectId),
      ]);
      setRunners(r); setScripts(s); setJobs(j); setDiagnostics(d);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat automation');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void reload();
    const timer = window.setInterval(() => void reload(), 15_000);
    return () => window.clearInterval(timer);
  }, [reload]);
  const runLocally = useCallback(async (input: { testPlanId: string; testCaseId: string; name?: string; browser: AutomationBrowser; deviceProfile?: string | null; pauseOnFailure?: boolean }) => {
    if (!projectId) throw new Error('Project wajib dipilih');
    const result = await automationService.runLocally({ projectId, ...input });
    await reload();
    return result;
  }, [projectId, reload]);

  const sendStepCommand = useCallback(async (jobId: string, command: AutomationStepCommand) => {
    await automationService.sendStepCommand(jobId, command);
  }, []);

  const retryJob = useCallback(async (testResultId: string) => {
    const result = await testResultService.retryAutomation(testResultId);
    await reload();
    return result;
  }, [reload]);

  const createScript = useCallback(async (input: { testCaseId: string; scriptRef: string; runnerLabels: string[]; createdBy: string }) => {
    if (!projectId) throw new Error('Project wajib dipilih');
    const result = await automationService.createScript({ projectId, ...input });
    await reload();
    return result;
  }, [projectId, reload]);

  const createScriptsBulk = useCallback(async (input: { testCases: TestCase[]; pattern: string; runnerLabels: string[]; createdBy: string }) => {
    if (!projectId) throw new Error('Project wajib dipilih');
    const result = await automationService.createScriptsBulk({ projectId, ...input });
    await reload();
    return result;
  }, [projectId, reload]);

  const deleteScript = useCallback(async (scriptId: string) => {
    await automationService.deleteScript(scriptId);
    await reload();
  }, [reload]);
  const testRunnerConnection = useCallback(async (runnerId: string) => {
    const result = await automationService.enqueueRunnerDiagnostic(runnerId);
    await reload(); return result;
  }, [reload]);

  return {
    runners, scripts, jobs, diagnostics, loading, error, reload, runLocally, sendStepCommand, retryJob, testRunnerConnection,
    createScript, createScriptsBulk, deleteScript,
    buildScriptRef: buildBulkScriptRef,
    evaluateScriptRunners: getEligibleScriptRunners,
  };
}
