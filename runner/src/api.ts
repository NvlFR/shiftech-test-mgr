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
  headed?: boolean;
  slow_mo_ms?: number | null;
  browser?: 'chromium' | 'firefox' | 'webkit';
  device_profile?: string | null;
  pause_on_failure?: boolean;
  base_url?: string | null;
  build_version?: string | null;
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
export type JobLogStream = 'stdout' | 'stderr' | 'system';
export type StepCommand = 'next' | 'continue';
export interface AutomationJobCommand { id: number; command: StepCommand; requested_at: string; }

export interface EnvironmentMetadata {
  browser: 'chromium' | 'firefox' | 'webkit';
  browserVersion: string;
  os: string;
  viewport: { width: number; height: number };
  baseUrl: string | null;
  buildVersion: string | null;
  commitSha: string | null;
}

export interface ReportArtifact {
  type: 'screenshot' | 'video' | 'trace' | 'log' | 'network' | 'dom';
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
  environment?: EnvironmentMetadata;
}

export interface CodegenTestCase {
  id: string;
  code: string;
  title: string;
  script_ref: string | null;
  steps: CodegenTestCaseStep[];
}

export interface CodegenTestCaseStep {
  step_number: number;
  action: string;
  expected_result: string | null;
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

  appendLog(jobId: string, attempt: number, sequence: number, stream: JobLogStream, content: string): Promise<{ job_id: string; sequence: number }> {
    return this.rpc('append_automation_job_log', {
      p_token: this.config.runnerToken,
      p_job_id: jobId,
      p_attempt: attempt,
      p_sequence: sequence,
      p_stream: stream,
      p_content: content,
    });
  }

  async pollCommands(jobId: string): Promise<AutomationJobCommand[]> {
    const data = await this.rpc<{ commands: AutomationJobCommand[] }>('poll_automation_job_commands', {
      p_token: this.config.runnerToken,
      p_job_id: jobId,
    });
    return data.commands ?? [];
  }

  listCodegenTestCases(): Promise<CodegenTestCase[]> {
    return this.rpc('list_runner_codegen_test_cases', { p_token: this.config.runnerToken });
  }

  attachCodegenScript(testCaseId: string, scriptRef: string): Promise<{ test_case_id: string; script_ref: string }> {
    return this.rpc('attach_runner_codegen_script', {
      p_token: this.config.runnerToken,
      p_test_case_id: testCaseId,
      p_script_ref: scriptRef,
    });
  }
}
