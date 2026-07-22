import { supabase } from '../config/supabaseClient';
import { mapCicdPipelineRow } from '../helpers/mappers';
import type { CicdIngestPayload, CicdIngestResponse, CicdPipeline, CicdProvider, CicdPipelineSecret } from '../types/domain';

const PIPELINE_COLUMNS = 'id,project_id,test_plan_id,name,provider,token_prefix,active,last_used_at,created_by,created_at,updated_at';

export const cicdRepository = {
  async listByProject(projectId: string): Promise<CicdPipeline[]> {
    const { data, error } = await supabase.from('cicd_pipelines').select(PIPELINE_COLUMNS).eq('project_id', projectId).order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []).map(mapCicdPipelineRow);
  },

  async create(input: { projectId: string; testPlanId: string; name: string; provider: CicdProvider; token: string }): Promise<CicdPipelineSecret> {
    const { data, error } = await supabase.rpc('create_cicd_pipeline', {
      p_project_id: input.projectId, p_test_plan_id: input.testPlanId, p_name: input.name,
      p_provider: input.provider, p_token: input.token,
    });
    if (error) throw error;
    return { pipeline: mapCicdPipelineRow(data.pipeline), token: data.token };
  },

  async rotateToken(id: string, token: string): Promise<CicdPipelineSecret> {
    const { data, error } = await supabase.rpc('rotate_cicd_pipeline_token', { p_pipeline_id: id, p_token: token });
    if (error) throw error;
    return { pipeline: mapCicdPipelineRow(data.pipeline), token: data.token };
  },

  async setActive(id: string, active: boolean): Promise<CicdPipeline> {
    const { data, error } = await supabase.from('cicd_pipelines').update({ active }).eq('id', id).select(PIPELINE_COLUMNS).single();
    if (error) throw error;
    return mapCicdPipelineRow(data);
  },

  async ingest(token: string, payload: CicdIngestPayload): Promise<CicdIngestResponse> {
    const { data, error } = await supabase.rpc('ingest_cicd_test_run', { p_token: token, p_payload: payload });
    if (error) throw error;
    return {
      runId: data.run_id,
      runCode: data.run_code,
      status: data.status,
      provider: data.provider,
      summary: { total: data.summary.total, pass: data.summary.pass, fail: data.summary.fail, skip: data.summary.skip, blocked: data.summary.blocked, notRun: data.summary.not_run, progressPercent: data.summary.progress_percent },
    };
  },
};
