import { concentrations, eleveld, quantity as u, simulate } from '../index';
import type { PatientCovariates, PKModel } from '../index';
import { simulateTCI, type TargetEvent, type TargetMode } from '../simulation/tciController';
export const initialPatient: PatientCovariates = { age: u(35, 'yr'), sex: 'male', height: u(170, 'cm'), weight: u(70, 'kg'), concomitantAnaesthetics: false };
export const END = 60;
export interface Course { rate: number; stop: number }
export function buildScenario(patient: PatientCovariates, course: Course, model: PKModel = eleveld) {
  if (!Number.isFinite(course.stop) || course.stop <= 0 || course.stop > END) throw new Error('Stop time must be greater than 0 and at most 60 minutes.');
  const evaluation = model.evaluate(patient);
  const states = simulate(evaluation.parameters, [{ time: u(0, 'min'), rate: u(course.rate, 'mg/min') }, { time: u(course.stop, 'min'), rate: u(0, 'mg/min') }], u(END, 'min'), u(1 / 60, 'min'));
  const rows = states.map(s => ({ ...s, ...concentrations(s, evaluation.parameters), rate: s.time < course.stop ? course.rate : 0, target: null as number | null }));
  return { evaluation, rows };
}
export type Sample = ReturnType<typeof buildScenario>['rows'][number];
export const defaultTargets: TargetEvent[] = [{id:'initial',time:0,target:3},{id:'increase',time:4,target:4},{id:'decrease',time:18,target:2.5},{id:'stop',time:45,target:0}];
export function buildTCIScenario(patient: PatientCovariates, mode: TargetMode, events: TargetEvent[], model: PKModel = eleveld) {
  const evaluation = model.evaluate(patient);
  return { evaluation, rows: simulateTCI(evaluation.parameters, mode, events, END) as Sample[] };
}
export function sampleAt(rows: Sample[], time: number): Sample {
  // Return the last solved state, never interpolate physical concentrations in UI.
  let lo = 0, hi = rows.length - 1;
  while (lo < hi) { const mid = Math.ceil((lo + hi) / 2); if (rows[mid]!.time <= time) lo = mid; else hi = mid - 1; }
  return rows[lo]!;
}
export const clock = (min: number) => `${Math.floor(min).toString().padStart(2, '0')}:${Math.floor((min % 1) * 60 + 1e-7).toString().padStart(2, '0')}`;
