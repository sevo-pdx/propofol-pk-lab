import { RateEquivalent } from './RateEquivalent';
import type { Kg } from '../models/units';
import { useEffect, useRef, useState } from 'react';
import type { FlowKey } from '../simulation/mathView';
import type P5 from 'p5';
import type { PKParameters } from '../models/types';
import type { Sample } from './scenario';
import { compartmentView } from '../simulation/compartmentView';
interface Props { weight:Kg; sample:Sample; parameters:PKParameters; ceiling:number; highlight?:FlowKey|null }
export function CompartmentAnimation({weight,sample,parameters,ceiling,highlight=null}:Props) {
  const host=useRef<HTMLDivElement>(null);
  const view=compartmentView(sample,parameters,sample.rate);
  const data=useRef({view,time:sample.time,ceiling,highlight}); data.current={view,time:sample.time,ceiling,highlight};
  const [error,setError]=useState('');
  useEffect(()=>{
    let instance:P5|undefined, disposed=false;
    let observer:ResizeObserver|undefined;
    const mount=host.current!;
    import('p5').then(({default:Sketch})=>{
      if(disposed)return;
      instance=new Sketch((s:P5)=>{
        s.setup=()=>{s.createCanvas(mount.clientWidth,490);s.pixelDensity(Math.min(window.devicePixelRatio,2));s.frameRate(30);s.textFont('sans-serif');};
        observer=new ResizeObserver(()=>{if(instance)instance.resizeCanvas(mount.clientWidth,490);});observer.observe(mount);
        s.draw=()=>{
          const {view:v,time,ceiling:scale,highlight:focus}=data.current;
          const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
          const w=s.width; const center={x:w/2,y:224}, effect={x:w/2,y:57}, rapid={x:w*.24,y:411},slow={x:w*.76,y:411};
          s.background('#f7faf9');
          function path(a:{x:number;y:number},b:{x:number;y:number},net:number,color:string,label:string,key:FlowKey) {
            s.stroke(focus===key?color:'#c9d9d8');s.strokeWeight(focus===key?5:2);s.line(a.x,a.y,b.x,b.y);
            const from=net>=0?a:b,to=net>=0?b:a;
            if(Math.abs(net)>1e-8){
              s.noStroke();s.fill(color);
              for(let i=0;i<4;i++){
                const fraction=reduced?(i+.5)/4:((time*(.3+Math.log1p(Math.abs(net))*.25)+i/4)%1);
                s.circle(from.x+(to.x-from.x)*fraction,from.y+(to.y-from.y)*fraction,5);
              }
              const angle=Math.atan2(to.y-from.y,to.x-from.x),mx=(a.x+b.x)/2,my=(a.y+b.y)/2;
              s.push();s.translate(mx,my);s.rotate(angle);s.triangle(5,0,-4,-4,-4,4);s.pop();
            }
            s.noStroke();s.fill('#5c7d83');s.textSize(12);s.textAlign(s.CENTER);s.text(label,(a.x+b.x)/2,(a.y+b.y)/2-14);
          }
          path({x:Math.max(25,w/2-200),y:224},{x:center.x-70,y:224},v.input,'#087d79','Input','input');
          path({x:center.x+70,y:224},{x:Math.min(w-25,w/2+200),y:224},v.elimination,'#b58144','CL','elimination');
          path({x:center.x-38,y:267},{x:rapid.x,y:363},v.rapidNet,'#087d79','Q2','rapid');
          path({x:center.x+38,y:267},{x:slow.x,y:363},v.slowNet,'#087d79','Q3','slow');
          // Effect-site equilibration is a virtual concentration relation, NOT mass transport.
          s.stroke('#a699c6');s.strokeWeight(focus==='effect'?5:2);(s.drawingContext as CanvasRenderingContext2D).setLineDash([5,6]);s.line(effect.x,107,center.x,169);(s.drawingContext as CanvasRenderingContext2D).setLineDash([]);
          if(Math.abs(v.effectDerivative)>1e-8){
            const phase=reduced ? 0.5 : (time*.6)%1;
            const pos=v.effectDerivative>0?169-phase*62:107+phase*62;
            s.noFill();s.stroke('#7660ba');s.circle(center.x,pos,7);
          }
          s.noStroke();s.fill('#7660ba');s.textAlign(s.LEFT);s.textSize(12);s.text('ke0',center.x+10,138);
          s.textAlign(s.CENTER);s.textSize(10);s.text('Virtual equilibration',center.x,159);
          function node(x:number,y:number,label:string,value:number,color:string){
            const nw=Math.min(142,w*.43),nh=94;
            s.stroke('#cfdfdd');s.strokeWeight(1);s.fill('white');s.rect(x-nw/2,y-nh/2,nw,nh,10);
            const height=Math.max(0,Math.min(1,value/scale))*(nh-2);
            const tint=s.color(color);tint.setAlpha(35);s.noStroke();s.fill(tint);s.rect(x-nw/2+1,y+nh/2-1-height,nw-2,height,4);
            s.fill('#345b62');s.textAlign(s.CENTER);s.textSize(13);s.text(label,x,y-12);s.fill(color);s.textSize(20);s.text(value.toFixed(2),x,y+13);s.textSize(10);s.text('µg/mL',x,y+31);
          }
          node(effect.x,effect.y,'EFFECT SITE',v.ce,'#7660ba');
          node(center.x,center.y,'CENTRAL / V1',v.compartments[0]!.concentration,'#087d79');
          node(rapid.x,rapid.y,'RAPID / V2',v.compartments[1]!.concentration,'#087d79');
          node(slow.x,slow.y,'SLOW / V3',v.compartments[2]!.concentration,'#087d79');
        };
      },mount);
    }).catch(()=>setError('Animation could not load. Quantitative compartment values remain available below.'));
    return()=>{disposed=true;observer?.disconnect();instance?.remove();};
  },[]);
  return <section className="card model-animation"><div className="section-title"><div><div className="eyebrow">FOLLOW THE DRUG</div><h2>One input. Three compartments. A delayed effect.</h2></div><span className="mini-tag">MODEL PREDICTIONS</span></div>
    {highlight&&<p className="pathway-focus">Highlighted pathway: {({input:"Simulated input → V1",rapid:"Q2 · V1 ↔ V2",slow:"Q3 · V1 ↔ V3",elimination:"CL · central elimination",effect:"ke0 · virtual equilibration"})[highlight]}. Solid exchange arrows show net flow.</p>}<div className="animation-layout"><div><div className="p5-host" ref={host} role="img" aria-label="Animated three-compartment PK model. Particle direction represents net redistribution; effect-site equilibration is a virtual dashed connection."/>{error&&<p role="alert">{error}</p>}<p className="explain">Fill uses a shared 0–{ceiling.toFixed(1)} µg/mL concentration scale. Particles show net-flow direction; counts and speeds are illustrative. Motion follows simulation time and pauses with playback.</p></div>
    <div className="flow-readouts"><h3>At this instant</h3><dl><div><dt>Simulated input</dt><dd>{view.input.toFixed(2)} mg/min<RateEquivalent rate={view.input} weight={weight}/></dd></div><div><dt>Central elimination</dt><dd>{view.elimination.toFixed(2)} mg/min</dd></div><div><dt>Net Q2 flow</dt><dd>{Math.abs(view.rapidNet).toFixed(2)} mg/min<small>{view.rapidNet>=0?'V1 → V2':'V2 → V1'}</small></dd></div><div><dt>Net Q3 flow</dt><dd>{Math.abs(view.slowNet).toFixed(2)} mg/min<small>{view.slowNet>=0?'V1 → V3':'V3 → V1'}</small></dd></div><div><dt>Effect-site change</dt><dd>{view.effectDerivative>=0?'+':''}{view.effectDerivative.toFixed(3)}<small>µg/mL per min</small></dd></div></dl><p className="explain">The effect site has no assigned physical volume or drug mass. Its dashed link represents equilibration, not removal of drug from V1.</p></div></div>
    <div className="compartment-values">{view.compartments.map(c=><div key={c.name}><h3>{c.name}</h3><dl><div><dt>Volume</dt><dd>{c.volume.toFixed(2)} L</dd></div><div><dt>Drug mass</dt><dd>{c.mass.toFixed(2)} mg</dd></div><div><dt>Concentration</dt><dd>{c.concentration.toFixed(3)} µg/mL</dd></div></dl></div>)}<div><h3>Virtual effect site</h3><dl><div><dt>Ce</dt><dd>{view.ce.toFixed(3)} µg/mL</dd></div><div><dt>ke0</dt><dd>{parameters.ke0.toFixed(3)} min⁻¹</dd></div><div><dt>Physical mass</dt><dd>Not applicable</dd></div></dl></div></div>
    <div className="mass-ledger"><span>Mass remaining <b>{view.remaining.toFixed(2)} mg</b></span><span>Eliminated <b>{view.eliminated.toFixed(2)} mg</b></span><span>Total simulated administration <b>{view.administered.toFixed(2)} mg</b></span></div>
  </section>;
}
