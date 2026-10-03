import type { PKParameters, PKState } from '../models/types';
import { quantity as u, positive } from '../models/units';
import { advance } from './integrator';
import { zeroState, concentrations } from './equations';

export type TargetMode = 'cp' | 'ce';
export interface TargetEvent { id: string; time: number; target: number }
export interface ControllerOptions {
  controlInterval?: number; forecastStep?: number; forecastHorizon?: number; integrationStep?: number;
}
export interface TCISample extends PKState {
  cp: number; c2: number; c3: number; rate: number; target: number;
}
export function validateEvents(events: readonly TargetEvent[], end: number): TargetEvent[] {
  u(end, 'min');
  if (events.length > 200) throw new Error('Use at most 200 target events per experiment.'); // Resource limit, not clinical.
  const sorted = events.map(e => ({ ...e })).sort((a, b) => a.time - b.time);
  const ids = new Set<string>();
  for (let i = 0; i < sorted.length; i++) {
    const e = sorted[i]!;
    u(e.time, 'min'); u(e.target, 'mg/L');
    if (e.time > end) throw new Error('Target event is outside the experiment.');
    if (!e.id || ids.has(e.id)) throw new Error('Target event IDs must be unique.');
    if (i && Math.abs(e.time - sorted[i - 1]!.time) < 1e-8) throw new Error('Two target events cannot share a timestamp.');
    ids.add(e.id);
  }
  return sorted;
}
export function upsertTarget(events: readonly TargetEvent[], event: TargetEvent, end = 60): TargetEvent[] {
  return validateEvents([...events.filter(e => e.id !== event.id), event], end);
}
export function targetAt(events: readonly TargetEvent[], time: number): number {
  let target = 0;
  for (const event of events) { if (event.time > time + 1e-10) break; target = event.target; }
  return target;
}

/** Educational finite-pulse predictor. This is a documented numerical controller,
 * NOT a reproduction of a commercial controller or a new PK/PD model.
 * All dynamics come from the unchanged Eleveld/three-compartment engine.
 * The constants below are numerical design choices, not pharmacological constants.
 */
export function createController(p: PKParameters, mode: TargetMode, options: ControllerOptions = {}) {
  if (mode !== 'cp' && mode !== 'ce') throw new Error('Unknown targeting mode');
  const interval = options.controlInterval ?? 1 / 6; // Recalculate every 10 simulated seconds.
  const forecastStep = options.forecastStep ?? 1 / 12; // Forecast samples every 5 simulated seconds.
  if (mode === 'ce') positive(p.ke0, 'Effect-site ke0');
  const horizon = options.forecastHorizon ?? (mode === 'ce' ? Math.max(20, 8 / p.ke0) : 20); // Ce: >=8 equilibration time constants.
  const integrationStep = options.integrationStep ?? 1 / 60;
  for (const [key, value] of Object.entries({ interval, forecastStep, horizon, integrationStep })) positive(value, key);
  if (horizon < interval) throw new Error('Forecast horizon must cover the input pulse.');
  if (interval > 1 || interval < 1 / 600 || horizon > 300 || forecastStep < 1 / 600 || horizon / forecastStep > 10000) throw new Error('Controller numerical settings exceed the supported computation range.');
  const odeOptions = { maxStep: u(integrationStep, 'min') };
  const step = (s: PKState, rate: number, duration: number) => advance(s, p, u(rate, 'mg/min'), u(duration, 'min'), odeOptions);
  const bases = [
    { ...zeroState(), a1: u(1, 'mg') }, { ...zeroState(), a2: u(1, 'mg') },
    { ...zeroState(), a3: u(1, 'mg') }, { ...zeroState(), ce: u(1, 'mg/L') },
  ];
  type Prediction = { free: number[]; pulse: number };
  let forecast: Prediction[] = [];
  if (mode === 'cp') {
    forecast = [{ free: bases.map(s => step(s, 0, interval).a1 / p.v1), pulse: step(zeroState(), 1, interval).a1 / p.v1 }];
  } else {
    positive(p.ke0, 'Effect-site ke0');
    // Superposition: Ce(t) = F(t)·[A1,A2,A3,Ce] + R·G(t).
    // G is the response to 1 mg/min for one control interval, then zero.
    let free = bases, pulse = zeroState(), previous = 0;
    const count = Math.ceil(horizon / forecastStep);
    const times = [...new Set([interval, ...Array.from({ length: count }, (_, i) => (i + 1) * horizon / count)])].sort((a, b) => a - b);
    for (const t of times) {
      const dt = t - previous;
      free = free.map(s => step(s, 0, dt));
      pulse = step(pulse, previous < interval - 1e-10 ? 1 : 0, dt);
      forecast.push({ free: free.map(s => s.ce), pulse: pulse.ce });
      previous = t;
    }
  }
  return {
    interval, horizon, forecastStep,
    rate(s: PKState, target: number): number {
      u(target, 'mg/L');
      if (target === 0) return 0;
      const state = [s.a1, s.a2, s.a3, s.ce];
      let result = Infinity;
      for (const f of forecast) {
        const free = f.free.reduce((sum, coefficient, i) => sum + coefficient * state[i]!, 0);
        if (free >= target) return 0; // Residual drug is enough; administration cannot be negative.
        if (f.pulse > 0) result = Math.min(result, (target - free) / f.pulse);
      }
      if (!Number.isFinite(result) || result < 0) throw new Error('Cannot solve simulated input for these settings.');
      return result;
    },
  };
}

/** Causal simulation: future target events never influence earlier rates.
 * Controls use a fixed pulse horizon even immediately before an event. The actual
 * interval is split exactly at that event and the new target is evaluated there.
 */
export function simulateTCI(p: PKParameters, mode: TargetMode, events: readonly TargetEvent[], end = 60, options: ControllerOptions = {}): TCISample[] {
  const sorted = validateEvents(events, end);
  if (end > 240) throw new Error('Experiment exceeds 240 minutes.'); // Resource policy.
  const controller = createController(p, mode, options);
  const controls = new Set<number>([0, ...sorted.map(e => e.time)]);
  for (let i = 1; i * controller.interval < end; i++) controls.add(i * controller.interval);
  const boundaries = [...controls, end];
  for (let i = 1; i / 60 < end; i++) boundaries.push(i / 60);
  const times = boundaries.sort((a, b) => a - b).filter((t, i, list) => i === 0 || t - list[i - 1]! > 1e-10);
  const decisions = [...controls].sort((a, b) => a - b);
  let decision = 0, state = zeroState(), rate = 0;
  const rows: TCISample[] = [];
  for (const time of times) {
    state = advance(state, p, u(rate, 'mg/min'), u(Math.max(0, time - state.time), 'min'), { maxStep: u(options.integrationStep ?? 1 / 60, 'min') });
    const target = targetAt(sorted, time);
    if (decision < decisions.length && decisions[decision]! <= time + 1e-10) {
      rate = controller.rate(state, target);
      while (decision < decisions.length && decisions[decision]! <= time + 1e-10) decision++;
    }
    rows.push({ ...state, ...concentrations(state, p), rate, target });
  }
  return rows;
}
