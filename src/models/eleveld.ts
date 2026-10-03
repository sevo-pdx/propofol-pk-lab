import type { ModelEvaluation, PatientCovariates, PKModel } from './types';
import { positive, quantity as u } from './units';

// Source keys resolve to references/REFERENCES.md. Every empirical constant
// below is from E2018 Table 2 (p.950), unless a different location is given.
const T = {
  v1: 6.28, // E2018 Table 2 theta1, L.
  v2: 25.5, // E2018 Table 2 theta2, L.
  v3: 273, // E2018 Table 2 theta3, L.
  clMale: 1.79, // E2018 Table 2 theta4, L/min.
  q2: 1.75, // E2018 Table 2 theta5, coefficient, NOT adjusted reference Q2 (E2018-C).
  q3: 1.11, // E2018 Table 2 theta6, L/min.
  clMaturation50: 42.3, // E2018 Table 2 theta8, weeks.
  clMaturationSlope: 9.06, // E2018 Table 2 theta9.
  ageV2: -0.0156, // E2018 Table 2 theta10, /year.
  ageCl: -0.00286, // E2018 Table 2 theta11, /year; with concomitant drugs only.
  central50: 33.6, // E2018 Table 2 theta12, kg.
  ageV3: -0.0138, // E2018 Table 2 theta13, /year; with concomitant drugs only.
  q3Maturation50: 68.3, // E2018 Table 2 theta14, weeks.
  clFemale: 2.10, // E2018 Table 2 theta15, L/min.
  q2Maturation: 1.30, // E2018 Table 2 theta16.
  ke0: 0.146, // E2018 Table 3 theta2, arterial ke0, /min.
} as const;
const REF = {
  age: 35, weight: 70, height: 170, // E2018 p.943 reference individual, years/kg/cm.
};
const CLEARANCE_POWER = 0.75; // E2018 pp.946,948 allometric clearance exponent.
const KE0_POWER = -0.25; // E2018 p.948 ke0 equation.
const GESTATION_WEEKS = 40; // E2018 pp.943,948 default PMA and Q3 maturation offset.
const WEEKS_PER_YEAR = 365.25 / 7; // Explicit calendar convention; not a fitted PK constant.

