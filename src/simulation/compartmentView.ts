import type { PKParameters, PKState } from '../models/types';
import { concentrations, fluxes } from './equations';
export function compartmentView(state: PKState, parameters: PKParameters, rate: number) {
  const c = concentrations(state, parameters);
  const f = fluxes([state.a1,state.a2,state.a3,state.ce,state.administered,state.eliminated], parameters, rate);
  return {
    compartments: [
      {name:'Central · V1',volume:parameters.v1,mass:state.a1,concentration:c.cp},
      {name:'Rapid peripheral · V2',volume:parameters.v2,mass:state.a2,concentration:c.c2},
      {name:'Slow peripheral · V3',volume:parameters.v3,mass:state.a3,concentration:c.c3},
    ],
    ce:state.ce, input:f.input, elimination:f.elimination,
    rapidNet:f.centralToRapid-f.rapidToCentral,
    slowNet:f.centralToSlow-f.slowToCentral,
    effectDerivative:f.effectSite, remaining:state.a1+state.a2+state.a3,
    eliminated:state.eliminated, administered:state.administered,
  };
}
