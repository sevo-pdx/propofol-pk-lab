import {expect,test} from 'vitest';
import {administrationTrend,loadingPulses,type AdministrationSample} from '../src/ui/administrationView';
import {quantity as u} from '../src/models/units';
import {eleveld} from '../src/models/eleveld';
import {initialPatient} from '../src/ui/scenario';
import {simulateTCI} from '../src/simulation/tciController';
const row=(time:number,rate:number,loadingPulseStart:number|null=null):AdministrationSample=>({time,rate,loadingPulseStart});
const rows=[row(0,120,0),row(1/6,6),row(1,0),row(1.5,0),row(2,0)];
test('duration weighting, loading exclusion, and exact 1000-fold weight conversion',()=>{
 const trend=administrationTrend(rows,u(50,'kg'));
 expect(trend[0]!.allInput).toBeNull();
 expect(trend[1]!.allInput).toBeCloseTo(2400,10);
 expect(trend[1]!.ongoing).toBe(0);
 expect(trend[2]!.allInput).toBeCloseTo(500,10);
 expect(trend[2]!.ongoing).toBeCloseTo(100,10);
 expect(administrationTrend(rows,u(100,'kg'))[2]!.ongoing).toBeCloseTo(50,10);
});
test('partial windows integrate exact segment overlap and decay after stopping',()=>{
 const trend=administrationTrend(rows,u(50,'kg'));
 expect(trend[3]!.allInput).toBeCloseTo(60,10);
 expect(trend[4]!.allInput).toBe(0);
});
test('subdividing samples does not change averages; future input cannot affect past',()=>{
 const split=[rows[0]!,row(1/12,120,0),rows[1]!,row(.5,6),...rows.slice(2)];
 const a=administrationTrend(rows,u(70,'kg')),b=administrationTrend(split,u(70,'kg'));
 a.forEach(v=>expect(b.find(r=>r.time===v.time)).toEqual(v));
 const changed=administrationTrend([...rows.slice(0,3),row(1.5,900),row(2,900)],u(70,'kg'));
 expect(changed.slice(0,3)).toEqual(a.slice(0,3));
});
test('loading mass is exact and live summaries exclude future mass',()=>{
 expect(loadingPulses(rows)).toEqual([{start:0,end:1/6,mass:20,complete:true}]);
 expect(loadingPulses(rows,0)).toEqual([]);
 expect(loadingPulses(rows,1/12)).toEqual([{start:0,end:1/12,mass:10,complete:false}]);
 expect(loadingPulses([row(0,60,0),row(.1,120,.1),row(.2,0)])).toEqual([
  {start:0,end:.1,mass:6,complete:true},{start:.1,end:.2,mass:12,complete:true}]);
});
test('invalid averaging inputs fail explicitly',()=>{
 expect(()=>administrationTrend(rows,u(0,'kg'))).toThrow();
 expect(()=>administrationTrend(rows,u(70,'kg'),0)).toThrow();
 expect(()=>administrationTrend([row(1,3),row(0,3)],u(70,'kg'))).toThrow();
});
test.each(['cp','ce'] as const)('%s loading annotations follow target increases and match integrated mass',mode=>{
 const r=simulateTCI(eleveld.evaluate(initialPatient).parameters,mode,[
  {id:'a',time:0,target:3},{id:'b',time:1.037,target:4},
  {id:'c',time:2,target:4},{id:'d',time:3,target:2},{id:'e',time:4,target:0}
 ],5);
 const pulses=loadingPulses(r);
 expect(pulses.map(p=>p.start)).toEqual([0,1.037]);
 for(const pulse of pulses){
  const a=r.find(s=>s.time===pulse.start)!,b=r.find(s=>Math.abs(s.time-pulse.end)<1e-9)!;
  expect(pulse.mass).toBeCloseTo(b.administered-a.administered,8);
  expect(pulse.end-pulse.start).toBeLessThanOrEqual(1/6+1e-9);
 }
 const trend=administrationTrend(r,u(70,'kg'),5).at(-1)!;
 expect(trend.allInput).toBeCloseTo(r.at(-1)!.administered/5*1000/70,8);
 expect(trend.ongoing).toBeCloseTo((r.at(-1)!.administered-pulses.reduce((s,p)=>s+p.mass,0))/5*1000/70,8);
});
