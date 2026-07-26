import { supabase } from '../config/supabaseClient';
import { mapAutomationJobRow, mapAutomationRunnerRow, mapAutomationScriptRow } from '../helpers/mappers';
import type {
  AutomationEnqueueResponse,
  AutomationJob,
  AutomationRunner,
  AutomationRunnerSecret,
  AutomationScript,
} from '../types/domain';

// token_hash is intentionally excluded so it never reaches the browser.
const RUNNER_COLUMNS = 'id,project_id,name,labels,token_prefix,active,last_seen_at,created_by,created_at,updated_at';
const SCRIPT_COLUMNS = 'id,project_id,test_case_id,script_ref,runner_labels,created_by,created_at,updated_at';
const JOB_COLUMNS = 'id,project_id,test_run_id,test_case_id,script_ref,required_labels,status,attempt,max_attempts,runner_id,artifacts,error_message,queued_at,started_at,finished_at,created_by,created_at,updated_at';

export const automationRepository = {
  async listRunners(projectId: string): Promise<AutomationRunner[]> {
    const { data, error } = await supabase.from('automation_runners').select(RUNNER_COLUMNS).eq('project_id', projectId).order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []).map(mapAutomationRunnerRow);
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

  async deleteScript(id: string): Promise<void> {
    const { error } = await supabase.from('automation_scripts').delete().eq('id', id);
    if (error) throw error;
  },

  async listJobs(projectId: string): Promise<AutomationJob[]> {
    const { data, error } = await supabase.from('automation_jobs').select(JOB_COLUMNS).eq('project_id', projectId).order('created_at', { ascending: false }).limit(200);
    if (error) throw error;
    return (data ?? []).map(mapAutomationJobRow);
  },

  async enqueue(input: { projectId: string; testPlanId: string; name?: string; environmentId?: string | null; maxAttempts: number }): Promise<AutomationEnqueueResponse> {
    const { data, error } = await supabase.rpc('enqueue_automation_jobs', {
      p_project_id: input.projectId, p_test_plan_id: input.testPlanId, p_name: input.name ?? null,
      p_environment_id: input.environmentId ?? null, p_max_attempts: input.maxAttempts,
    });
    if (error) throw error;
    return { runId: data.run_id, runCode: data.run_code, jobCount: data.job_count };
  },

  async cancelJob(id: string): Promise<void> {
    const { error } = await supabase.rpc('cancel_automation_job', { p_job_id: id });
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
