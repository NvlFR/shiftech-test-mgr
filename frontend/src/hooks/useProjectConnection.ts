import { useEffect, useState } from 'react';
import {
  projectConnectionService,
  type ProjectConnectionConfig,
  type McpFeatureGroupId,
} from '../services/projectConnectionService';
import type { AutomationRunner } from '../types/domain';
import type { CreatedApiToken } from '../types/domain';

export function useProjectConnection(projectId: string | undefined) {
  const [config, setConfig] = useState<ProjectConnectionConfig | null>(null);
  const [loading, setLoading] = useState(Boolean(projectId));
  const [error, setError] = useState<string | null>(null);
  const [runnerBootstrap, setRunnerBootstrap] = useState<Awaited<ReturnType<typeof projectConnectionService.issueRunnerBootstrap>> | null>(null);
  const [connectedRunner, setConnectedRunner] = useState<AutomationRunner | null>(null);
  const [issuingRunnerBootstrap, setIssuingRunnerBootstrap] = useState(false);
  const [runnerBootstrapError, setRunnerBootstrapError] = useState<string | null>(null);
  const [oneTimeToken, setOneTimeToken] = useState<CreatedApiToken | null>(null);
  const [tokenActionPending, setTokenActionPending] = useState(false);
  const [tokenActionError, setTokenActionError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setConfig(null);
    setError(null);

    if (!projectId) {
      setLoading(false);
      return () => { active = false; };
    }

    setLoading(true);
    projectConnectionService.getConfig(projectId, window.location.origin)
      .then((result) => {
        if (active) setConfig(result);
      })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : 'Gagal memuat konfigurasi koneksi');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [projectId]);

  useEffect(() => {
    if (!projectId || !runnerBootstrap || connectedRunner) return;
    let active = true;
    const poll = async () => {
      try {
        const runner = await projectConnectionService.detectConnectedRunner(projectId, runnerBootstrap.existingRunnerIds);
        if (active && runner) setConnectedRunner(runner);
      } catch (cause) {
        if (active) setRunnerBootstrapError(cause instanceof Error ? cause.message : 'Gagal memeriksa heartbeat runner');
      }
    };
    void poll();
    const interval = window.setInterval(() => void poll(), 2_000);
    return () => { active = false; window.clearInterval(interval); };
  }, [connectedRunner, projectId, runnerBootstrap]);

  const issueRunnerBootstrap = async () => {
    if (!projectId || !config) return;
    setIssuingRunnerBootstrap(true);
    setRunnerBootstrapError(null);
    setConnectedRunner(null);
    try {
      setRunnerBootstrap(await projectConnectionService.issueRunnerBootstrap(projectId, config.projectName, window.location.origin));
    } catch (cause) {
      setRunnerBootstrapError(cause instanceof Error ? cause.message : 'Gagal membuat bootstrap code runner');
    } finally {
      setIssuingRunnerBootstrap(false);
    }
  };

  const setReadOnly = (readOnly: boolean) => {
    setConfig((current) => current
      ? projectConnectionService.setReadOnly(current, readOnly)
      : current);
  };

  const setFeatureGroups = (featureGroups: McpFeatureGroupId[]) => {
    setConfig((current) => current
      ? projectConnectionService.setFeatureGroups(current, featureGroups)
      : current);
  };

  const setSelectedSkills = (selectedSkills: string[]) => {
    setConfig((current) => current
      ? projectConnectionService.setSelectedSkills(current, selectedSkills)
      : current);
  };

  const createToken = async (name: string) => {
    if (!projectId || !config) return;
    setTokenActionPending(true);
    setTokenActionError(null);
    try {
      const created = await projectConnectionService.createToken(projectId, name, config.mcp);
      setOneTimeToken(created);
      setConfig((current) => current ? { ...current, activeTokens: [created, ...current.activeTokens] } : current);
    } catch (cause) {
      setTokenActionError(cause instanceof Error ? cause.message : 'Gagal membuat token');
    } finally {
      setTokenActionPending(false);
    }
  };

  const revokeToken = async (tokenId: string) => {
    setTokenActionPending(true);
    setTokenActionError(null);
    try {
      await projectConnectionService.revokeToken(tokenId);
      setConfig((current) => current ? { ...current, activeTokens: current.activeTokens.filter(({ id }) => id !== tokenId) } : current);
      setOneTimeToken((current) => current?.id === tokenId ? null : current);
    } catch (cause) {
      setTokenActionError(cause instanceof Error ? cause.message : 'Gagal mencabut token');
    } finally {
      setTokenActionPending(false);
    }
  };

  return { config, loading, error, setReadOnly, setFeatureGroups, setSelectedSkills, runnerBootstrap, connectedRunner, issuingRunnerBootstrap, runnerBootstrapError, issueRunnerBootstrap, oneTimeToken, dismissOneTimeToken: () => setOneTimeToken(null), tokenActionPending, tokenActionError, createToken, revokeToken };
}
