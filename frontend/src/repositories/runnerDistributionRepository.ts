import type { RunnerRelease } from '../types/runnerDistribution';

export const runnerDistributionRepository = {
  async getRelease(): Promise<RunnerRelease> {
    const response = await fetch('/runner/release.json', { cache: 'no-store' });
    if (!response.ok) throw new Error('Rilis runner belum tersedia pada instance ini.');
    return response.json() as Promise<RunnerRelease>;
  },
};
