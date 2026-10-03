import { expect, test } from 'vitest';
import { buildScenario, clock, initialPatient, sampleAt } from '../src/ui/scenario';
test('UI scenario preserves engine values and the exact stop boundary', () => {
  const { rows } = buildScenario(initialPatient, { rate: 5, stop: 30.125 });
  expect(sampleAt(rows, 30.125).rate).toBe(0);
  expect(sampleAt(rows, 30.12).rate).toBe(5);
  expect(sampleAt(rows, 60).administered).toBeCloseTo(150.625, 8);
  expect(sampleAt(rows, 10).cp).toBeCloseTo(1.242798, 6);
});
test('seeking returns the last solved state rather than future values', () => {
  const { rows } = buildScenario(initialPatient, { rate: 5, stop: 30 });
  expect(sampleAt(rows, 10.009).time).toBeLessThanOrEqual(10.009);
  expect(sampleAt(rows, 0).cp).toBe(0);
  expect(sampleAt(rows, 60).time).toBe(60);
});
test('invalid UI course values are rejected before applying', () => {
  for (const stop of [0, -1, 61, NaN]) expect(() => buildScenario(initialPatient, { rate: 5, stop })).toThrow();
  expect(() => buildScenario(initialPatient, { rate: -1, stop: 30 })).toThrow();
});
test('clock renders boundaries in minutes and seconds', () => {
  expect(clock(0)).toBe('00:00'); expect(clock(1 / 60)).toBe('00:01'); expect(clock(60)).toBe('60:00');
});
