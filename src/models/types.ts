import type { Cm, Kg, Litres, LPerMin, Mg, MgPerL, Minutes, PerMin, Weeks, Years } from './units';
export interface PatientCovariates {
  readonly age: Years;
  readonly sex: 'male' | 'female'; // Published model covariate categories.
  readonly height: Cm;
  readonly weight: Kg;
  readonly concomitantAnaesthetics: boolean;
  readonly postMenstrualAge?: Weeks;
}
export interface PKParameters {
  readonly v1: Litres; readonly v2: Litres; readonly v3: Litres;
  readonly cl: LPerMin; readonly q2: LPerMin; readonly q3: LPerMin;
  readonly ke0: PerMin;
}
export interface Microconstants {
  readonly k10: PerMin; readonly k12: PerMin; readonly k21: PerMin;
  readonly k13: PerMin; readonly k31: PerMin; readonly ke0: PerMin;
}
export interface ModelEvaluation {
  readonly parameters: PKParameters;
  readonly derived: { readonly bmi?: number; readonly fatFreeMassKg?: number; readonly leanBodyMassKg?: number; readonly pmaWeeks?: number };
  readonly factors: Readonly<Record<string, number>>;
  readonly notes: readonly string[];
}
export interface PKModel {
  readonly id: string;
  readonly name: string;
  readonly referenceIds: readonly string[];
  evaluate(patient: PatientCovariates): ModelEvaluation;
}
export interface PKState {
  readonly time: Minutes;
  readonly a1: Mg; readonly a2: Mg; readonly a3: Mg;
  /** Virtual effect compartment: no physical mass or feedback to central. */
  readonly ce: MgPerL;
  readonly administered: Mg;
  readonly eliminated: Mg;
}
export const EDUCATIONAL_NOTICE = 'Educational PK/PD simulation only — not for clinical dosing or control of an infusion pump.';
