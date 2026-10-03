import {lastObservedBIS,type BISObservation} from '../observations/bis';
import { RateEquivalent } from './RateEquivalent';
import type { Kg } from '../models/units';
import { useLayoutEffect, useRef, useState } from 'react';
import { curveStepAfter, line, scaleLinear } from 'd3';
import type { Sample } from './scenario';
import { clock, sampleAt } from './scenario';
interface Props { observations?:BISObservation[]; weight:Kg; rows: Sample[]; time: number; stop: number | null; mode?: string; preview: boolean; onSeek: (time: number) => void }
export function Charts({ observations=[], weight, rows, time, stop, preview, onSeek, mode }: Props) {
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
  const x = scaleLinear().domain([start, end]).range([45, width - 20]);
  const y = scaleLinear().domain([0, Math.max(2, ...rows.map(r => Math.max(r.cp, r.ce, r.target ?? 0))) * 1.13]).nice().range([244, 20]);
  const ry = scaleLinear().domain([0, Math.max(1, ...rows.map(r => r.rate)) * 1.3]).nice().range([100, 10]);
  const visible = rows.filter(r => r.time >= start && r.time <= (preview ? end : time));
  const cp = line<Sample>().x(r => x(r.time)).y(r => y(r.cp));
  const ce = line<Sample>().x(r => x(r.time)).y(r => y(r.ce));
  const target = line<Sample>().defined(r => r.target !== null).x(r => x(r.time)).y(r => y(r.target ?? 0)).curve(curveStepAfter);
  const rate = line<Sample>().x(r => x(r.time)).y(r => ry(r.rate)).curve(curveStepAfter);
  const inspected = sampleAt(rows, hover === null ? time : Math.max(start, Math.min(hover, preview ? end : time)));
  const bis=lastObservedBIS(observations,inspected.time);
  function pointer(e: React.MouseEvent<SVGSVGElement>) { const b = e.currentTarget.getBoundingClientRect(); return Math.max(start, Math.min(preview ? end : time, x.invert((e.clientX - b.left) / b.width * width))); }
  return <>
    <div className="chart-title" ref={title}><h2>Concentration over time</h2><div className="legend"><span className="cp-key">Plasma Cp</span><span className="ce-key">Effect site Ce</span>{mode !== 'prescribed' && <span className="target-key">Target {mode?.toUpperCase()}</span>}</div></div>
    <p className="chart-unit">PREDICTED CONCENTRATION <span>µg/mL</span></p>
    <svg className="concentration-chart" viewBox={`0 0 ${width} 288`} role="img" aria-label="Predicted plasma and effect-site concentration over simulated time" onPointerMove={e => setHover(pointer(e))} onPointerLeave={() => setHover(null)} onClick={e => onSeek(pointer(e))}>
      {y.ticks(5).map(t => <g key={t}><line className="grid" x1="45" x2={width - 20} y1={y(t)} y2={y(t)}/><text x="32" y={y(t) + 4} textAnchor="end">{t.toFixed(1)}</text></g>)}
      {x.ticks(width < 500 ? 3 : 6).map(t => <g key={t}><line className="grid vertical" x1={x(t)} x2={x(t)} y1="20" y2="244"/><text x={x(t)} y="272" textAnchor="middle">{clock(t)}</text></g>)}
      {stop !== null && stop >= start && stop <= end && <g><line className="event-line" x1={x(stop)} x2={x(stop)} y1="20" y2="244"/><text x={x(stop) + 8} y="34" className="event-label">Input stops</text></g>}
      <path d={target(visible) ?? ''} className="target-line"/>
      <path d={cp(visible) ?? ''} className="cp-line"/><path d={ce(visible) ?? ''} className="ce-line"/>
      <line className="playhead" x1={x(time)} x2={x(time)} y1="20" y2="244"/>
      {hover !== null && <line className="hover-line" x1={x(hover)} x2={x(hover)} y1="20" y2="244"/>}
      <circle cx={x(inspected.time)} cy={y(inspected.cp)} r="5" fill="var(--teal)"/><circle cx={x(inspected.time)} cy={y(inspected.ce)} r="5" fill="var(--violet)"/>
    </svg>
    <div className="inspection" aria-live="off"><span>{hover === null ? 'PLAYHEAD' : 'INSPECT'} <b>{clock(inspected.time)}</b></span><span>Cp <b className="teal">{inspected.cp.toFixed(3)}</b></span><span>Ce <b className="violet">{inspected.ce.toFixed(3)}</b></span><span>Target <b>{inspected.target === null ? '—' : inspected.target.toFixed(2)}</b></span><span>Input <b>{inspected.rate.toFixed(1)} mg/min</b><RateEquivalent rate={inspected.rate} weight={weight}/></span><span>Total <b>{inspected.administered.toFixed(1)} mg</b></span>{bis&&<span>Last observed BIS <b>{bis.bis} at {clock(bis.time)}</b></span>}</div>
    <div className="chart-title rate-title"><h2>Simulated administration</h2><span className="subtle">mg/min</span></div>
    <svg className="rate-chart" viewBox={`0 0 ${width} 133`} role="img" aria-label="Simulated administration rate over time" onPointerMove={e => setHover(pointer(e))} onPointerLeave={() => setHover(null)} onClick={e => onSeek(pointer(e))}>
      {ry.ticks(3).map(t => <g key={t}><line className="grid" x1="45" x2={width - 20} y1={ry(t)} y2={ry(t)}/><text x="32" y={ry(t) + 4} textAnchor="end">{t}</text></g>)}
      {x.ticks(width < 500 ? 3 : 6).map(t => <text key={t} x={x(t)} y="125" textAnchor="middle">{clock(t)}</text>)}
      <path d={rate(visible) ?? ''} className="rate-line"/>
      <line className="playhead" x1={x(time)} x2={x(time)} y1="10" y2="100"/>
    </svg>
    <div className="chart-foot"><span>Elapsed simulation time · min:sec</span><span>Hover to inspect · click to seek</span></div>
  </>;
}