function sigmoid(x: number, e50: number, slope: number): number {
  // Algebraically x^slope/(x^slope+e50^slope); stable at x=0 and large x.
  return x === 0 ? 0 : 1 / (1 + (e50 / x) ** slope);
}
function ffm(age: number, weight: number, bmi: number, sex: PatientCovariates['sex']): number {
  // A2015 Al-Sallami equation as reproduced in E2018 p.946.
  // 9270,6680,216 and 8780,244: adult size coefficients in that equation.
  // 0.88,13.4,12.7 (male), 1.11,7.1,1.1 (female): maturation coefficients.
  return sex === 'male'
    ? (0.88 + (1 - 0.88) * sigmoid(age, 13.4, 12.7)) * 9270 * weight / (6680 + 216 * bmi)
    : (1.11 + (1 - 1.11) * sigmoid(age, 7.1, 1.1)) * 9270 * weight / (8780 + 244 * bmi);
}
export const eleveld: PKModel = {
  id: 'eleveld-2018-arterial',
  name: 'Eleveld 2018 — arterial population PK / effect site',
  referenceIds: ['E2018', 'E2018-C', 'A2015'],
  evaluate(p: PatientCovariates): ModelEvaluation {
    u(p.age, 'yr'); positive(p.weight, 'Weight'); positive(p.height, 'Height');
    if (!['male', 'female'].includes(p.sex)) throw new RangeError('Unsupported model sex category');
    if (typeof p.concomitantAnaesthetics !== 'boolean') throw new TypeError('Concomitant drugs must be explicit');
    // Model study bounds E2018 abstract; enforced as an application scope boundary.
    if (p.age > 88 || p.weight < 0.68 || p.weight > 160) throw new RangeError('Outside implemented study envelope: age 0–88 years, weight 0.68–160 kg');
    // Application policy: require explicit PMA below 0.5 yr; paper p.950 notes relevance <5–6 months.
    if (p.age < 0.5 && p.postMenstrualAge === undefined) throw new RangeError('Explicit PMA required below 6 months');
    const pma = p.postMenstrualAge ?? p.age * WEEKS_PER_YEAR + GESTATION_WEEKS;
    positive(pma, 'PMA');
    if (pma < 27 || pma < p.age * WEEKS_PER_YEAR) throw new RangeError('PMA outside study envelope or inconsistent with postnatal age'); // E2018 abstract: 27 weeks minimum.
    const bmi = p.weight / (p.height / 100) ** 2; // SI cm -> m, BMI definition.
    const refBmi = REF.weight / (REF.height / 100) ** 2;
    const fatFreeMassKg = ffm(p.age, p.weight, bmi, p.sex);
    const refFfm = ffm(REF.age, REF.weight, refBmi, 'male');
    const refPma = REF.age * WEEKS_PER_YEAR + GESTATION_WEEKS;
    const size = p.weight / REF.weight;
    const central = sigmoid(p.weight, T.central50, 1) / sigmoid(REF.weight, T.central50, 1); // E2018 p.948 fixed sigmoid slope 1.
    const ageingV2 = Math.exp(T.ageV2 * (p.age - REF.age));
    const drugsCl = p.concomitantAnaesthetics ? Math.exp(T.ageCl * p.age) : 1;
    const drugsV3 = p.concomitantAnaesthetics ? Math.exp(T.ageV3 * p.age) : 1;
    const matCl = sigmoid(pma, T.clMaturation50, T.clMaturationSlope) / sigmoid(refPma, T.clMaturation50, T.clMaturationSlope);
    // E2018 p.948: Q3 uses postnatal AGE + 40 weeks, NOT supplied PMA.
    const matQ3 = sigmoid(p.age * WEEKS_PER_YEAR + GESTATION_WEEKS, T.q3Maturation50, 1);
    const refMatQ3 = sigmoid(refPma, T.q3Maturation50, 1);
    const v1 = T.v1 * central;
    const v2 = T.v2 * size * ageingV2;
    const v3 = T.v3 * fatFreeMassKg / refFfm * drugsV3;
    const cl = (p.sex === 'male' ? T.clMale : T.clFemale) * size ** CLEARANCE_POWER * matCl * drugsCl;
    const q2 = T.q2 * (v2 / T.v2) ** CLEARANCE_POWER * (1 + T.q2Maturation * (1 - matQ3));
    const q3 = T.q3 * (v3 / T.v3) ** CLEARANCE_POWER * matQ3 / refMatQ3;
    const ke0 = T.ke0 * size ** KE0_POWER;
    for (const [key, value] of Object.entries({ v1, v2, v3, cl, q2, q3, ke0 })) positive(value, key);
    return {
      parameters: { v1: u(v1, 'L'), v2: u(v2, 'L'), v3: u(v3, 'L'), cl: u(cl, 'L/min'), q2: u(q2, 'L/min'), q3: u(q3, 'L/min'), ke0: u(ke0, '1/min') },
      derived: { bmi, fatFreeMassKg, pmaWeeks: pma },
      factors: { size, central, ageingV2, drugsCl, drugsV3, matCl, matQ3, refMatQ3, ffmRatio: fatFreeMassKg / refFfm },
      notes: [
        'Population prediction: all random effects fixed to zero; arterial parameters only.',
        'Reference Q2 is 1.83 L/min rounded (2018 corrigendum); 1.75 is its coefficient.',
        ...(p.postMenstrualAge === undefined ? ['PMA explicitly derived as postnatal age + 40 weeks. Calendar year = 365.25 days.'] : []),
        // TODO(source-audit): cross-check against publisher NONMEM S2 when accessible.
        'Printed PK equations and corrected reference checked; independent NONMEM S2 replay remains outstanding.',
        'BIS is not implemented in phase 1; printed PD equations require supplementary-source verification.',
      ],
    };
  },
};
