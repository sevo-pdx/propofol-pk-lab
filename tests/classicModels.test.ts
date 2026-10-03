import {expect,test} from 'vitest';
import {schnider,jamesLeanBodyMass,marsh,quantity as u,microconstants,advance,zeroState,concentrations} from '../src/index';
import {initialPatient} from '../src/ui/scenario';
import {oracle} from './oracle';
import {simulateTCI} from '../src/simulation/tciController';
// Published parameter table checks, not claimed independent clinical reference trajectories.
test('Marsh reproduces W2013 Table 1 at its Fig 1 60 kg example',()=>{
 const p=marsh.evaluate({...initialPatient,weight:u(60,'kg')}).parameters;
 expect(p.v1).toBeCloseTo(13.68,12);
 const k=microconstants(p);
 for(const [key,value]of Object.entries({k10:.119,k12:.112,k21:.055,k13:.0419,k31:.0033,ke0:.26}))expect(k[key as keyof typeof k]).toBeCloseTo(value,12);
 expect(p.v2).toBeCloseTo(27.85745454545455,10);expect(p.v3).toBeCloseTo(173.69454545454545,10);
});
test('Schnider matches published coefficients at age center and hand-calculated James covariates',()=>{
 // Age 53 matches S1998 Table 2 centering. Synthetic patient, not a published measured subject.
 const patient={...initialPatient,age:u(53,'yr'),weight:u(77,'kg'),height:u(177,'cm')};
 const v=schnider.evaluate(patient),p=v.parameters;
 expect(v.derived.leanBodyMassKg).toBeCloseTo(60.47605413514635,10);
 expect(p.cl).toBeCloseTo(1.7894807133965336,10);
 expect(p.v1).toBe(4.27);expect(p.v2).toBe(18.9);expect(p.v3).toBe(238);expect(p.q2).toBe(1.29);expect(p.q3).toBe(.836);expect(p.ke0).toBe(.456);
});
test('James uses the published sex-specific coefficients',()=>{
 expect(jamesLeanBodyMass({...initialPatient,sex:'female',weight:u(60,'kg'),height:u(160,'cm')})).toBeCloseTo(43.3875,10);
 expect(jamesLeanBodyMass(initialPatient)).toBeCloseTo(55.29757785467128,10);
});
test('Marsh ignores all non-weight covariates and scales volumes and clearances',()=>{
 const a=marsh.evaluate(initialPatient).parameters;
 expect(marsh.evaluate({...initialPatient,age:u(80,'yr'),sex:'female',height:u(150,'cm'),concomitantAnaesthetics:true}).parameters).toEqual(a);
 const b=marsh.evaluate({...initialPatient,weight:u(140,'kg')}).parameters;
 for(const key of ['v1','v2','v3','cl','q2','q3'] as const)expect(b[key]).toBeCloseTo(2*a[key],12);
 expect(b.ke0).toBe(a.ke0);
});
test('Schnider age affects only V2/Q2; unused drugs and PMA have no effect',()=>{
 const a=schnider.evaluate(initialPatient).parameters,b=schnider.evaluate({...initialPatient,age:u(80,'yr')}).parameters;
 expect(b.v2).toBeCloseTo(8.343,12);expect(b.q2).toBeCloseTo(.642,12);
 for(const key of ['v1','v3','cl','q3','ke0']as const)expect(b[key]).toBe(a[key]);
 expect(schnider.evaluate({...initialPatient,concomitantAnaesthetics:true,postMenstrualAge:u(2000,'wk')}).parameters).toEqual(a);
});
test('invalid and extrapolated Schnider covariates are explicit',()=>{
 expect(()=>schnider.evaluate({...initialPatient,age:u(5,'yr')})).toThrow(/adult/);
 expect(()=>schnider.evaluate({...initialPatient,age:u(110,'yr')})).toThrow(/v2/);
 expect(()=>schnider.evaluate({...initialPatient,weight:u(500,'kg')})).toThrow(/lean body mass/);
 expect(schnider.evaluate({...initialPatient,weight:u(160,'kg')}).notes.join(' ')).toContain('declining branch');
 expect(()=>marsh.evaluate({...initialPatient,weight:u(0,'kg')})).toThrow();
});
for(const model of [schnider,marsh]){
 test(`${model.id}: independent numerical solution, conservation, refinement and decay`,()=>{
  const p=model.evaluate(initialPatient).parameters;
  const a=advance(zeroState(),p,u(5,'mg/min'),u(30,'min'));
  const b=advance(zeroState(),p,u(5,'mg/min'),u(30,'min'),{maxStep:u(1/120,'min')});
  const ref=oracle(p,30,5);
  [a.a1,a.a2,a.a3,a.ce].forEach((v,i)=>expect(v).toBeCloseTo(ref[i]!,7));
  expect(a.ce).toBeCloseTo(b.ce,8);expect(a.a1+a.a2+a.a3+a.eliminated).toBeCloseTo(a.administered,8);
  const end=advance(a,p,u(0,'mg/min'),u(60,'min'));
  expect(end.ce).toBeLessThan(a.ce);expect(end.a1).toBeLessThan(a.a1);
  Object.values(end).forEach(v=>expect(v).toBeGreaterThanOrEqual(0));
  const eq=advance(zeroState(),p,u(5,'mg/min'),u(3000,'min'));
  expect(eq.ce).toBeCloseTo(concentrations(eq,p).cp,3);
 });
 for(const mode of ['cp','ce']as const)test(`${model.id}: ${mode} targets evolve without negative mass`,()=>{
  const p=model.evaluate(initialPatient).parameters;
  const rows=simulateTCI(p,mode,[{id:'on',time:0,target:3},{id:'off',time:20,target:0}],40);
  expect(rows[0]!.ce).toBe(0);
  for(const r of rows){expect(Math.min(r.a1,r.a2,r.a3,r.ce,r.rate)).toBeGreaterThanOrEqual(0);expect(r.a1+r.a2+r.a3+r.eliminated).toBeCloseTo(r.administered,7);if(r.time>=20)expect(r.rate).toBe(0);}
  expect(rows.at(-1)!.ce).toBeLessThan(rows.find(r=>r.time>=20)!.ce);
 });
}

test('scenario adapters use the requested model for both targeting and prescribed input',async()=>{
 const {buildScenario,buildTCIScenario}=await import('../src/ui/scenario');
 for(const model of [schnider,marsh]){
  const p=model.evaluate(initialPatient).parameters;
  const prescribed=buildScenario(initialPatient,{rate:5,stop:30},model);
  expect(prescribed.evaluation.parameters).toEqual(p);
  const tci=buildTCIScenario(initialPatient,'cp',[{id:'a',time:0,target:3}],model);
  expect(tci.evaluation.parameters).toEqual(p);
  expect(tci.rows.at(-1)!.cp).toBeCloseTo(3,5);
 }
});
