import { supabase } from '../config/supabaseClient';
import { mapTestResultStepRow } from '../helpers/mappers';
import type { TestResultStep, TestResultStepStatus } from '../types/domain';

export const testResultStepRepository = {
  async list(testResultId: string): Promise<TestResultStep[]> {
    const { data, error } = await supabase.from('test_result_steps').select('*').eq('test_result_id', testResultId).order('step_number');
    if (error) throw error;
    return (data ?? []).map(mapTestResultStepRow);
  },
  async update(id: string, status: TestResultStepStatus, notes: string | null): Promise<TestResultStep> {
    const { data, error } = await supabase.from('test_result_steps').update({ status, notes }).eq('id', id).select('*').single();
    if (error) throw error;
    return mapTestResultStepRow(data);
  },
};
