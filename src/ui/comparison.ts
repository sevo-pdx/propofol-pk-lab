import type { ModelEvaluation, PatientCovariates } from '../models/types';
import { models, type ModelKey } from '../models/registry';
import { validateEvents, type TargetEvent, type TargetMode } from '../simulation/tciController';
import { buildScenario, buildTCIScenario, END, type Course, type Sample } from './scenario';
export type ComparisonResult = {key:ModelKey;name:string} & (
 {available:true;evaluation:ModelEvaluation;rows:Sample[]} | {available:false;reason:string});
/** Each controller sees the identical covariates, target mode and event sequence.
 * Independent rates are outputs, not shared inputs. No substitute patient/model
 * is used when a model cannot evaluate a covariate set. */
export function buildComparison(patient:PatientCovariates,mode:TargetMode|'prescribed',events:TargetEvent[],course:Course,duration=END):ComparisonResult[] {
 const timeline=mode==='prescribed'?events.filter(event=>event.time<=duration):validateEvents(events.filter(event=>event.time<=duration),duration);
 return (Object.keys(models) as ModelKey[]).map(key=>{
  const model=models[key];
  try {
   const result=mode==='prescribed'?buildScenario(patient,course,model,duration):buildTCIScenario(patient,mode,timeline,model,duration);
   return {key,name:model.name,available:true,...result};
  }catch(error){return {key,name:model.name,available:false,reason:error instanceof Error?error.message:'Model evaluation failed'};}
 });
}
