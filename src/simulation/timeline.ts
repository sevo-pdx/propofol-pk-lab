import type { PKParameters, PKState } from '../models/types';
import { type MgPerMin, type Minutes, positive, quantity as u } from '../models/units';
import { advance, type IntegratorOptions } from './integrator';
import { zeroState } from './equations';
export interface RateEvent { readonly time: Minutes; readonly rate: MgPerMin }
/** Prescribed hypothetical input history; this is NOT a TCI controller.
 * Events are right-continuous and integration lands exactly on each timestamp.
 * Snapshots include event times and regular sampling times. No wall-clock access.
 */
export function simulate(p: PKParameters, events: readonly RateEvent[], end: Minutes, sampleEvery: Minutes = u(1, 'min'), options: IntegratorOptions = {}): PKState[] {
  u(end, 'min'); positive(sampleEvery, 'sampleEvery');
  const sorted = [...events].sort((a, b) => a.time - b.time);
  sorted.forEach((e, i) => {
    u(e.time, 'min'); u(e.rate, 'mg/min');
    if (i > 0 && e.time === sorted[i - 1]!.time) throw new RangeError('Duplicate event time');
    if (e.time > end) throw new RangeError('Event after simulation end');
  });
  const sampleCount = Math.floor(end / sampleEvery);
  if (!Number.isSafeInteger(sampleCount) || sampleCount > 100_000) throw new RangeError('Too many samples');
  const times = new Set<number>([0, end, ...sorted.map(e => e.time)]);
  for (let i = 1; i <= sampleCount; i++) times.add(i * sampleEvery);
  let state = zeroState(), rate = u(0, 'mg/min'), nextEvent = 0;
  const result: PKState[] = [];
  for (const time of [...times].sort((a, b) => a - b)) {
    state = advance(state, p, rate, u(time - state.time, 'min'), options);
    while (nextEvent < sorted.length && sorted[nextEvent]!.time <= time) rate = sorted[nextEvent++]!.rate;
    result.push(state);
  }
  return result;
}
