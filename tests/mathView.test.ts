import { expect, test } from 'vitest';
import { mathematicalView } from '../src/simulation/mathView';
import { eleveld } from '../src/models/eleveld';
import { initialPatient } from '../src/ui/scenario';
import { zeroState } from '../src/simulation/equations';
import { advance } from '../src/simulation/integrator';
import { quantity as u } from '../src/models/units';
const p=eleveld.evaluate(initialPatient).parameters;
const s={...zeroState(),a1:u(2*p.v1,'mg'),a2:u(3*p.v2,'mg'),a3:u(p.v3,'mg'),ce:u(4,'mg/L')};
test('teaching terms reconstruct each actual instantaneous derivative',()=>{
  const v=mathematicalView(s,p,5);
  for(const equation of v.equations){
    expect(equation.terms.reduce((total,t)=>total+t.sign*t.value,0)).toBeCloseTo(equation.result,12);
    for(const t of equation.terms){
      const substitution=t.flow==='effect'?t.factors[0]!*(t.factors[1]!-t.factors[2]!):t.factors.reduce((a,b)=>a*b,1);
      expect(substitution).toBeCloseTo(t.value,12);
    }
  }
  expect(v.equations[1]!.result).toBeCloseTo(-p.q2,12);
  expect(v.equations[2]!.result).toBeCloseTo(p.q3,12);
  expect(v.equations[3]!.result).toBeCloseTo(-2*p.ke0,12);
});
test('displayed slopes agree with a small RK4 advance in physical units',()=>{
  const h=1e-6,next=advance(s,p,u(5,'mg/min'),u(h,'min'));
  const values=[next.a1-s.a1,next.a2-s.a2,next.a3-s.a3,next.ce-s.ce];
  mathematicalView(s,p,5).equations.forEach((eq,i)=>expect(values[i]!/h).toBeCloseTo(eq.result,4));
});
test('exchange terms cancel across compartments, excluding the virtual effect site',()=>{
  const v=mathematicalView(s,p,5);
  expect(v.totalMassDerivative).toBeCloseTo(5-2*p.cl,12);
  for(const flow of ['rapid','slow']){
    const terms=v.equations.flatMap(e=>e.terms).filter(t=>t.flow===flow);
    expect(terms.reduce((sum,t)=>sum+t.sign*t.value,0)).toBeCloseTo(0,12);
  }
});
test('equilibrium produces zero peripheral and effect-site slopes despite bidirectional flow',()=>{
  const v=mathematicalView({...s,a2:u(2*p.v2,'mg'),a3:u(2*p.v3,'mg'),ce:u(2,'mg/L')},p,2*p.cl);
  v.equations.forEach(eq=>expect(eq.result).toBeCloseTo(0,12));
  expect(v.equations[1]!.terms[0]!.value).toBeGreaterThan(0);
});
