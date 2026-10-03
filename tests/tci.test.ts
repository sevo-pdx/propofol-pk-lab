import { describe, expect, test } from 'vitest';
import { eleveld } from '../src/models/eleveld';
import { initialPatient } from '../src/ui/scenario';
import { simulateTCI, upsertTarget, validateEvents } from '../src/simulation/tciController';
import { quantity as u } from '../src/models/units';
const p = eleveld.evaluate(initialPatient).parameters;
const events = [{ id: 'start', time: 0, target: 3 }, { id: 'stop', time: 30, target: 0 }];
describe('educational TCI controller', () => {
  test.each(['cp', 'ce'] as const)('%s targets converge, remain nonnegative and conserve mass', mode => {
    const rows = simulateTCI(p, mode, events);
    for (const r of rows) {
      for (const value of [r.a1, r.a2, r.a3, r.cp, r.ce, r.rate]) expect(value).toBeGreaterThanOrEqual(0);
      expect(Math.abs(r.a1 + r.a2 + r.a3 + r.eliminated - r.administered)).toBeLessThan(1e-7);
      if (r.time >= 30) expect(r.rate).toBe(0);
    }
    const late = rows.find(r => r.time === 29)!;
    expect(late[mode]).toBeCloseTo(3, 2);
    expect(rows.at(-1)![mode]).toBeLessThan(late[mode]);
    expect(rows[1]!.ce).not.toBe(3);
  });
  test('Ce targeting produces plasma overshoot without artificially setting Ce', () => {
    const rows = simulateTCI(p, 'ce', events, 30);
    expect(Math.max(...rows.map(r => r.cp))).toBeGreaterThan(3);
    expect(Math.max(...rows.map(r => r.ce))).toBeLessThan(3.01);
    expect(rows[0]!.ce).toBe(0);
    expect(rows[1]!.ce).toBeLessThan(0.1);
  });
  test('off-grid changes are causal, instant and mass-continuous', () => {
    const original = simulateTCI(p, 'ce', events);
    const changed = simulateTCI(p, 'ce', [...events, { id: 'change', time: 4.037, target: 4 }]);
    for (const r of changed.filter(r => r.time < 4.037)) {
      const before = original.find(s => s.time === r.time)!;
      expect(r.a1).toBe(before.a1); expect(r.ce).toBe(before.ce);
    }
    const event = changed.find(r => Math.abs(r.time - 4.037) < 1e-8)!;
    expect(event.target).toBe(4); expect(event.rate).toBeGreaterThan(0);
    expect(event.ce).toBeLessThan(3.01);
  });
  test('target decreases suspend input instead of creating negative rates', () => {
    const rows = simulateTCI(p, 'ce', [{ id:'a',time:0,target:4 },{id:'b',time:18,target:2.5}]);
    expect(rows.find(r => r.time === 18)!.rate).toBe(0);
    expect(rows.at(-1)!.ce).toBeCloseTo(2.5, 2);
  });
  test('halving integration step leaves controller trajectory unchanged to tolerance', () => {
    const a = simulateTCI(p, 'ce', events);
    const b = simulateTCI(p, 'ce', events, 60, { integrationStep: 1 / 120 });
    a.forEach((r, i) => {
      expect(Math.abs(r.ce - b[i]!.ce)).toBeLessThan(1e-6);
      expect(Math.abs(r.administered - b[i]!.administered)).toBeLessThan(1e-4);
    });
  });
  test('forecast refinement gives similar peak and cumulative mass', () => {
    const a = simulateTCI(p, 'ce', events);
    const b = simulateTCI(p, 'ce', events, 60, { forecastStep: 1 / 24, forecastHorizon: 12 / p.ke0 });
    expect(Math.abs(a.at(-1)!.administered - b.at(-1)!.administered)).toBeLessThan(0.1);
    expect(Math.max(...b.map(r => r.ce))).toBeLessThan(3.01);
  });
  test('empty and zero-target experiments administer nothing', () => {
    expect(simulateTCI(p, 'ce', [], 1).at(-1)!.administered).toBe(0);
    expect(simulateTCI(p, 'cp', [{id:'a',time:0,target:0}],1).at(-1)!.administered).toBe(0);
  });
  test('event edits, duplicates and invalid times are explicit', () => {
    expect(upsertTarget(events, {id:'stop',time:40,target:0})[1]!.time).toBe(40);
    expect(() => validateEvents([...events,{id:'x',time:0,target:2}],60)).toThrow();
    expect(() => validateEvents([{id:'x',time:61,target:2}],60)).toThrow();
    expect(() => validateEvents([{id:'x',time:1,target:-1}],60)).toThrow();
  });
  test.each([
    { ...initialPatient, age:u(80,'yr'), concomitantAnaesthetics:true },
    { ...initialPatient, sex:'female' as const, weight:u(150,'kg') },
    { ...initialPatient, age:u(5,'yr'), weight:u(18,'kg'), height:u(109,'cm') },
    { ...initialPatient, age:u(0,'yr'), weight:u(.68,'kg'), height:u(32,'cm'), postMenstrualAge:u(27,'wk') },
  ])('Ce control remains numerically stable across covariates: age $age, weight $weight', patient=>{
    const rows=simulateTCI(eleveld.evaluate(patient).parameters,'ce',events);
    expect(Math.max(...rows.map(r=>r.ce))).toBeLessThan(3.02);
    const last=rows.at(-1)!;
    expect(Number.isFinite(last.administered)).toBe(true);
    expect(Math.abs(last.a1+last.a2+last.a3+last.eliminated-last.administered)).toBeLessThan(1e-7);
  });
});
