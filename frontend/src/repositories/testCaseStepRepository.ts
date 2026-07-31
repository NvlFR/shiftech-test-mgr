import { supabase } from '../config/supabaseClient';
import { mapTestCaseStepRow } from '../helpers/mappers';
import type { TestCaseStep } from '../types/domain';

export const testCaseStepRepository = {
  async list(testCaseId: string): Promise<TestCaseStep[]> {
    const { data, error } = await supabase.from('test_case_steps').select('*').eq('test_case_id', testCaseId).order('step_number');
    if (error) throw error;
    return (data ?? []).map(mapTestCaseStepRow);
  },
  async create(input: { testCaseId: string; stepNumber: number; action: string; expectedResult?: string }): Promise<TestCaseStep> {
    const { data, error } = await supabase.from('test_case_steps').insert({ test_case_id: input.testCaseId, step_number: input.stepNumber, action: input.action, expected_result: input.expectedResult?.trim() || null }).select('*').single();
    if (error) throw error;
    return mapTestCaseStepRow(data);
  },
  async update(id: string, input: { action: string; expectedResult?: string }): Promise<TestCaseStep> {
    const { data, error } = await supabase.from('test_case_steps').update({ action: input.action, expected_result: input.expectedResult?.trim() || null }).eq('id', id).select('*').single();
    if (error) throw error;
    return mapTestCaseStepRow(data);
  },
  async remove(id: string) { const { error } = await supabase.from('test_case_steps').delete().eq('id', id); if (error) throw error; },
};
