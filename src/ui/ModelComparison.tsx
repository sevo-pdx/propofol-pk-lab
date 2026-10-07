import {useLayoutEffect,useRef,useState} from 'react';
import {curveStepAfter,line,scaleLinear} from 'd3';
import type {PatientCovariates} from '../models/types';
import {modelDetails,type ModelKey} from '../models/registry';
import {microconstants} from '../simulation/equations';
import type {ComparisonResult} from './comparison';
import {clock,sampleAt,type Sample} from './scenario';
import {RateEquivalent} from './RateEquivalent';
const colors:Record<ModelKey,string>={eleveld:'#087d79',schnider:'#7660ba',marsh:'#a26527'};
interface Props {results:ComparisonResult[];patient:PatientCovariates;time:number;preview:boolean;duration:number;mode:string;onSeek:(t:number)=>void}
export function ModelComparison({results,patient,time,preview,duration,mode,onSeek}:Props){
 const host=useRef<HTMLDivElement>(null),[width,setWidth]=useState(700),[hover,setHover]=useState<number|null>(null),[micro,setMicro]=useState(false);
 useLayoutEffect(()=>{const observer=new ResizeObserver(entries=>setWidth(entries[0]!.contentRect.width));if(host.current)observer.observe(host.current);return()=>observer.disconnect();},[]);
 const available=results.filter(r=>r.available);
 const start=preview?0:Math.max(0,time-20),end=preview?duration:Math.max(20,time);
 const inspectedTime=hover===null?time:Math.max(start,Math.min(hover,preview?end:time));
 const snapshots=available.map(r=>({...r,sample:sampleAt(r.rows,inspectedTime)}));
 const x=scaleLinear().domain([start,end]).range([48,width-20]);
 const titles={cp:'Plasma · Cp',ce:'Effect site · Ce',rate:'Simulated administration'};
 function pointer(e:React.PointerEvent<SVGSVGElement>|React.MouseEvent<SVGSVGElement>){const b=e.currentTarget.getBoundingClientRect();return Math.max(start,Math.min(preview?end:time,x.invert((e.clientX-b.left)/b.width*width)));}
 const parameters=micro?['k10','k12','k21','k13','k31','ke0']:['v1','v2','v3','cl','q2','q3','ke0'];
 return <section className="card comparison" aria-label="Model comparison">
  <div className="section-title"><div><div className="eyebrow">SAME PATIENT · SAME EXPERIMENT</div><h2>One target is not one administration profile.</h2></div><span className="mini-tag">{mode==='prescribed'?'SAME PRESCRIBED INPUT':`SAME ${mode.toUpperCase()} TARGETS`}</span></div>
  <p className="explain">{mode==='prescribed'?'Each model receives the identical prescribed administration; differences in concentration reflect its PK parameters.':'Each model independently calculates simulated administration for the same target sequence. Differences reflect population-model parameters and effect-site assumptions, not a ranking of clinical performance.'} The plots follow the shared playback clock and Full course / Live window setting above. Each plot has its own vertical scale, shared by all three models.</p>
  <p className="comparison-patient">Applied covariates: {patient.age} yr · {patient.sex} · {patient.height} cm · {patient.weight} kg · concomitant drugs {patient.concomitantAnaesthetics?'present':'absent'}{patient.postMenstrualAge!==undefined?` · PMA ${patient.postMenstrualAge} weeks`:''}. Each model uses only its own covariates.</p>
  <div className="comparison-legend">{results.map(r=><span key={r.key}><i style={{background:colors[r.key]}}/>{r.name}{!r.available?' · unavailable':''}</span>)}<span><i className="target-swatch"/>Target (when applicable)</span></div>
  {results.filter(r=>!r.available).map(r=><p className="model-caution" key={r.key}><strong>{r.name} unavailable: </strong>{!r.available&&r.reason} No replacement model or patient is used.</p>)}
  <div ref={host} className="comparison-plots">{(['cp','ce','rate']as const).map(metric=>{
   const max=Math.max(1,...available.map(r=>Math.max(...r.rows.map(s=>Math.max(s[metric],mode===metric?s.target??0:0)))));
   const y=scaleLinear().domain([0,max*1.1]).nice().range([164,15]);
   const path=line<Sample>().x(s=>x(s.time)).y(s=>y(s[metric]));if(metric==='rate')path.curve(curveStepAfter);
   const target=line<Sample>().x(s=>x(s.time)).y(s=>y(s.target??0)).curve(curveStepAfter);
   const visible=(rows:Sample[])=>rows.filter(s=>s.time>=start&&s.time<=(preview?end:time));
   return <div key={metric}><div className="chart-title"><h3>{titles[metric]}</h3><span className="subtle">{metric==='rate'?'mg/min':'µg/mL'}</span></div>
    <svg viewBox={`0 0 ${width} 200`} role="img" aria-label={`${titles[metric]} comparison over time`} onPointerMove={e=>setHover(pointer(e))} onPointerLeave={()=>setHover(null)} onClick={e=>onSeek(pointer(e))}>
     {y.ticks(4).map(v=><g key={v}><line className="grid" x1="48" x2={width-20} y1={y(v)} y2={y(v)}/><text x="40" y={y(v)+4} textAnchor="end">{metric==='rate'?v:v.toFixed(1)}</text></g>)}
     {x.ticks(width<500?3:6).map(v=><text key={v} x={x(v)} y="190" textAnchor="middle">{clock(v)}</text>)}
     {mode===metric&&available[0]&&<path className="target-line" d={target(visible(available[0].rows))??''}/>}
     {available.map(r=><path key={r.key} d={path(visible(r.rows))??''} fill="none" stroke={colors[r.key]} strokeWidth="2.3" strokeDasharray={r.key==='schnider'?'8 3':r.key==='marsh'?'3 3':undefined}/>)}
     <line className="playhead" x1={x(time)} x2={x(time)} y1="15" y2="164"/>
     {hover!==null&&<line className="hover-line" x1={x(inspectedTime)} x2={x(inspectedTime)} y1="15" y2="164"/>}
    </svg></div>;
  })}</div>
  <h3>{hover===null?'At playhead':'Cursor inspection'} · {clock(inspectedTime)}</h3>
  <p className="explain">Hover over any comparison plot to inspect all models at the same time; click to seek. Total administered mass is cumulative to that time, not the full-course total. Tables scroll horizontally on smaller screens.</p>
  <div className="comparison-table-scroll" tabIndex={0} role="region" aria-label="Concentration and simulated administration comparison"><table><thead><tr><th scope="col">Model</th><th scope="col">Cp<br/>µg/mL</th><th scope="col">Ce<br/>µg/mL</th><th scope="col">Target<br/>µg/mL</th><th scope="col">Simulated rate<br/>mg/min</th><th scope="col">Total administered<br/>mg</th></tr></thead><tbody>{snapshots.map(r=><tr key={r.key}><th scope="row" style={{color:colors[r.key]}} title={r.name}>{modelDetails[r.key].label}</th><td>{r.sample.cp.toFixed(3)}</td><td>{r.sample.ce.toFixed(3)}</td><td>{r.sample.target===null?'—':r.sample.target.toFixed(2)}</td><td>{r.sample.rate.toFixed(2)}<RateEquivalent rate={r.sample.rate} weight={patient.weight}/></td><td>{r.sample.administered.toFixed(2)}</td></tr>)}</tbody></table></div>
  <div className="section-title comparison-parameter-heading"><h3>Model parameters for this patient</h3><div className="segmented"><button aria-pressed={!micro} className={!micro?'active':''} onClick={()=>setMicro(false)}>Volumes / clearances</button><button aria-pressed={micro} className={micro?'active':''} onClick={()=>setMicro(true)}>Microconstants</button></div></div>
  <div className="comparison-table-scroll" tabIndex={0} role="region" aria-label="Model parameter comparison"><table><thead><tr><th scope="col">Parameter</th>{available.map(r=><th scope="col" key={r.key} title={r.name}>{modelDetails[r.key].label}</th>)}</tr></thead><tbody>{parameters.map(key=><tr key={key}><th scope="row">{key==='cl'?'CL':key.replace('v','V').replace('q','Q')} <small>{micro||key==='ke0'?'min⁻¹':key.startsWith('v')?'L':'L/min'}</small></th>{available.map(r=><td key={r.key}>{Object.entries(micro?microconstants(r.evaluation.parameters):r.evaluation.parameters).find(([k])=>k===key)![1].toFixed(4)}</td>)}</tr>)}</tbody></table></div>
  <p className="explain">k10 = CL/V1; k12 = Q2/V1; k21 = Q2/V2; k13 = Q3/V1; k31 = Q3/V3. ke0 is an effect-site parameter, not a physical transfer clearance. Marsh uses the explicitly added 0.26 min⁻¹ pairing; Schnider uses fixed 0.456 min⁻¹. Source details remain in References & about.</p>
  <details className="controller-note"><summary>Model-specific assumptions and limitations</summary>{results.map(r=><div key={r.key}><h3>{r.name}</h3>{r.available?r.evaluation.notes.map(n=><p key={n}>{n}</p>):<p>{r.reason}</p>}</div>)}</details>
 </section>;
}
