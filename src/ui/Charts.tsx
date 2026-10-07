import {administrationTrend,loadingPulses,type RateTrend} from './administrationView';
import {lastObservedBIS,type BISObservation} from '../observations/bis';
import { RateEquivalent } from './RateEquivalent';
import type { Kg } from '../models/units';
import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { curveStepAfter, line, scaleLinear } from 'd3';
import type { Sample } from './scenario';
import { clock, sampleAt } from './scenario';
interface Props { observations?:BISObservation[]; weight:Kg; rows: Sample[]; time: number; stop: number | null; mode?: string; preview: boolean; onSeek: (time: number) => void }
export function Charts({ observations=[], weight, rows, time, stop, preview, onSeek, mode }: Props) {
  const [showTrend,setShowTrend]=useState(true);
  const [averageSeconds,setAverageSeconds]=useState(60);
  const [includeLoading,setIncludeLoading]=useState(false);
  const trend=useMemo(()=>administrationTrend(rows,weight,averageSeconds/60),[rows,weight,averageSeconds]);
  const [hover, setHover] = useState<number | null>(null);
  const title = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(900);
  useLayoutEffect(() => {
    const observer = new ResizeObserver(entries => setWidth(entries[0]!.contentRect.width));
    if (title.current) observer.observe(title.current);
    return () => observer.disconnect();
  }, []);
  const start = preview ? 0 : Math.max(0, time - 20);
  const end = preview ? 60 : Math.max(20, time);
  const plotRight=width-(showTrend?62:20);
  const x = scaleLinear().domain([start, end]).range([45, plotRight]);
  const y = scaleLinear().domain([0, Math.max(2, ...rows.map(r => Math.max(r.cp, r.ce, r.target ?? 0))) * 1.13]).nice().range([244, 20]);
  const ry = scaleLinear().domain([0, Math.max(1, ...rows.map(r => r.rate)) * 1.3]).nice().range([100, 10]);
  const visible = rows.filter(r => r.time >= start && r.time <= (preview ? end : time));
  const visibleTrend=trend.filter(r=>r.time>=start&&r.time<=(preview?end:time));
  const trendValue=(r:RateTrend)=>includeLoading?r.allInput:r.ongoing;
  const sy=scaleLinear().domain([0,Math.max(1,...visibleTrend.map(r=>trendValue(r)??0))*1.13]).nice().range([244,20]);
  const trendLine=line<RateTrend>().defined(r=>trendValue(r)!==null).x(r=>x(r.time)).y(r=>sy(trendValue(r)??0));
  const pulses=loadingPulses(rows,preview?end:time).filter(p=>p.end>start&&p.start<end);
  const bands=(bottom:number,top=20)=>pulses.map(p=><g key={p.start}><rect className="loading-band" x={x(Math.max(start,p.start))} width={Math.max(0,x(p.end)-x(Math.max(start,p.start)))} y={top} height={bottom-top}/><line className="loading-marker" x1={x(Math.max(start,p.start))} x2={x(Math.max(start,p.start))} y1={top} y2={bottom}/></g>);
  const cp = line<Sample>().x(r => x(r.time)).y(r => y(r.cp));
  const ce = line<Sample>().x(r => x(r.time)).y(r => y(r.ce));
  const target = line<Sample>().defined(r => r.target !== null).x(r => x(r.time)).y(r => y(r.target ?? 0)).curve(curveStepAfter);
  const rate = line<Sample>().x(r => x(r.time)).y(r => ry(r.rate)).curve(curveStepAfter);
  const inspected = sampleAt(rows, hover === null ? time : Math.max(start, Math.min(hover, preview ? end : time)));
  const inspectedTrend=trend[rows.indexOf(inspected)];
  const bis=lastObservedBIS(observations,inspected.time);
  function pointer(e: React.MouseEvent<SVGSVGElement>) { const b = e.currentTarget.getBoundingClientRect(); return Math.max(start, Math.min(preview ? end : time, x.invert((e.clientX - b.left) / b.width * width))); }
  return <>
    <div className="chart-title" ref={title}><h2>Concentration over time</h2><div className="legend"><span className="cp-key">Plasma Cp</span><span className="ce-key">Effect site Ce</span>{mode !== 'prescribed' && <span className="target-key">Target {mode?.toUpperCase()}</span>}{showTrend&&<span className="smooth-key">{includeLoading?'All input':'Ongoing input'} · right axis</span>}<span className="loading-key">Loading pulse</span></div></div>
    <div className="rate-trend-controls"><label><input type="checkbox" checked={showTrend} onChange={e=>setShowTrend(e.target.checked)}/> Show smoothed input</label>{showTrend&&<><label>Trailing average<select aria-label="Rate averaging window" value={averageSeconds} onChange={e=>setAverageSeconds(Number(e.target.value))}>{[30,60,120].map(v=><option key={v} value={v}>{v} seconds</option>)}</select></label><label><input type="checkbox" checked={includeLoading} onChange={e=>setIncludeLoading(e.target.checked)}/> Include loading pulses in average</label></>}</div>
    <div className="dual-chart-units"><span>CONCENTRATION · µg/mL</span>{showTrend&&<span className="smooth-text">SIMULATED INPUT · mcg/kg/min</span>}</div>
    <svg className="concentration-chart" viewBox={`0 0 ${width} 288`} role="img" aria-label="Predicted plasma and effect-site concentration over simulated time" onPointerMove={e => setHover(pointer(e))} onPointerLeave={() => setHover(null)} onClick={e => onSeek(pointer(e))}>
      {bands(244)}
      {showTrend&&sy.ticks(4).map(t=><g key={t}><line className="smooth-axis" x1={plotRight} x2={plotRight+4} y1={sy(t)} y2={sy(t)}/><text className="smooth-axis" x={plotRight+8} y={sy(t)+4}>{t.toLocaleString(undefined,{maximumFractionDigits:sy.domain()[1]!<10?1:0})}</text></g>)}
      {y.ticks(5).map(t => <g key={t}><line className="grid" x1="45" x2={plotRight} y1={y(t)} y2={y(t)}/><text x="32" y={y(t) + 4} textAnchor="end">{t.toFixed(1)}</text></g>)}
      {x.ticks(width < 500 ? 3 : 6).map(t => <g key={t}><line className="grid vertical" x1={x(t)} x2={x(t)} y1="20" y2="244"/><text x={x(t)} y="272" textAnchor="middle">{clock(t)}</text></g>)}
      {stop !== null && stop >= start && stop <= end && <g><line className="event-line" x1={x(stop)} x2={x(stop)} y1="20" y2="244"/><text x={x(stop) + 8} y="34" className="event-label">Input stops</text></g>}
      {showTrend&&<path d={trendLine(visibleTrend)??''} className="smooth-line"/>}
      <path d={target(visible) ?? ''} className="target-line"/>
      <path d={cp(visible) ?? ''} className="cp-line"/><path d={ce(visible) ?? ''} className="ce-line"/>
      <line className="playhead" x1={x(time)} x2={x(time)} y1="20" y2="244"/>
      {hover !== null && <line className="hover-line" x1={x(hover)} x2={x(hover)} y1="20" y2="244"/>}
      <circle cx={x(inspected.time)} cy={y(inspected.cp)} r="5" fill="var(--teal)"/><circle cx={x(inspected.time)} cy={y(inspected.ce)} r="5" fill="var(--violet)"/>
    </svg>
    <div className="inspection" aria-live="off"><span>{hover === null ? 'PLAYHEAD' : 'INSPECT'} <b>{clock(inspected.time)}</b></span><span>Cp <b className="teal">{inspected.cp.toFixed(3)}</b></span><span>Ce <b className="violet">{inspected.ce.toFixed(3)}</b></span><span>Target <b>{inspected.target === null ? '—' : inspected.target.toFixed(2)}</b></span><span>Input <b>{inspected.rate.toFixed(1)} mg/min</b><RateEquivalent rate={inspected.rate} weight={weight}/></span><span>Total <b>{inspected.administered.toFixed(1)} mg</b></span>{showTrend&&<span>Smoothed {includeLoading?'all input':'ongoing input'}<b className="smooth-text">{(includeLoading?inspectedTrend?.allInput:inspectedTrend?.ongoing)?.toFixed(1)??'—'} mcg/kg/min</b></span>}{inspected.loadingPulseStart!==null&&<span className="loading-text">LOADING / BOLUS-LIKE PULSE</span>}{bis&&<span>Last observed BIS <b>{bis.bis} at {clock(bis.time)}</b></span>}</div>
    <div className="chart-title rate-title"><h2>Simulated administration</h2><span className="subtle">mg/min</span></div>
    <svg className="rate-chart" viewBox={`0 0 ${width} 133`} role="img" aria-label="Simulated administration rate over time" onPointerMove={e => setHover(pointer(e))} onPointerLeave={() => setHover(null)} onClick={e => onSeek(pointer(e))}>
      {bands(100,10)}
      {ry.ticks(3).map(t => <g key={t}><line className="grid" x1="45" x2={plotRight} y1={ry(t)} y2={ry(t)}/><text x="32" y={ry(t) + 4} textAnchor="end">{t}</text></g>)}
      {x.ticks(width < 500 ? 3 : 6).map(t => <text key={t} x={x(t)} y="125" textAnchor="middle">{clock(t)}</text>)}
      <path d={rate(visible) ?? ''} className="rate-line"/>
      <line className="playhead" x1={x(time)} x2={x(time)} y1="10" y2="100"/>
    </svg>
    <p className="trend-explanation">{showTrend?`${averageSeconds}-second trailing, time-weighted mean · applied weight ${weight} kg. ${includeLoading?'Includes all simulated input.':'Loading pulses excluded from the rate trend; their mass remains in Cp, Ce and total administered mass.'} `:''}{mode==='prescribed'?'This view shows the prescribed simulated input.':'The sawtooth reflects this simulator’s 10-second controller, not a particular infusion pump.'}</p>
    {pulses.length>0&&<div className="loading-summary">Loading / bolus-like pulses: {pulses.map(p=><button key={p.start} onClick={()=>onSeek(p.start)}>{clock(p.start)} · {p.mass.toFixed(1)} mg{!p.complete?' so far':''}</button>)}</div>}
    <details className="loading-explanation"><summary>Loading / bolus-like pulses · {pulses.length} in view</summary><p>Shading marks the entire first positive control interval immediately after a target increase, normally up to 10 seconds. This is a display convention for a simulated loading pulse, not a separately prescribed bolus. Later pulses can also be large; they remain in the ongoing-input trend. No rate threshold is used.</p><p>The average integrates input over the preceding window. At the start it uses only elapsed time; at 00:00 no average exists. A trailing average may remain above zero briefly after input stops. Axis scales differ: concentrations use the left axis and rate uses the blue right axis.</p><div className="loading-pulse-list">{pulses.map(p=><button key={p.start} onClick={()=>onSeek(p.start)}>{clock(p.start)}–{clock(p.end)}<strong>{p.mass.toFixed(1)} mg{!p.complete?' so far':''}</strong><span>Simulated loading pulse · click to inspect</span></button>)}</div>{!pulses.length&&<p>No loading pulses in this view.</p>}</details>
    <div className="chart-foot"><span>Elapsed simulation time · min:sec</span><span>Hover to inspect · click to seek</span></div>
  </>;
}
