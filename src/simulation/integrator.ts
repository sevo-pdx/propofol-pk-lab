import type { PKParameters, PKState } from '../models/types';
import { type MgPerMin, type Minutes, positive, quantity as u } from '../models/units';
import { derivative, validateParameters, type Vector } from './equations';

const add = (a: Vector, b: Vector, factor: number): Vector => a.map((v, i) => v + factor * b[i]!) as Vector;
/** Classical RK4. Coefficients are numerical-method constants, not PK parameters. */
export function rk4(y: Vector, h: number, p: PKParameters, rate: number): Vector {
  const k1 = derivative(y, p, rate);
  const k2 = derivative(add(y, k1, h / 2), p, rate);
  const k3 = derivative(add(y, k2, h / 2), p, rate);
  const k4 = derivative(add(y, k3, h), p, rate);
  return y.map((v, i) => v + h * (k1[i]! + 2 * k2[i]! + 2 * k3[i]! + k4[i]!) / 6) as Vector;
}
export interface IntegratorOptions { readonly maxStep?: Minutes }
/** Advance with constant simulated input. Caller must split at every input event.
 * Step cap limits fastest loss rate*h to 0.1 (numerical policy). No clamping:
 * negative or nonfinite states throw rather than concealing a conservation error.
 */
export function advance(s: PKState, p: PKParameters, rate: MgPerMin, duration: Minutes, options: IntegratorOptions = {}): PKState {
  validateParameters(p);
  for (const [k, v] of Object.entries(s)) u(v, k);
  u(rate, 'mg/min'); u(duration, 'min');
  const requested = options.maxStep ?? u(1 / 60, 'min'); // Numerical default: one simulated second.
  positive(requested, 'maxStep');
  const fastest = Math.max((p.cl + p.q2 + p.q3) / p.v1, p.q2 / p.v2, p.q3 / p.v3, p.ke0);
  const cap = Math.min(requested, fastest > 0 ? 0.1 / fastest : requested);
  const count = Math.ceil(duration / cap);
  if (!Number.isSafeInteger(count) || count > 5_000_000) throw new RangeError('Integration workload too large'); // Resource policy, not physiology.
  if (count === 0) return { ...s };
  const h = duration / count;
  let y: Vector = [s.a1, s.a2, s.a3, s.ce, s.administered, s.eliminated];
  for (let i = 0; i < count; i++) {
    y = rk4(y, h, p, rate);
    if (y.some(v => !Number.isFinite(v) || v < 0)) throw new RangeError('Invalid integration state; no values were clamped');
  }
  return { time: u(s.time + duration, 'min'), a1: u(y[0], 'mg'), a2: u(y[1], 'mg'), a3: u(y[2], 'mg'), ce: u(y[3], 'mg/L'), administered: u(y[4], 'mg'), eliminated: u(y[5], 'mg') };
}
