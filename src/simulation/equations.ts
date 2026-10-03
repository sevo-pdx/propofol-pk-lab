import type { Microconstants, PKParameters, PKState } from '../models/types';
import { positive, quantity as u } from '../models/units';
import { effectSiteDerivative } from '../models/effectSite';

export function validateParameters(p: PKParameters): void {
  for (const key of ['v1', 'v2', 'v3'] as const) positive(p[key], key);
  for (const key of ['cl', 'q2', 'q3', 'ke0'] as const) u(p[key], key);
}
export function microconstants(p: PKParameters): Microconstants {
  validateParameters(p);
  return { k10: u(p.cl / p.v1, '1/min'), k12: u(p.q2 / p.v1, '1/min'), k21: u(p.q2 / p.v2, '1/min'), k13: u(p.q3 / p.v1, '1/min'), k31: u(p.q3 / p.v3, '1/min'), ke0: p.ke0 };
}
export function concentrations(s: PKState, p: PKParameters) {
  return { cp: u(s.a1 / p.v1, 'mg/L'), c2: u(s.a2 / p.v2, 'mg/L'), c3: u(s.a3 / p.v3, 'mg/L'), ce: s.ce };
}
export type Vector = [a1: number, a2: number, a3: number, ce: number, administered: number, eliminated: number];
export function fluxes(y: Vector, p: PKParameters, rate: number) {
  const cp = y[0] / p.v1, c2 = y[1] / p.v2, c3 = y[2] / p.v3;
  return { input: rate, centralToRapid: p.q2 * cp, rapidToCentral: p.q2 * c2,
    centralToSlow: p.q3 * cp, slowToCentral: p.q3 * c3, elimination: p.cl * cp,
    effectSite: effectSiteDerivative(cp, y[3], p.ke0) };
}
/** Mass balance for the three-compartment mammillary structure E2018 p.943.
 * A1' = R - CL*C1 - Q2*(C1-C2) - Q3*(C1-C3)
 * A2' = Q2*(C1-C2); A3' = Q3*(C1-C3); Ce' = ke0*(C1-Ce).
 * All mass derivatives mg/min; concentration derivative mg/L/min.
 */
export function derivative(y: Vector, p: PKParameters, rate: number): Vector {
  const f = fluxes(y, p, rate);
  return [f.input - f.elimination - f.centralToRapid + f.rapidToCentral - f.centralToSlow + f.slowToCentral,
    f.centralToRapid - f.rapidToCentral, f.centralToSlow - f.slowToCentral,
    f.effectSite, rate, f.elimination];
}
export const zeroState = (): PKState => ({ time: u(0, 'min'), a1: u(0, 'mg'), a2: u(0, 'mg'), a3: u(0, 'mg'), ce: u(0, 'mg/L'), administered: u(0, 'mg'), eliminated: u(0, 'mg') });
