import { testResultRepository } from '../repositories/testResultRepository';
import type { AutomationArtifact, ViewableAutomationArtifact } from '../types/domain';

const TEXT_ARTIFACT_TYPES = new Set<AutomationArtifact['type']>(['log', 'network', 'dom']);

export const testResultService = {
  getById(id: string) {
    if (!id) throw new Error('Test Result tidak valid');
    return testResultRepository.findById(id);
  },

  async prepareArtifacts(artifacts: AutomationArtifact[]): Promise<ViewableAutomationArtifact[]> {
    return Promise.all(artifacts.map(async (artifact) => {
      let viewUrl: string | null = null;
      let textContent: string | null = null;

      try {
        if (TEXT_ARTIFACT_TYPES.has(artifact.type)) {
          textContent = await testResultRepository.getArtifactText(artifact);
        } else if (artifact.bucket && artifact.path) {
          viewUrl = await testResultRepository.getArtifactSignedUrl(artifact.bucket, artifact.path);
        } else if (/^https?:\/\//.test(artifact.url)) {
          viewUrl = artifact.url;
        }
      } catch {
        // Keep the remaining evidence viewable when one artifact is missing or expired.
      }

      return { ...artifact, viewUrl, textContent };
    }));
  },
};
