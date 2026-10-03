import type { PKParameters, PKState } from '../models/types';
import { concentrations, derivative, fluxes, type Vector } from './equations';

export type FlowKey = 'input' | 'rapid' | 'slow' | 'elimination' | 'effect';
export interface EquationTerm {
  symbol: string; factors: number[]; value: number; sign: 1 | -1;
  role: 'entering' | 'leaving' | 'elimination' | 'equilibration';
  flow: FlowKey; label: string;
}
export interface LiveEquation {
  id: string; title: string; lhs: string; unit: string;
  terms: EquationTerm[]; result: number;
}
/** Presentation data for the E2018 p.943 mammillary structure already evaluated
 * in equations.ts. Uses the solver's fluxes and derivative, not a second PK model.
 * Expanded directional exchange terms show why redistribution cancels in the
 * total physical-mass balance. Display rounding must never feed the solver.
 */
export function mathematicalView(s: PKState, p: PKParameters, rate: number) {
  const y: Vector = [s.a1,s.a2,s.a3,s.ce,s.administered,s.eliminated];
  const f = fluxes(y,p,rate), d = derivative(y,p,rate), c = concentrations(s,p);
  const term = (symbol:string,factors:number[],value:number,sign:1|-1,role:EquationTerm['role'],flow:FlowKey,label:string):EquationTerm => ({symbol,factors,value,sign,role,flow,label});
  const exchange = (rapid:boolean,entering:boolean,central:boolean) => {
    const q=rapid?p.q2:p.q3, peripheral=rapid?c.c2:c.c3;
    const outward=central?!entering:entering;
    return term(`Q${rapid?'2':'3'} × ${outward?'Cp':rapid?'C2':'C3'}`,[q,outward?c.cp:peripheral],
      rapid?(outward?f.centralToRapid:f.rapidToCentral):(outward?f.centralToSlow:f.slowToCentral),
      entering?1:-1,entering?'entering':'leaving',rapid?'rapid':'slow',
      `${outward?'V1':rapid?'V2':'V3'} → ${outward?(rapid?'V2':'V3'):'V1'}`);
  };
  const equations:LiveEquation[] = [
    {id:'central',title:'Central · V1',lhs:'dA1/dt',unit:'mg/min',result:d[0],terms:[
      term('R',[rate],f.input,1,'entering','input','Simulated input → V1'),
      term('CL × Cp',[p.cl,c.cp],f.elimination,-1,'elimination','elimination','V1 → elimination'),
      exchange(true,false,true),exchange(true,true,true),exchange(false,false,true),exchange(false,true,true)]},
    {id:'rapid',title:'Rapid peripheral · V2',lhs:'dA2/dt',unit:'mg/min',result:d[1],terms:[exchange(true,true,false),exchange(true,false,false)]},
    {id:'slow',title:'Slow peripheral · V3',lhs:'dA3/dt',unit:'mg/min',result:d[2],terms:[exchange(false,true,false),exchange(false,false,false)]},
    {id:'effect',title:'Virtual effect site',lhs:'dCe/dt',unit:'µg/mL per min',result:d[3],terms:[
      term('ke0 × (Cp − Ce)',[p.ke0,c.cp,s.ce],f.effectSite,1,'equilibration','effect','Virtual equilibration · no mass transfer')]},
  ];
  return { equations, concentrations:c, totalMassDerivative:d[0]+d[1]+d[2], input:f.input, elimination:f.elimination };
}
