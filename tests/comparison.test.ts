import {expect,test} from 'vitest';
import {buildComparison} from '../src/ui/comparison';
import {buildTCIScenario,initialPatient,sampleAt} from '../src/ui/scenario';
import {models} from '../src/models/registry';
import {quantity as u} from '../src/models/units';
const course={rate:5,stop:30};
const events=[{id:'start',time:0,target:3},{id:'change',time:4.037,target:4},{id:'stop',time:18,target:0}];
for(const mode of ['cp','ce']as const)test(`${mode}: identical inputs reproduce independent model runs without mutation`,()=>{
 const before=JSON.stringify({patient:initialPatient,events});
 const result=buildComparison(initialPatient,mode,events,course);
 expect(result).toHaveLength(3);
 for(const r of result){
  expect(r.available).toBe(true);if(!r.available)continue;
  const independent=buildTCIScenario(initialPatient,mode,events,models[r.key]);
  expect(r.rows).toEqual(independent.rows);
  expect(sampleAt(r.rows,4.037).target).toBe(4);
  expect(sampleAt(r.rows,18).rate).toBe(0);
 }
 expect(JSON.stringify({patient:initialPatient,events})).toBe(before);
 const masses=result.map(r=>r.available?sampleAt(r.rows,18).administered:0);
 expect(new Set(masses).size).toBe(3);
});
test('prescribed input comparison shares administration but produces different concentrations',()=>{
 const result=buildComparison(initialPatient,'prescribed',[],course);
 const cp:number[]=[];
 for(const r of result){expect(r.available).toBe(true);if(!r.available)continue;
  const s=sampleAt(r.rows,30);expect(s.administered).toBeCloseTo(150,8);expect(s.rate).toBe(0);expect(s.target).toBeNull();cp.push(s.cp);
 }
 expect(new Set(cp).size).toBe(3);
});
test('unsupported models have explicit reasons and no replacement rows',()=>{
 const result=buildComparison({...initialPatient,age:u(5,'yr'),weight:u(18,'kg'),height:u(110,'cm')},'ce',events,course);
 const schnider=result.find(r=>r.key==='schnider')!;
 expect(schnider.available).toBe(false);expect('rows' in schnider).toBe(false);
 if(!schnider.available)expect(schnider.reason).toContain('adult');
 expect(result.find(r=>r.key==='eleveld')!.available).toBe(true);
});
test('edited past events recalculate all trajectories; malformed timelines are rejected',()=>{
 const first=buildComparison(initialPatient,'cp',events,course);
 const changed=buildComparison(initialPatient,'cp',[{...events[0]!,target:2},...events.slice(1)],course);
 first.forEach((r,i)=>{const b=changed[i]!;if(r.available&&b.available)expect(sampleAt(r.rows,2).administered).not.toBe(sampleAt(b.rows,2).administered);});
 expect(()=>buildComparison(initialPatient,'cp',[...events,{id:'dup',time:0,target:1}],course)).toThrow();
});
