import { useCallback,useEffect,useState } from 'react';
import { testPlanScheduleService } from '../services/testPlanScheduleService';
import type { TestPlanSchedule } from '../types/domain';
export function useTestPlanSchedule(testPlanId:string|null){ const [schedule,setSchedule]=useState<TestPlanSchedule|null>(null); const [loading,setLoading]=useState(false); const [error,setError]=useState<Error|null>(null); const reload=useCallback(async()=>{ if(!testPlanId){setSchedule(null);return;} setLoading(true);setError(null);try{setSchedule(await testPlanScheduleService.getByPlan(testPlanId));}catch(e){setError(e instanceof Error?e:new Error('Gagal memuat jadwal'));}finally{setLoading(false);}},[testPlanId]); useEffect(()=>{void reload();},[reload]); return {schedule,loading,error,reload}; }
