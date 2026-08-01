import { supabase } from '../config/supabaseClient';
import { mapTestPlanScheduleRow } from '../helpers/mappers';
import type { AutomationBrowser, TestPlanSchedule } from '../types/domain';

const COLUMNS = 'id,project_id,test_plan_id,name,next_run_at,interval_days,environment_id,browser,device_profile,max_attempts,pause_on_failure,active,last_enqueued_at,created_at,updated_at';
export type ScheduleInput = { projectId: string; testPlanId: string; name: string; nextRunAt: string; intervalDays: number; environmentId: string | null; browser: AutomationBrowser; deviceProfile: string | null; maxAttempts: number; pauseOnFailure: boolean; active: boolean };
export const testPlanScheduleRepository = {
  async findByPlan(testPlanId: string): Promise<TestPlanSchedule | null> { const { data,error }=await supabase.from('test_plan_schedules').select(COLUMNS).eq('test_plan_id',testPlanId).maybeSingle(); if(error) throw error; return data ? mapTestPlanScheduleRow(data) : null; },
  async save(input: ScheduleInput): Promise<TestPlanSchedule> { const payload={project_id:input.projectId,test_plan_id:input.testPlanId,name:input.name,next_run_at:input.nextRunAt,interval_days:input.intervalDays,environment_id:input.environmentId,browser:input.browser,device_profile:input.deviceProfile,max_attempts:input.maxAttempts,pause_on_failure:input.pauseOnFailure,active:input.active}; const {data,error}=await supabase.from('test_plan_schedules').upsert(payload,{onConflict:'test_plan_id'}).select(COLUMNS).single(); if(error) throw error; return mapTestPlanScheduleRow(data); },
  async remove(testPlanId: string): Promise<void> { const {error}=await supabase.from('test_plan_schedules').delete().eq('test_plan_id',testPlanId); if(error) throw error; },
};
