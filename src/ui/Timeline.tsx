import { useRef, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { TargetEvent, TargetMode } from '../simulation/tciController';
import { clock, END } from './scenario';
interface Props { events: TargetEvent[]; mode: TargetMode; time: number; onChange: (events: TargetEvent[]) => void }
function EventRow({event,onSave,onDelete}: {event:TargetEvent;onSave:(event:TargetEvent)=>void;onDelete:()=>void}) {
  const [minutes,setMinutes]=useState(String(event.time));
  const [target,setTarget]=useState(String(event.target));
  return <form className="event-row" onSubmit={e=>{e.preventDefault();onSave({...event,time:Number(minutes),target:Number(target)});}}>
    <label>Time · min<input aria-label={`Event time ${event.id}`} type="number" min="0" max={END} step="any" required value={minutes} onChange={e=>setMinutes(e.target.value)}/></label>
    <label>Target · µg/mL<input aria-label={`Event target ${event.id}`} type="number" min="0" step="any" required value={target} onChange={e=>setTarget(e.target.value)}/></label>
    <button className="save-event" type="submit">Save</button><button className="icon-button" type="button" aria-label={`Delete event ${clock(event.time)}`} onClick={onDelete}><Trash2 size={16}/></button>
  </form>;
}
export function Timeline({events,mode,time,onChange}:Props) {
  const [error,setError]=useState('');
  const [newTime,setNewTime]=useState('10');const [newTarget,setNewTarget]=useState('3');
  const [drag,setDrag]=useState<{id:string;time:number;startX:number}|null>(null);
  const rail=useRef<HTMLDivElement>(null);
  function commit(next:TargetEvent[]) {try {onChange(next);setError('');}catch(e){setError(e instanceof Error?e.message:'Invalid event.');}}
  function save(event:TargetEvent) {commit([...events.filter(e=>e.id!==event.id),event]);}
  function move(clientX:number) {const bounds=rail.current!.getBoundingClientRect();return Math.max(0,Math.min(END,Math.round((clientX-bounds.left)/bounds.width*END*60)/60));}
  return <div className="card course-card target-timeline"><div className="section-title"><h2>Target event timeline</h2><span className="mini-tag">{mode.toUpperCase()} · µg/mL</span></div>
    <p className="explain">Drag a marker or edit a row. Changes recalculate the course at the current playhead. Future events never alter earlier predictions.</p>
    <div className="target-rail" ref={rail}><span className="rail-playhead" style={{left:`${time/END*100}%`}}/>{events.map(e=><button key={e.id} className="target-marker" aria-label={`Move event ${clock(e.time)}`} title={`${clock(e.time)} · ${e.target} µg/mL`} style={{left:`${(drag?.id===e.id?drag.time:e.time)/END*100}%`}}
      onPointerDown={ev=>{ev.currentTarget.setPointerCapture(ev.pointerId);setDrag({id:e.id,time:e.time,startX:ev.clientX});}}
      onPointerMove={ev=>{if(drag?.id===e.id)setDrag({...drag,time:move(ev.clientX)});}}
      onPointerUp={ev=>{if(drag?.id===e.id){if(Math.abs(ev.clientX-drag.startX)>3)save({...e,time:move(ev.clientX)});setDrag(null);}}}
      onPointerCancel={()=>setDrag(null)}
      onKeyDown={ev=>{if(ev.key==='ArrowLeft'||ev.key==='ArrowRight'){ev.preventDefault();save({...e,time:Math.max(0,Math.min(END,e.time+(ev.key==='ArrowLeft'?-1:1)*(ev.shiftKey?10:1)/60))});}}}><span>{e.target}</span></button>)}</div>
    <div className="timeline-labels"><span>00:00</span><span>{drag?`Move to ${clock(drag.time)}`:'30:00'}</span><span>60:00</span></div>
    <div className="event-list">{events.map(e=><EventRow key={`${e.id}-${e.time}-${e.target}`} event={e} onSave={save} onDelete={()=>commit(events.filter(item=>item.id!==e.id))}/>)}</div>
    <form className="event-row add-event" onSubmit={e=>{e.preventDefault();commit([...events,{id:crypto.randomUUID(),time:Number(newTime),target:Number(newTarget)}]);}}><label>New time · min<input aria-label="New event time" type="number" min="0" max={END} step="any" required value={newTime} onChange={e=>setNewTime(e.target.value)}/></label><label>New target · µg/mL<input aria-label="New event target" type="number" min="0" step="any" required value={newTarget} onChange={e=>setNewTarget(e.target.value)}/></label><button className="save-event" type="submit"><Plus size={14}/> Add</button></form>
    {error&&<p className="error" role="alert">{error}</p>}<p className="form-hint">Keyboard: focus a marker and use arrow keys (1 s), or Shift + arrow (10 s).</p>
  </div>;
}
