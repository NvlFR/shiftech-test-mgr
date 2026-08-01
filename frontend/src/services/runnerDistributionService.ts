import { runnerDistributionRepository } from '../repositories/runnerDistributionRepository';
import type { RunnerRelease } from '../types/runnerDistribution';

function isSha256(value: string): boolean {
  return /^[a-f0-9]{64}$/.test(value);
}

export const runnerDistributionService = {
  async getRelease(): Promise<RunnerRelease> {
    const release = await runnerDistributionRepository.getRelease();
    if (!release.version || !release.url.startsWith('/runner/') || !isSha256(release.sha256)) {
      throw new Error('Metadata rilis runner pada instance ini tidak valid.');
    }
    return release;
  },

  installCommand(release: RunnerRelease, origin: string): string {
    return `npm i -g ${origin}${release.url}`;
  },
};
