/** Independent test oracle for a constant-coefficient linear ODE.
 * Matrix exponential via Taylor series after scaling, followed by squaring.
 * Does not call the engine derivative or RK4. This verifies numerical solving,
 * not the scientific validity of the covariate model.
 */
import type { PKParameters } from '../src/models/types';
type Matrix = number[][];
const identity = (n: number): Matrix => Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => +(i === j)));
const mul = (a: Matrix, b: Matrix): Matrix => a.map(row => b[0]!.map((_, j) => row.reduce((s, v, k) => s + v * b[k]![j]!, 0)));
export function oracle(p: PKParameters, time: number, rate: number): number[] {
  const m = [
    [-(p.cl + p.q2 + p.q3) / p.v1, p.q2 / p.v2, p.q3 / p.v3, 0, rate],
    [p.q2 / p.v1, -p.q2 / p.v2, 0, 0, 0],
    [p.q3 / p.v1, 0, -p.q3 / p.v3, 0, 0],
    [p.ke0 / p.v1, 0, 0, -p.ke0, 0],
    [0, 0, 0, 0, 0],
  ];
  const norm = Math.max(...m.map(row => row.reduce((s, x) => s + Math.abs(x), 0))) * time;
  const squarings = Math.max(0, Math.ceil(Math.log2(norm || 1)));
  const a = m.map(row => row.map(x => x * time / 2 ** squarings));
  let result = identity(5), term = identity(5);
  for (let k = 1; k <= 30; k++) {
    term = mul(term, a).map(row => row.map(v => v / k));
    result = result.map((row, i) => row.map((v, j) => v + term[i]![j]!));
  }
  for (let k = 0; k < squarings; k++) result = mul(result, result);
  return result.slice(0, 4).map(row => row[4]!);
}
