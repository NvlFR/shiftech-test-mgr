import { supabase } from '../config/supabaseClient';
import { mapAutomationJobLogRow, mapAutomationJobRow, mapAutomationRunnerDiagnosticRow, mapAutomationRunnerHeartbeatRow, mapAutomationRunnerRow, mapAutomationScriptRow } from '../helpers/mappers';
import type {
  AutomationEnqueueResponse,
  AutomationJob,
  AutomationJobLog,
  AutomationLocalRunResponse,
  AutomationRunner,
  AutomationRunnerSecret,
  AutomationRunnerHeartbeat,
  AutomationScript,
} from '../types/domain';

// token_hash is intentionally excluded so it never reaches the browser.
const RUNNER_COLUMNS = 'id,project_id,name,labels,token_prefix,active,last_seen_at,created_by,created_at,updated_at';
const SCRIPT_COLUMNS = 'id,project_id,test_case_id,script_ref,runner_labels,created_by,created_at,updated_at';
const JOB_COLUMNS = 'id,project_id,test_run_id,test_case_id,script_ref,required_labels,status,attempt,max_attempts,browser,device_profile,pause_on_failure,runner_id,artifacts,error_message,queued_at,started_at,finished_at,created_by,created_at,updated_at';

export const automationRepository = {
  async listRunners(projectId: string): Promise<AutomationRunner[]> {
    const { data, error } = await supabase.from('automation_runners').select(RUNNER_COLUMNS).eq('project_id', projectId).order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []).map(mapAutomationRunnerRow);
  },

  async listRunnerHeartbeats(projectId: string): Promise<AutomationRunnerHeartbeat[]> {
    const { data, error } = await supabase.from('local_agent_heartbeats').select('credential_id,version,os,started_at,script_refs').eq('project_id', projectId).eq('credential_kind', 'runner').eq('process', 'runner');
    if (error) throw error;
    return (data ?? []).map(mapAutomationRunnerHeartbeatRow);
  },
  async listRunnerDiagnostics(projectId: string) {
    const { data, error } = await supabase.from('automation_runner_diagnostics').select('id,runner_id,status,base_url,result,error_message,requested_at,finished_at').eq('project_id', projectId).order('requested_at', { ascending: false }).limit(100);
    if (error) throw error;
    return (data ?? []).map(mapAutomationRunnerDiagnosticRow);
  },
  async enqueueRunnerDiagnostic(runnerId: string) {
    const { data, error } = await supabase.rpc('enqueue_runner_diagnostic', { p_runner_id: runnerId });
    if (error) throw error;
    return mapAutomationRunnerDiagnosticRow(data);
  },

  async createRunner(input: { projectId: string; name: string; labels: string[]; token: string }): Promise<AutomationRunnerSecret> {
    const { data, error } = await supabase.rpc('create_automation_runner', {
      p_project_id: input.projectId, p_name: input.name, p_labels: input.labels, p_token: input.token,
    });
    if (error) throw error;
    return { runner: mapAutomationRunnerRow(data.runner), token: data.token };
  },

  async rotateRunnerToken(id: string, token: string): Promise<AutomationRunnerSecret> {
    const { data, error } = await supabase.rpc('rotate_automation_runner_token', { p_runner_id: id, p_token: token });
    if (error) throw error;
    return { runner: mapAutomationRunnerRow(data.runner), token: data.token };
  },

  async setRunnerActive(id: string, active: boolean): Promise<AutomationRunner> {
    const { data, error } = await supabase.from('automation_runners').update({ active }).eq('id', id).select(RUNNER_COLUMNS).single();
    if (error) throw error;
    return mapAutomationRunnerRow(data);
  },

  async listScripts(projectId: string): Promise<AutomationScript[]> {
    const { data, error } = await supabase.from('automation_scripts').select(SCRIPT_COLUMNS).eq('project_id', projectId).order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []).map(mapAutomationScriptRow);
  },

  async createScript(input: { projectId: string; testCaseId: string; scriptRef: string; runnerLabels: string[]; createdBy: string }): Promise<AutomationScript> {
    const { data, error } = await supabase.from('automation_scripts').insert({
      project_id: input.projectId, test_case_id: input.testCaseId, script_ref: input.scriptRef,
      runner_labels: input.runnerLabels, created_by: input.createdBy,
    }).select(SCRIPT_COLUMNS).single();
    if (error) throw error;
    return mapAutomationScriptRow(data);
  },

  async createScripts(inputs: Array<{ projectId: string; testCaseId: string; scriptRef: string; runnerLabels: string[]; createdBy: string }>): Promise<AutomationScript[]> {
    const { data, error } = await supabase.from('automation_scripts').insert(inputs.map((input) => ({
      project_id: input.projectId, test_case_id: input.testCaseId, script_ref: input.scriptRef,
      runner_labels: input.runnerLabels, created_by: input.createdBy,
    }))).select(SCRIPT_COLUMNS);
    if (error) throw error;
    return (data ?? []).map(mapAutomationScriptRow);
  },

  async deleteScript(id: string): Promise<void> {
    const { error } = await supabase.from('automation_scripts').delete().eq('id', id);
    if (error) throw error;
  },

  async listJobs(projectId: string): Promise<AutomationJob[]> {
    const { data, error } = await supabase.from('automation_jobs').select(JOB_COLUMNS).eq('project_id', projectId).order('created_at', { ascending: false }).limit(200);
    if (error) throw error;
    const rows = data ?? [];
    if (!rows.length) return [];
    const runIds = Array.from(new Set(rows.map((row: any) => row.test_run_id)));
    const jobIds = rows.map((row: any) => row.id);
    const [{ data: runs, error: runsError }, { data: results, error: resultsError }, { data: logs, error: logsError }] = await Promise.all([
      supabase.from('test_runs').select('id,test_plan_id,environment_id').in('id', runIds),
      supabase.from('test_results').select('id,test_run_id,test_case_id').in('test_run_id', runIds),
      supabase.from('automation_job_logs').select('job_id,content,sequence,attempt').in('job_id', jobIds).order('attempt', { ascending: false }).order('sequence', { ascending: false }),
    ]);
    if (runsError) throw runsError;
    if (resultsError) throw resultsError;
    if (logsError) throw logsError;
    return rows.map((row: any) => {
      const run = runs?.find((item: any) => item.id === row.test_run_id);
      const result = results?.find((item: any) => item.test_run_id === row.test_run_id && item.test_case_id === row.test_case_id);
      const log = logs?.find((item: any) => item.job_id === row.id);
      return mapAutomationJobRow({ ...row, test_plan_id: run?.test_plan_id, environment_id: run?.environment_id, test_result_id: result?.id, current_step: log?.content?.trim() || null });
    });
  },

  async listQueuedJobProjectIds(): Promise<string[]> {
    const { data, error } = await supabase.from('automation_jobs').select('project_id').eq('status', 'queued');
    if (error) throw error;
    return (data ?? []).map((row: any) => row.project_id);
  },

  async listJobLogs(jobId: string): Promise<AutomationJobLog[]> {
    const { data, error } = await supabase.from('automation_job_logs').select('id,project_id,job_id,attempt,sequence,stream,content,created_at').eq('job_id', jobId).order('attempt').order('sequence');
    if (error) throw error;
    return (data ?? []).map(mapAutomationJobLogRow);
  },

  subscribeJobLogs(jobId: string, onInsert: (logEntry: AutomationJobLog) => void): () => void {
    const channel = supabase.channel(`automation-job-logs:${jobId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'automation_job_logs', filter: `job_id=eq.${jobId}` }, (payload) => onInsert(mapAutomationJobLogRow(payload.new)))
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  },

  async enqueue(input: { projectId: string; testPlanId: string; name?: string; environmentId?: string | null; maxAttempts: number; browser: string; deviceProfile?: string | null; pauseOnFailure: boolean }): Promise<AutomationEnqueueResponse> {
    const { data, error } = await supabase.rpc('enqueue_automation_jobs', {
      p_project_id: input.projectId, p_test_plan_id: input.testPlanId, p_name: input.name ?? null,
      p_environment_id: input.environmentId ?? null, p_max_attempts: input.maxAttempts,
      p_browser: input.browser, p_device_profile: input.deviceProfile ?? null,
      p_pause_on_failure: input.pauseOnFailure,
    });
    if (error) throw error;
    return { runId: data.run_id, runCode: data.run_code, jobCount: data.job_count };
  },

  async runLocally(input: { projectId: string; testPlanId: string; testCaseId: string; name?: string; browser: string; deviceProfile?: string | null; pauseOnFailure: boolean }): Promise<AutomationLocalRunResponse> {
    const { data, error } = await supabase.rpc('run_automation_test_case_locally', {
      p_project_id: input.projectId, p_test_plan_id: input.testPlanId, p_test_case_id: input.testCaseId,
      p_name: input.name ?? null, p_browser: input.browser, p_device_profile: input.deviceProfile ?? null,
      p_pause_on_failure: input.pauseOnFailure,
    });
    if (error) throw error;
    return { runId: data.run_id, runCode: data.run_code, jobId: data.job_id };
  },

  async cancelJob(id: string): Promise<void> {
    const { error } = await supabase.rpc('cancel_automation_job', { p_job_id: id });
    if (error) throw error;
  },

  async sendStepCommand(jobId: string, command: 'next' | 'continue'): Promise<void> {
    const { error } = await supabase.rpc('send_automation_job_command', { p_job_id: jobId, p_command: command });
    if (error) throw error;
  },

  // Artifacts live in a private bucket; project members read via a short-lived
  // signed URL (RLS on storage.objects gates access by project).
  async getArtifactSignedUrl(bucket: string, path: string): Promise<string> {
    const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 120);
    if (error) throw error;
    return data.signedUrl;
  },
};
