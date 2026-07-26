import { Button } from 'primereact/button';
import { Message } from 'primereact/message';
import { Panel } from 'primereact/panel';
import { Tag } from 'primereact/tag';
import type { AiRiskLevel, AiTestRunAnalysisResponse } from '../../types/aiTestRunAnalysis';
import type { TestRunSummary } from '../../types/domain';

interface TestRunAnalysisPanelProps {
  summary: TestRunSummary;
  analysis: AiTestRunAnalysisResponse | null;
  loading: boolean;
  error: string | null;
  canAnalyze: boolean;
  onAnalyze: () => void | Promise<unknown>;
}

const riskSeverity: Record<AiRiskLevel, 'success' | 'info' | 'warning' | 'danger'> = {
  low: 'success',
  medium: 'info',
  high: 'warning',
  critical: 'danger',
};

const riskLabel: Record<AiRiskLevel, string> = {
  low: 'Rendah',
  medium: 'Sedang',
  high: 'Tinggi',
  critical: 'Kritis',
};

function StatusMetric({ label, value, severity }: { label: string; value: number; severity: 'success' | 'danger' | 'warning' | 'info' }) {
  return (
    <div className="surface-100 border-round p-3 flex flex-column gap-1">
      <span className="text-color-secondary text-sm">{label}</span>
      <Tag value={String(value)} severity={severity} className="align-self-start" />
    </div>
  );
}

export function TestRunAnalysisPanel({ summary, analysis, loading, error, canAnalyze, onAnalyze }: TestRunAnalysisPanelProps) {
  const displaySummary = analysis?.summary ?? summary;

  return (
    <Panel header="Analisis AI Test Run" toggleable className="mb-4">
      <div className="flex align-items-start justify-content-between gap-3 flex-wrap mb-3">
        <p className="m-0 text-color-secondary text-sm" style={{ maxWidth: '48rem' }}>
          Analisis ini hanya menghasilkan rekomendasi untuk ditinjau. AI tidak mengubah status Test Result atau Test Run.
        </p>
        <Button
          label={analysis ? 'Buat Analisis Ulang' : 'Analisis dengan AI'}
          icon={loading ? 'pi pi-spin pi-spinner' : 'pi pi-sparkles'}
          size="small"
          outlined
          onClick={() => void onAnalyze()}
          disabled={!canAnalyze || loading}
        />
      </div>

      {error && <Message severity="error" text={error} className="mb-3 w-full" />}

      <div className="grid mb-2">
        <div className="col-6 md:col-3"><StatusMetric label="PASS" value={displaySummary.pass} severity="success" /></div>
        <div className="col-6 md:col-3"><StatusMetric label="FAIL" value={displaySummary.fail} severity="danger" /></div>
        <div className="col-6 md:col-3"><StatusMetric label="SKIP" value={displaySummary.skip} severity="warning" /></div>
        <div className="col-6 md:col-3"><StatusMetric label="BLOCKED" value={displaySummary.blocked} severity="danger" /></div>
        <div className="col-6 md:col-3"><StatusMetric label="NOT RUN" value={displaySummary.notRun} severity="info" /></div>
        <div className="col-6 md:col-3"><StatusMetric label="Dieksekusi" value={displaySummary.executed} severity="info" /></div>
        <div className="col-6 md:col-3"><StatusMetric label="Total" value={displaySummary.total} severity="info" /></div>
        <div className="col-6 md:col-3"><StatusMetric label="Progress" value={displaySummary.progressPercent} severity="success" /></div>
      </div>

      {!analysis && !loading && !error && (
        <p className="m-0 text-color-secondary text-sm">Klik tombol analisis untuk meminta ringkasan regression dan rekomendasi retest dari gateway AI.</p>
      )}

      {analysis && (
        <div className="flex flex-column gap-4">
          <div>
            <div className="flex align-items-center gap-2 mb-2">
              <h3 className="m-0 text-lg">Ringkasan Regression</h3>
              <Tag value={analysis.reviewStatus === 'draft' ? 'Draft' : 'Perlu Review'} severity="warning" />
            </div>
            <p className="m-0 white-space-pre-line">{analysis.regressionSummary}</p>
          </div>

          <div>
            <h3 className="m-0 text-lg mb-2">Pola Failure</h3>
            {analysis.failurePatterns.length === 0 ? (
              <p className="m-0 text-color-secondary text-sm">Belum ada pola failure yang teridentifikasi.</p>
            ) : (
              <div className="flex flex-column gap-2">
                {analysis.failurePatterns.map((pattern) => (
                  <div key={`${pattern.pattern}-${pattern.occurrences}`} className="surface-100 border-round p-3">
                    <div className="flex align-items-center gap-2 flex-wrap mb-1">
                      <span className="font-medium">{pattern.pattern}</span>
                      <Tag value={riskLabel[pattern.severity]} severity={riskSeverity[pattern.severity]} />
                      <span className="text-color-secondary text-sm">{pattern.occurrences} kejadian</span>
                    </div>
                    <p className="m-0 text-sm">{pattern.evidence}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <h3 className="m-0 text-lg mb-2">Area Risiko</h3>
            {analysis.riskAreas.length === 0 ? (
              <p className="m-0 text-color-secondary text-sm">Belum ada area risiko yang teridentifikasi.</p>
            ) : (
              <div className="flex flex-column gap-2">
                {analysis.riskAreas.map((area) => (
                  <div key={`${area.area}-${area.riskLevel}`} className="surface-100 border-round p-3">
                    <div className="flex align-items-center gap-2 flex-wrap mb-1">
                      <span className="font-medium">{area.area}</span>
                      <Tag value={riskLabel[area.riskLevel]} severity={riskSeverity[area.riskLevel]} />
                    </div>
                    <p className="m-0 text-sm">{area.rationale}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <h3 className="m-0 text-lg mb-2">Rekomendasi Retest</h3>
            {analysis.retestRecommendations.length === 0 ? (
              <p className="m-0 text-color-secondary text-sm">Belum ada rekomendasi retest.</p>
            ) : (
              <div className="flex flex-column gap-2">
                {analysis.retestRecommendations.map((recommendation) => (
                  <div key={recommendation.testCaseId} className="surface-100 border-round p-3">
                    <div className="flex align-items-center gap-2 flex-wrap mb-1">
                      <span className="font-medium">{recommendation.testCaseCode} — {recommendation.title}</span>
                      <Tag value={recommendation.priority.toUpperCase()} severity={recommendation.priority === 'critical' || recommendation.priority === 'high' ? 'danger' : 'info'} />
                      <span className="text-color-secondary text-sm">Confidence {Math.round(recommendation.confidence * 100)}%</span>
                    </div>
                    <p className="m-0 text-sm mb-1">{recommendation.reason}</p>
                    <span className="text-color-secondary text-sm">Scope: {recommendation.suggestedScope}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <small className="text-color-secondary">
            Provider: {analysis.provider} · Model: {analysis.model} · Prompt: {analysis.promptVersion} · Hasil ini tetap draft dan wajib ditinjau.
          </small>
        </div>
      )}
    </Panel>
  );
}
