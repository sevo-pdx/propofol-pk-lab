import { RateEquivalent } from './RateEquivalent';
import type { Kg } from '../models/units';
import type { PKParameters } from '../models/types';
import { mathematicalView, type FlowKey } from '../simulation/mathView';
import type { Sample } from './scenario';
import { clock } from './scenario';
interface Props { weight:Kg; sample:Sample; parameters:PKParameters; selected:FlowKey|null; onSelect:(flow:FlowKey|null)=>void }
const number = (v:number) => Math.abs(v)>0 && Math.abs(v)<0.0005 ? v.toExponential(2) : (Object.is(v,-0)?0:v).toFixed(3);
const signed = (v:number) => `${v>0?'+':''}${number(v)}`;
export function MathView({weight,sample,parameters,selected,onSelect}:Props) {
  const model=mathematicalView(sample,parameters,sample.rate);
  return <section className="card math-view" aria-label="Live PK/PD mathematics">
    <div className="section-title"><div><div className="eyebrow">THE EQUATIONS IN MOTION</div><h2>Every flow has a term.</h2></div><span className="mini-tag">AT PLAYHEAD {clock(sample.time)}</span></div>
    <p className="explain">These are the instantaneous derivatives used by the RK4 solver. Select a term to highlight its pathway in the diagram above. Values follow the playhead, including when paused or seeking.</p>
    <div className="math-legend"><span className="term-entering">+ Entering</span><span className="term-leaving">− Leaving</span><span className="term-elimination">− Elimination</span><span className="term-equilibration">Virtual equilibration</span></div>
    <div className="math-grid">{model.equations.map(eq=><article className="equation-card" key={eq.id}>
      <h3>{eq.title}</h3><p className="equation-formula">{eq.lhs} = {eq.terms.map((term,i)=>`${i===0&&term.sign===1?'':term.sign===1?'+ ':'− '}${term.symbol}`).join(' ')}</p><div className="equation-lhs">{eq.lhs} = <strong>{signed(eq.result)}</strong> <small>{eq.unit}</small></div>
      <div className="equation-terms">{eq.terms.map((term,i)=><button key={i} className={`equation-term term-${term.role}`} aria-pressed={selected===term.flow} onClick={()=>onSelect(selected===term.flow?null:term.flow)} aria-label={`${eq.title}: ${term.label}`}>
        <span className="term-symbol">{i===0&&term.sign===1?'':term.sign===1?'+ ':'− '}{term.symbol}</span>
        <span className="term-substitution">{term.flow==='effect'?`${number(term.factors[0]!)} × (${number(term.factors[1]!)} − ${number(term.factors[2]!)})`:term.factors.map(number).join(' × ')}</span>
        <b>{term.sign===-1?'− ':term.flow==='effect'?'':'+ '}{number(term.value)} <small>{eq.unit}</small></b>{term.flow==='input'&&<RateEquivalent rate={term.value} weight={weight}/>}<span className="term-description">{term.label}</span>
      </button>)}</div>
      <p className="equation-outcome">{eq.id==='effect'?'Ce changes through equilibration; it is never set equal to the target.':'Positive means mass is increasing; negative means mass is decreasing.'}</p>
    </article>)}</div>
    <div className="math-balance"><h3>Redistribution cancels in the mass balance</h3><p>d(A1 + A2 + A3)/dt = R − CL × Cp</p><p>{number(model.input)} − {number(model.elimination)} = <b>{signed(model.totalMassDerivative)} mg/min</b></p><p className="explain">The virtual effect site adds no physical mass. Cp = A1/V1, C2 = A2/V2, C3 = A3/V3. Mass is in mg, volume in L, clearances in L/min and ke0 in min⁻¹. 1 mg/L = 1 µg/mL. Rounded substitutions may differ slightly from the full-precision result. The diagram shows net Q2/Q3 exchange; the equations show both directional flows.</p></div>
    {selected&&<button className="text-button" onClick={()=>onSelect(null)}>Clear pathway highlight</button>}
  </section>;
}
