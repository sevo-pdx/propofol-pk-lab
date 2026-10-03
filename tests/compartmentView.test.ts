import { expect, test } from 'vitest';
import { compartmentView } from '../src/simulation/compartmentView';
import { eleveld } from '../src/models/eleveld';
import { initialPatient } from '../src/ui/scenario';
import { zeroState } from '../src/simulation/equations';
import { quantity as u } from '../src/models/units';
const p=eleveld.evaluate(initialPatient).parameters;
test('animation net flows reverse during redistribution',()=>{
  const v=compartmentView({...zeroState(),a1:u(p.v1,'mg'),a2:u(p.v2*2,'mg'),a3:u(p.v3*3,'mg'),ce:u(2,'mg/L')},p,0);
  expect(v.rapidNet).toBeCloseTo(-p.q2,12);expect(v.slowNet).toBeCloseTo(-2*p.q3,12);
  expect(v.effectDerivative).toBeCloseTo(-p.ke0,12);
});
test('effect-site values never contribute to displayed physical mass',()=>{
  const v=compartmentView({...zeroState(),ce:u(3,'mg/L')},p,0);
  expect(v.remaining).toBe(0);expect(v.compartments).toHaveLength(3);
});
test('equal physical concentrations yield zero net redistribution',()=>{
  const v=compartmentView({...zeroState(),a1:u(p.v1*2,'mg'),a2:u(p.v2*2,'mg'),a3:u(p.v3*2,'mg')},p,5);
  expect(v.rapidNet).toBe(0);expect(v.slowNet).toBe(0);
  expect(v.elimination).toBeCloseTo(p.cl*2,12);expect(v.input).toBe(5);
});
