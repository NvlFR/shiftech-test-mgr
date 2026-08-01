import { testResultRepository } from '../repositories/testResultRepository';
import type { AutomationArtifact, ScreenshotComparison, TestResultWithDetails, ViewableAutomationArtifact } from '../types/domain';

const TEXT_ARTIFACT_TYPES = new Set<AutomationArtifact['type']>(['log', 'network', 'dom']);
const TRACE_VIEWER_URL = import.meta.env.VITE_PLAYWRIGHT_TRACE_VIEWER_URL || 'https://trace.playwright.dev/';

function buildTraceViewerUrl(traceUrl: string): string {
  const viewerUrl = new URL(TRACE_VIEWER_URL, window.location.origin);
  viewerUrl.searchParams.set('trace', traceUrl);
  return viewerUrl.toString();
}

export const testResultService = {
  getById(id: string) {
    if (!id) throw new Error('Test Result tidak valid');
    return testResultRepository.findById(id);
  },

  async prepareArtifacts(artifacts: AutomationArtifact[]): Promise<ViewableAutomationArtifact[]> {
    return Promise.all(artifacts.map(async (artifact) => {
      let viewUrl: string | null = null;
      let textContent: string | null = null;
      let traceViewerUrl: string | null = null;

      try {
        if (TEXT_ARTIFACT_TYPES.has(artifact.type)) {
          textContent = await testResultRepository.getArtifactText(artifact);
        } else if (artifact.bucket && artifact.path) {
          viewUrl = await testResultRepository.getArtifactSignedUrl(artifact.bucket, artifact.path);
        } else if (/^https?:\/\//.test(artifact.url)) {
          viewUrl = artifact.url;
        }
        if (artifact.type === 'trace' && viewUrl) {
          traceViewerUrl = buildTraceViewerUrl(viewUrl);
        }
      } catch {
        // Keep the remaining evidence viewable when one artifact is missing or expired.
      }

      return { ...artifact, viewUrl, textContent, traceViewerUrl };
    }));
  },

  async getScreenshotComparison(result: TestResultWithDetails): Promise<ScreenshotComparison | null> {
    const currentScreenshots = result.automationArtifacts.filter((artifact) => artifact.type === 'screenshot');
    if (currentScreenshots.length === 0) return null;

    const history = await testResultRepository.findScreenshotHistory(result.testCaseId);
    const currentIndex = history.findIndex((entry) => entry.testResultId === result.id);
    const previous = currentIndex >= 0 ? history.slice(currentIndex + 1)[0] : undefined;
    const current = history.find((entry) => entry.testResultId === result.id);
    if (!previous || !current) return null;

    const [beforeArtifacts, afterArtifacts] = await Promise.all([
      this.prepareArtifacts(previous.artifacts),
      this.prepareArtifacts(currentScreenshots),
    ]);
    if (!beforeArtifacts.some((artifact) => artifact.viewUrl) || !afterArtifacts.some((artifact) => artifact.viewUrl)) return null;
    return {
      before: { ...previous, artifacts: beforeArtifacts },
      after: { ...current, artifacts: afterArtifacts },
    };
  },
};
