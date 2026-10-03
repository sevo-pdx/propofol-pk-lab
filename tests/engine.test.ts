import { describe, expect, test } from 'vitest';
import { advance, concentrations, derivative, eleveld, effectSiteDerivative, litresToMl, mcgPerMlToMgPerL, mcgToMg, mgPerLToMcgPerMl, mgToMcg, microconstants, quantity as u, ratePerKg, simulate, zeroState } from '../src/index';
import type { PatientCovariates, PKParameters } from '../src/index';
import { oracle } from './oracle';

export const reference: PatientCovariates = { age: u(35, 'yr'), sex: 'male', weight: u(70, 'kg'), height: u(170, 'cm'), concomitantAnaesthetics: false };
const p = eleveld.evaluate(reference).parameters;
const close = (actual: number, expected: number, absoluteTolerance: number) => expect(Math.abs(actual - expected)).toBeLessThanOrEqual(absoluteTolerance);

describe('published Eleveld reference, not a self-generated fixture', () => {
  // E2018 abstract p.942 + E2018-C p.519. Each printed value is rounded.
  test.each([
    ['v1', 6.28, 1e-12], ['v2', 25.5, 1e-12], ['v3', 273, 1e-10],
    ['cl', 1.79, 1e-12], ['q2', 1.83, 0.005], ['q3', 1.11, 1e-12], ['ke0', 0.146, 1e-12],
  ] as const)('%s matches published value %s', (key, value, tolerance) => close(p[key], value, tolerance));
  test('corrected Q2 is not silently replaced by its coefficient', () => {
    expect(p.q2).toBeGreaterThan(1.82);
    expect(p.q2).not.toBe(1.75);
  });
});

describe('covariate relationships from printed equations (not additional published patient examples)', () => {
  test('age modifies V2, with no independent arterial ke0 age factor', () => {
    const old = eleveld.evaluate({ ...reference, age: u(80, 'yr') }).parameters;
    close(old.v2 / p.v2, Math.exp(-0.0156 * 45), 1e-12);
    expect(old.ke0).toBe(p.ke0);
  });
  test('concomitant-drug factors use absolute age, not centered age', () => {
    const drugs = eleveld.evaluate({ ...reference, concomitantAnaesthetics: true }).parameters;
    close(drugs.cl / p.cl, Math.exp(-0.00286 * 35), 1e-12);
    close(drugs.v3 / p.v3, Math.exp(-0.0138 * 35), 1e-12);
    close(drugs.q3 / p.q3, Math.exp(-0.0138 * 35 * 0.75), 1e-12);
    expect(drugs.q2).toBe(p.q2);
  });
  test('female CL coefficient and sex-dependent FFM are applied', () => {
    const female = eleveld.evaluate({ ...reference, sex: 'female' });
    close(female.parameters.cl, 2.10, 1e-12);
    expect(female.derived.fatFreeMassKg).toBeLessThan(eleveld.evaluate(reference).derived.fatFreeMassKg!);
  });
  test('PMA modifies CL while Q3 maturation still uses age + 40 weeks', () => {
    const infant = { ...reference, age: u(0, 'yr'), weight: u(3, 'kg'), height: u(50, 'cm') };
    const preterm = eleveld.evaluate({ ...infant, postMenstrualAge: u(30, 'wk') }).parameters;
    const term = eleveld.evaluate({ ...infant, postMenstrualAge: u(40, 'wk') }).parameters;
    expect(preterm.cl).toBeLessThan(term.cl);
    expect(preterm.q3).toBe(term.q3);
    expect(() => eleveld.evaluate(infant)).toThrow(/PMA/);
  });
  test('invalid covariates are rejected', () => {
    for (const change of [{ age: NaN }, { weight: 0 }, { weight: 161 }, { height: 0 }, { age: 89 }, { sex: 'unknown' }, { concomitantAnaesthetics: undefined }]) {
      expect(() => eleveld.evaluate({ ...reference, ...change } as PatientCovariates)).toThrow();
    }
  });
});

