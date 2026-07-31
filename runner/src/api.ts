import type { RunnerConfig } from './config.js';
import type { LocalRepositoryMetadata } from './localRepository.js';

// Shapes returned by the server RPCs in supabase/schema_024_p3_automation.sql.
export interface AutomationJob {
  id: string;
  test_run_id: string;
  test_case_id: string;
  test_case_code: string | null;
  test_case_title: string | null;
  script_ref: string;
  attempt: number;
  max_attempts: number;
  repository: JobRepository | null;
}

export interface JobRepository {
  id: string;
  source_type: 'local_path' | 'github_public' | 'github_private' | 'git_url';
  url_or_path: string;
  default_branch: string | null;
  subdirectory: string | null;
  token: string | null;
}

export type JobResult = 'pass' | 'fail' | 'blocked' | 'skip';

export interface ReportArtifact {
  type: 'screenshot' | 'video' | 'trace' | 'log';
  url: string;
  name?: string;
  // Set when the artifact was uploaded to Supabase Storage; the UI builds a
  // signed download URL from these. Absent for local-path fallback.
  path?: string;
  bucket?: string;
}

export interface ReportPayload {
  result: JobResult;
  retry?: boolean;
  notes?: string;
  error_message?: string;
  artifacts?: ReportArtifact[];
  repository?: LocalRepositoryMetadata;
}

export class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = 'ApiError';
  }
}

// The automation RPCs are granted to anon; the runner token in the body is the
// real credential. Outbound HTTPS only — the local machine never opens a port.
export class AutomationApi {
  constructor(private readonly config: RunnerConfig) {}

  private async rpc<T>(fn: string, params: Record<string, unknown>): Promise<T> {
    const res = await fetch(`${this.config.supabaseUrl}/rest/v1/rpc/${fn}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: this.config.supabaseAnonKey,
        Authorization: `Bearer ${this.config.supabaseAnonKey}`,
      },
      body: JSON.stringify(params),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new ApiError(`RPC ${fn} failed (${res.status}): ${text.slice(0, 300)}`, res.status);
    }
    return (await res.json()) as T;
  }

  heartbeat(): Promise<{ runner_id: string; active: boolean; last_seen_at: string }> {
    return this.rpc('heartbeat_automation_runner', { p_token: this.config.runnerToken });
  }

  async poll(): Promise<AutomationJob | null> {
    const data = await this.rpc<{ job: AutomationJob | null }>('poll_automation_job', {
      p_token: this.config.runnerToken,
    });
    return data.job ?? null;
  }

  report(jobId: string, payload: ReportPayload): Promise<{ job_id: string; status: string; requeued: boolean }> {
    return this.rpc('report_automation_job', {
      p_token: this.config.runnerToken,
      p_job_id: jobId,
      p_payload: payload,
    });
  }
}
