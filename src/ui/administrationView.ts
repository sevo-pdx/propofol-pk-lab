import {positive,quantity,rateMcgPerKg,type Kg} from '../models/units';

export interface AdministrationSample {time:number;rate:number;loadingPulseStart:number|null}
export interface RateTrend {time:number;ongoing:number|null;allInput:number|null}
export interface LoadingPulse {start:number;end:number;mass:number;complete:boolean}

/** Display-only, causal, duration-weighted moving average of the actual piecewise
 * constant input. The window is a presentation choice, not a PK/PD constant.
 * Before a full window has elapsed, divide by elapsed time; t=0 has no average.
 * Excluding loading removes its mass from the numerator, never its time from the
 * denominator. All input remains in the PK solution and cumulative dose.
 */
export function administrationTrend(rows:readonly AdministrationSample[],weight:Kg,windowMinutes=1):RateTrend[]{
 positive(weight,'Weight');positive(windowMinutes,'Averaging window');
 if(!rows.length)return [];
 const total=[0],ongoing=[0];
 for(let i=1;i<rows.length;i++){
  const prev=rows[i-1]!,dt=rows[i]!.time-prev.time;
  if(dt<=0)throw new Error('Administration samples must be strictly chronological.');
  quantity(prev.rate,'mg/min');
  total.push(total[i-1]!+prev.rate*dt);
  ongoing.push(ongoing[i-1]!+(prev.loadingPulseStart===null?prev.rate*dt:0));
 }
 function integralAt(t:number,values:number[]){
  let lo=0,hi=rows.length-1;
  while(lo<hi){const mid=Math.ceil((lo+hi)/2);if(rows[mid]!.time<=t)lo=mid;else hi=mid-1;}
  if(lo===rows.length-1)return values[lo]!;
  return values[lo]!+(values[lo+1]!-values[lo]!)*(t-rows[lo]!.time)/(rows[lo+1]!.time-rows[lo]!.time);
 }
 const convert=(mass:number,dt:number)=>rateMcgPerKg(quantity(Math.max(0,mass)/dt,'mg/min'),weight);
 return rows.map((r,i)=>{
  const from=Math.max(rows[0]!.time,r.time-windowMinutes),dt=r.time-from;
  return {time:r.time,ongoing:dt>0?convert(ongoing[i]!-integralAt(from,ongoing),dt):null,allInput:dt>0?convert(total[i]!-integralAt(from,total),dt):null};
 });
}

/** Pulse bounds and mass come from control metadata and exact segment durations.
 * through limits live display to mass already administered, never forecast mass.
 */
export function loadingPulses(rows:readonly AdministrationSample[],through=Infinity):LoadingPulse[]{
 const pulses:LoadingPulse[]=[];
 for(let i=0;i<rows.length-1;i++){
  const row=rows[i]!,next=rows[i+1]!,end=Math.min(next.time,through);
  if(row.time>=through)break;
  if(row.loadingPulseStart===null||end<=row.time)continue;
  let pulse=pulses.at(-1);
  if(!pulse||pulse.start!==row.loadingPulseStart){pulse={start:row.loadingPulseStart,end:row.time,mass:0,complete:false};pulses.push(pulse);}
  pulse.end=end;pulse.mass+=row.rate*(end-row.time);
  pulse.complete=next.time<=through&&(next.loadingPulseStart!==row.loadingPulseStart||i===rows.length-2);
 }
 return pulses;
}