describe('unit boundaries', () => {
  test('1 mg/L = 1 mcg/mL, with no thousand-fold concentration conversion', () => {
    expect(mgPerLToMcgPerMl(u(1, 'mg/L'))).toBe(1);
    expect(mcgPerMlToMgPerL(u(3.7, 'mcg/mL'))).toBe(3.7);
    expect(mgToMcg(u(1, 'mg'))).toBe(1000);
    expect(mcgToMg(u(1000, 'mcg'))).toBe(1);
    expect(litresToMl(u(1, 'L'))).toBe(1000);
    expect(ratePerKg(u(7, 'mg/min'), u(70, 'kg'))).toBe(0.1);
  });
  test('mass divided by litres yields mg/L', () => {
    const s = { ...zeroState(), a1: u(18.84, 'mg') };
    close(concentrations(s, p).cp, 3, 1e-12);
  });
  test('dimensional mismatches fail TypeScript checking', () => {
    const mg = u(1, 'mg');
    // @ts-expect-error Mass is not concentration.
    const concentration: import('../src/index').MgPerL = mg;
    expect(concentration).toBe(1);
  });
});

describe('ODE and integrator verification', () => {
  test('microconstant conversions reproduce clearances', () => {
    const k = microconstants(p);
    close(k.k10 * p.v1, p.cl, 1e-12);
    close(k.k12 * p.v1, k.k21 * p.v2, 1e-12);
    close(k.k13 * p.v1, k.k31 * p.v3, 1e-12);
  });
  test('instantaneous mass balance excludes the virtual effect-site concentration', () => {
    const d = derivative([20, 10, 50, 8, 0, 0], p, 4);
    close(d[0] + d[1] + d[2] + d[5], 4, 1e-12);
    expect(effectSiteDerivative(2, 3, p.ke0)).toBeLessThan(0);
  });
  test('zero input and zero mass stay zero', () => expect(advance(zeroState(), p, u(0, 'mg/min'), u(60, 'min'))).toEqual({ ...zeroState(), time: u(60, 'min') }));
  test('RK4 agrees with independent matrix exponential', () => {
    for (const time of [0.1, 1, 5, 30, 60]) {
      const actual = advance(zeroState(), p, u(5, 'mg/min'), u(time, 'min'));
      const expected = oracle(p, time, 5);
      [actual.a1, actual.a2, actual.a3, actual.ce].forEach((v, i) => close(v, expected[i]!, 1e-8));
    }
  });
  test('Ce approaches fixed Cp with the analytical exponential lag', () => {
    const fixed: PKParameters = { ...p, cl: u(0, 'L/min'), q2: u(0, 'L/min'), q3: u(0, 'L/min') };
    const initial = { ...zeroState(), a1: u(p.v1 * 3, 'mg') };
    for (const t of [1, 10, 100]) {
      const s = advance(initial, fixed, u(0, 'mg/min'), u(t, 'min'));
      close(s.ce, 3 * (1 - Math.exp(-p.ke0 * t)), 1e-10);
      expect(s.ce).toBeLessThan(3);
    }
  });
  test('closed compartments conserve initial mass', () => {
    const initial = { ...zeroState(), a1: u(30, 'mg'), a2: u(20, 'mg'), a3: u(50, 'mg') };
    const s = advance(initial, { ...p, cl: u(0, 'L/min') }, u(0, 'mg/min'), u(120, 'min'));
    close(s.a1 + s.a2 + s.a3, 100, 1e-9);
  });
  const patients: PatientCovariates[] = [reference,
    { ...reference, age: u(80, 'yr'), concomitantAnaesthetics: true },
    { ...reference, sex: 'female', weight: u(150, 'kg') },
    { ...reference, age: u(5, 'yr'), weight: u(18, 'kg'), height: u(109, 'cm') },
    { ...reference, age: u(0, 'yr'), weight: u(0.68, 'kg'), height: u(32, 'cm'), postMenstrualAge: u(27, 'wk') },
  ];
  test.each(patients)('nonnegative trajectories and conserved accounting: age $age, weight $weight', patient => {
    const pars = eleveld.evaluate(patient).parameters;
    const rows = simulate(pars, [{ time: u(0, 'min'), rate: u(5, 'mg/min') }, { time: u(30, 'min'), rate: u(0, 'mg/min') }], u(60, 'min'));
    for (const s of rows) {
      for (const value of Object.values(s)) expect(value).toBeGreaterThanOrEqual(0);
      for (const value of Object.values(concentrations(s, pars))) expect(value).toBeGreaterThanOrEqual(0);
      close(s.a1 + s.a2 + s.a3 + s.eliminated, s.administered, 1e-8);
      close(s.administered, 5 * Math.min(s.time, 30), 1e-9);
    }
    expect(rows.at(-1)!.ce).toBeLessThan(rows[30]!.ce);
    expect(rows.at(-1)!.a1).toBeLessThan(rows[30]!.a1);
  });
  test('halving timestep converges across complete trajectories', () => {
    const events = [{ time: u(0, 'min'), rate: u(5, 'mg/min') }, { time: u(18.125, 'min'), rate: u(2, 'mg/min') }, { time: u(30, 'min'), rate: u(0, 'mg/min') }];
    const runs = [1 / 60, 1 / 120, 1 / 240].map(dt => simulate(p, events, u(60, 'min'), u(1, 'min'), { maxStep: u(dt, 'min') }));
    for (let i = 0; i < runs[0]!.length; i++) {
      for (const key of ['a1', 'a2', 'a3', 'ce', 'administered', 'eliminated'] as const) {
        close(runs[0]![i]![key], runs[1]![i]![key], 1e-7);
        close(runs[1]![i]![key], runs[2]![i]![key], 1e-8);
      }
    }
  });
  test('Ce can continue rising after input stops, then decays; it is never forced to Cp', () => {
    const s = advance(zeroState(), p, u(5, 'mg/min'), u(1, 'min'));
    const shortlyAfter = advance(s, p, u(0, 'mg/min'), u(0.1, 'min'));
    expect(shortlyAfter.ce).toBeGreaterThan(s.ce);
    const late = advance(s, p, u(0, 'mg/min'), u(1440, 'min'));
    expect(late.ce).toBeLessThan(s.ce * 0.01);
    expect(late.a1 + late.a2 + late.a3).toBeLessThan(s.administered * 0.02);
  });
  test('large requested steps are subdivided instead of producing negatives', () => {
    const a = advance(zeroState(), p, u(5, 'mg/min'), u(60, 'min'), { maxStep: u(60, 'min') });
    const b = advance(zeroState(), p, u(5, 'mg/min'), u(60, 'min'));
    close(a.ce, b.ce, 1e-6);
    close(a.a1 + a.a2 + a.a3 + a.eliminated, 300, 1e-8);
  });
  test('bad solver inputs fail explicitly', () => {
    expect(() => advance(zeroState(), p, u(0, 'mg/min'), u(1, 'min'), { maxStep: u(0, 'min') })).toThrow();
    expect(() => advance(zeroState(), { ...p, v1: u(0, 'L') }, u(0, 'mg/min'), u(1, 'min'))).toThrow();
  });
});

describe('event timing', () => {
  test('off-grid input changes are integrated at their exact timestamp', () => {
    const events = [{ time: u(0.125, 'min'), rate: u(8, 'mg/min') }, { time: u(0.375, 'min'), rate: u(0, 'mg/min') }];
    const rows = simulate(p, events, u(1, 'min'));
    expect(rows.map(s => s.time)).toEqual([0, 0.125, 0.375, 1]);
    close(rows.at(-1)!.administered, 2, 1e-12);
    expect(rows[1]!.a1).toBe(0);
  });
  test('duplicate timestamps and events outside the run are rejected', () => {
    expect(() => simulate(p, [{ time: u(0, 'min'), rate: u(1, 'mg/min') }, { time: u(0, 'min'), rate: u(2, 'mg/min') }], u(1, 'min'))).toThrow(/Duplicate/);
    expect(() => simulate(p, [{ time: u(2, 'min'), rate: u(1, 'mg/min') }], u(1, 'min'))).toThrow(/after/);
  });
});
