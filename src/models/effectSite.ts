/** E2018 p.946: virtual first-order effect site, dCe/dt = ke0 (Cp - Ce).
 * Inputs: concentrations mg/L, ke0 /min. Output mg/L/min may be negative.
 * The effect site removes no physical drug mass from V1.
 */
export function effectSiteDerivative(cp: number, ce: number, ke0: number): number {
  return ke0 * (cp - ce);
}
