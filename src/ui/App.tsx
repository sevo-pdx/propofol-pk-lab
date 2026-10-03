import {BISPanel} from './BISPanel';
import type {BISMode,BISObservation} from '../observations/bis';
import {buildComparison} from './comparison';
import {ModelComparison} from './ModelComparison';
import {models,modelDetails,type ModelKey} from '../models/registry';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Activity, BookOpen, ChevronDown, CircleHelp, FlaskConical, Pause, Play, RotateCcw, SkipForward, SlidersHorizontal, X } from 'lucide-react';
import { EDUCATIONAL_NOTICE, microconstants, quantity as u } from '../index';
import type { PatientCovariates } from '../index';
import { buildScenario, buildTCIScenario, defaultTargets, clock, END, initialPatient, sampleAt } from './scenario';
import { RateEquivalent } from './RateEquivalent';
import { Charts } from './Charts';
import { Timeline } from './Timeline';
import { MathView } from './MathView';
import type { FlowKey } from '../simulation/mathView';
import { CompartmentAnimation } from './CompartmentAnimation';
import { validateEvents, type TargetEvent, type TargetMode } from '../simulation/tciController';

export default function App() {
  const [bisMode,setBISMode]=useState<BISMode>('none');
  const [observations,setObservations]=useState<BISObservation[]>([]);
  const [compare,setCompare]=useState(false);
  const [modelKey,setModelKey]=useState<ModelKey>('eleveld');
  const model=models[modelKey], detail=modelDetails[modelKey];
  const [patient, setPatient] = useState(initialPatient);
  const [draft, setDraft] = useState({ age: '35', height: '170', weight: '70', sex: 'male', drugs: false, pma: '' });
  const [course, setCourse] = useState({ rate: 5, stop: 30 });
  const [input, setInput] = useState({ rate: '5', stop: '30' });
  const [mode, setMode] = useState<TargetMode | 'prescribed'>('ce');
  const [events, setEvents] = useState<TargetEvent[]>(defaultTargets);
  const [liveTarget, setLiveTarget] = useState('3');
  const scenario = useMemo(() => mode === 'prescribed' ? buildScenario(patient, course, model) : buildTCIScenario(patient, mode, events, model), [patient, course, mode, events, model]);
  const comparison=useMemo(()=>compare?buildComparison(patient,mode,events,course):[],[compare,patient,mode,events,course]);
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(30);
  const [preview, setPreview] = useState(true);
  const [referenceOpen, setReferenceOpen] = useState(false);
  const [micro, setMicro] = useState(false);
  const [showModel, setShowModel] = useState(false);
  const [showMath, setShowMath] = useState(false);
  const [highlight, setHighlight] = useState<FlowKey|null>(null);
  const concentrationCeiling = useMemo(() => Math.max(1, ...scenario.rows.map(r => Math.max(r.cp, r.ce, r.c2, r.c3))), [scenario]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('Reference adult · hypothetical 60-minute course');
  const dialog = useRef<HTMLDialogElement>(null);
  const current = sampleAt(scenario.rows, time);
  const { parameters: p, derived, factors } = scenario.evaluation;
  useEffect(() => {
    if (!playing) return;
    let last = performance.now();
    const timer = window.setInterval(() => {
      const now = performance.now(), delta = (now - last) / 60000 * speed; last = now;
      setTime(t => Math.min(END, t + delta));
    }, 80);
    return () => clearInterval(timer);
  }, [playing, speed]);
  useEffect(() => { if (time >= END) setPlaying(false); }, [time]);
  useEffect(() => {
    const stopHidden = () => { if (document.hidden) setPlaying(false); };
    document.addEventListener('visibilitychange', stopHidden);
    return () => document.removeEventListener('visibilitychange', stopHidden);
  }, []);
  useEffect(() => { if (referenceOpen) dialog.current?.showModal(); else dialog.current?.close(); }, [referenceOpen]);
  function reset() { setTime(0); setPlaying(false); }
  function apply(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (!(modelKey==='marsh'&&!compare?[draft.weight,input.rate,input.stop]:[draft.age, draft.height, draft.weight, input.rate, input.stop]).every(v => v.trim())) throw new Error('Complete all numeric fields.');
      const next: PatientCovariates = modelKey==='marsh'&&!compare?{...patient,weight:u(Number(draft.weight),'kg')}:{ age: u(Number(draft.age), 'yr'), sex: draft.sex as 'male' | 'female', height: u(Number(draft.height), 'cm'), weight: u(Number(draft.weight), 'kg'), concomitantAnaesthetics: draft.drugs, ...(draft.pma.trim() ? { postMenstrualAge: u(Number(draft.pma), 'wk') } : {}) };
      const c = { rate: Number(input.rate), stop: Number(input.stop) };
      buildScenario(next, c, model); if(JSON.stringify(next)!==JSON.stringify(patient))setObservations([]); setPatient(next); setCourse(c); reset(); setError(''); setNotice('Changes applied · simulation reset to 00:00');
    } catch (e) { setError(e instanceof Error ? e.message : 'Check the entered values.'); }
  }
  function changeEvents(next: TargetEvent[]) {
    const validated = validateEvents(next, END);
    if (mode !== 'prescribed') buildTCIScenario(patient, mode, validated, model);
    setEvents(validated); setNotice('Target course recalculated · playhead preserved');
  }
  function applyTarget() {
    try {
      if (!liveTarget.trim()) throw new Error('Enter a target concentration.');
      const existing = events.find(e => Math.abs(e.time - time) < 1e-8);
      changeEvents([...events.filter(e => e !== existing), {id: existing?.id ?? crypto.randomUUID(), time, target: Number(liveTarget)}]);
      setError('');
    } catch(e) {setError(e instanceof Error ? e.message : 'Invalid target');}
  }
  function changeModel(key:ModelKey) {
    try { models[key].evaluate(patient); setModelKey(key); reset(); setError(''); setNotice('Model changed · same applied covariates and target events · simulation reset'); }
    catch(e){setError(e instanceof Error?e.message:'This patient is unsupported by the selected model.');}
  }
  function preset(value: string) {
    const ages: Record<string, string> = { reference: '35', older: '80', high: '35' };
    setDraft({ age: ages[value] ?? '35', height: '170', weight: value === 'high' ? '120' : '70', sex: 'male', drugs: false, pma: '' });
    setNotice('Preset loaded into the form · apply to recalculate');
  }
  const params = micro ? Object.entries(microconstants(p)) : Object.entries(p).filter(([k]) => k !== 'ke0');
  return <>
    <header className="topbar"><div className="brand"><span className="brand-icon"><Activity size={23}/></span><div>compartment<span>PROPOFOL PK LAB</span></div></div><div className="header-right"><span className="education-badge"><FlaskConical size={14}/> Educational workspace</span><button className="text-button" onClick={() => setReferenceOpen(true)}><BookOpen size={17}/> References & about</button></div></header>
    <div className="safety"><CircleHelp size={15}/><span>{EDUCATIONAL_NOTICE}</span></div>
    <main>
      <div className="page-heading"><div><div className="eyebrow">PHARMACOKINETICS / SINGLE-PATIENT EXPLORER</div><h1>See the concentration.<br className="mobile-break"/> Understand the delay.</h1><p>Explore plasma and effect-site predictions with the {detail.label} population model.</p></div><span className="model-tag">{detail.label.toUpperCase()} <b>{detail.year}</b></span></div>
      <div className="model-toggle"><label><input type="checkbox" checked={compare} onChange={e=>setCompare(e.target.checked)}/> Compare models</label><span>Same applied patient and target sequence · three independent predictions</span></div><div className="workspace">
        <aside className="left-panel card"><label className="field">Population model<select aria-label="Population model" value={modelKey} onChange={e=>changeModel(e.target.value as ModelKey)}>{Object.entries(models).map(([key,m])=><option key={key} value={key}>{m.name}</option>)}</select></label><p className="explain">Model changes restart the same hypothetical course.</p><div className="divider"/><form onSubmit={apply}>
          <div className="section-title"><h2>Patient covariates</h2><SlidersHorizontal size={17}/></div>
          <label className="field full">Hypothetical preset<select defaultValue="reference" onChange={e => preset(e.target.value)}><option value="reference">Reference adult</option>{(modelKey!=='marsh'||compare)&&<option value="older">Older adult</option>}<option value="high">High BMI adult</option></select></label>
          <div className="field-grid">{(modelKey!=='marsh'||compare)&&<><label className="field">Age <span className="input-wrap"><input aria-label="Age" type="number" step="any" min="0" max={modelKey==='eleveld'?88:undefined} value={draft.age} onChange={e => setDraft({ ...draft, age: e.target.value })}/><small>yr</small></span></label><label className="field">Model sex<select value={draft.sex} onChange={e => setDraft({ ...draft, sex: e.target.value })}><option value="male">Male</option><option value="female">Female</option></select></label><label className="field">Height<span className="input-wrap"><input aria-label="Height" type="number" step="any" min="1" value={draft.height} onChange={e => setDraft({ ...draft, height: e.target.value })}/><small>cm</small></span></label></>}<label className="field">Weight<span className="input-wrap"><input aria-label="Weight" type="number" step="any" min="0.01" max={modelKey==='eleveld'?160:undefined} value={draft.weight} onChange={e => setDraft({ ...draft, weight: e.target.value })}/><small>kg</small></span></label></div>
          {(modelKey==='eleveld'||compare)&&Number(draft.age) < 0.5 && <label className="field">Post-menstrual age · weeks<input aria-label="Post-menstrual age" type="number" min="27" step="any" required value={draft.pma} onChange={e => setDraft({ ...draft, pma: e.target.value })}/></label>}
          {(modelKey==='eleveld'||compare)&&<label className="check"><input type="checkbox" checked={draft.drugs} onChange={e => setDraft({ ...draft, drugs: e.target.checked })}/>Concomitant opioids / anaesthetics</label>}
          {modelKey!=='marsh'&&<div className="derived"><span>Applied BMI <b>{derived.bmi?.toFixed(1)} <small>kg/m²</small></b></span><span>{modelKey==='schnider'?'James lean body mass':'Fat-free mass'} <b>{(derived.leanBodyMassKg??derived.fatFreeMassKg)?.toFixed(1)} <small>kg</small></b></span></div>}
          <p className="explain">{compare?'Comparison uses age, sex, height, weight and Eleveld’s drug/PMA covariates. Apply edits to update all model predictions.':detail.covariates}</p>{modelKey==='schnider'&&scenario.evaluation.notes.filter(n=>n.includes('declining branch')||n.includes('extrapolation')).map(n=><p className="model-caution" key={n}>{n}</p>)}
          {error && <p className="error" role="alert">{error}</p>}<button className="apply" type="submit">Apply patient & reset</button><p className="form-hint">Patient changes start a new experiment.</p>
        </form>
        <div className="divider"/><div className="section-title"><h2>Target controls</h2><span className="mini-tag">SIMULATION</span></div>
        <label className="field">Targeting mode<select aria-label="Targeting mode" value={mode} onChange={e=>{setMode(e.target.value as TargetMode | 'prescribed');reset();setNotice('Targeting mode changed · simulation reset');}}><option value="ce">Effect-site targeted · Ce</option><option value="cp">Plasma targeted · Cp</option><option value="prescribed">Prescribed input experiment</option></select></label>
        {mode !== 'prescribed' ? <><label className="field">New {mode.toUpperCase()} target<span className="input-wrap"><input aria-label="New live target" type="number" min="0" step="any" value={liveTarget} onChange={e=>setLiveTarget(e.target.value)}/><small>µg/mL</small></span></label><button className="apply" onClick={applyTarget}>Apply target at {clock(time)}</button><p className="explain">Adds an event now, including during playback. A zero target stops simulated input. Ce evolves through the model.</p><details className="controller-note"><summary>How targeting works</summary><p>The controller solves a theoretical 10-second input pulse. Cp mode aims for the next plasma value. Ce mode forecasts the pulse response over at least eight effect-site time constants, then recalculates. No pump rate or plasma ceiling is imposed; brief rates may be large. This is a numerical teaching algorithm, not a commercial controller.</p></details></> : <form onSubmit={apply}><p className="explain">Arbitrary prescribed input for exploring the underlying PK behavior.</p>
          <label className="field">Simulated administration rate<span className="input-wrap"><input aria-label="Simulated administration rate" type="number" min="0" step="any" value={input.rate} onChange={e => setInput({ ...input, rate: e.target.value })}/><small>mg/min</small></span>{input.rate.trim()&&<RateEquivalent rate={Number(input.rate)} weight={patient.weight}/>}</label>
          <label className="field">Stop simulated input at<span className="input-wrap"><input aria-label="Stop simulated input at" type="number" min="0.01" max="60" step="any" value={input.stop} onChange={e => setInput({ ...input, stop: e.target.value })}/><small>min</small></span></label>
          {error && <p className="error" role="alert">{error}</p>}<button className="apply" type="submit">Apply & reset simulation</button><p className="form-hint">Changes take effect when applied.</p>
        </form>}{mode !== 'prescribed' && error && <p className="error" role="alert">{error}</p>}</aside>
        <section className="center-panel">
          <div className="card chart-card"><div className="chart-toolbar"><span className="status"><i className={playing ? 'running' : ''}/>{playing ? 'PLAYING' : time === END ? 'COMPLETE' : 'PAUSED'}</span><div className="segmented"><button aria-pressed={preview} className={preview ? 'active' : ''} onClick={() => setPreview(true)}>Full course</button><button aria-pressed={!preview} className={!preview ? 'active' : ''} onClick={() => setPreview(false)}>Live window</button></div></div>
            <Charts observations={bisMode==='observed'?observations:[]} weight={patient.weight} rows={scenario.rows} time={time} stop={mode === 'prescribed' ? course.stop : null} mode={mode} preview={preview} onSeek={t => { setTime(t); setPlaying(false); }}/>
            <div className="playback"><button className="play-button" onClick={() => { if (time === END) setTime(0); setPlaying(!playing); }}>{playing ? <Pause size={18}/> : <Play size={18}/>} {playing ? 'Pause' : time > 0 && time < END ? 'Resume' : 'Play'}</button><button className="icon-button" aria-label="Reset simulation" title="Reset simulation" onClick={reset}><RotateCcw size={18}/></button><button className="jump" onClick={() => setTime(t => Math.min(END, t + 5))}><SkipForward size={17}/> +5 min</button><span className="playback-spacer"/><label className="speed">Playback<select aria-label="Playback speed" value={speed} onChange={e => setSpeed(Number(e.target.value))}>{[0.5, 1, 2, 5, 10, 30, 60].map(s => <option key={s} value={s}>{s}×</option>)}</select></label><div className="elapsed"><strong>{clock(time)}</strong><span>/ 60:00</span></div></div>
            <input className="scrubber" aria-label="Simulation time" type="range" min="0" max="60" step={1 / 60} value={time} onChange={e => { setTime(Number(e.target.value)); setPlaying(false); }}/>
          </div>
          <div className="course-note" role="status">{detail.label} · {notice}<span>Full course shows calculated future values; live window shows elapsed time only.</span></div>
          {mode !== 'prescribed' ? <Timeline events={events} mode={mode} time={time} onChange={changeEvents}/> : (<div className="card course-card"><div className="section-title"><h2>Input course</h2><span className="subtle">60 simulated minutes</span></div><div className="course-track"><div style={{ width: `${course.stop / END * 100}%` }}/><span style={{ left: `${time / END * 100}%` }}/></div><div className="course-events"><div><b>00:00</b><span>Simulated input begins</span><strong>{course.rate.toFixed(1)} mg/min</strong><RateEquivalent rate={course.rate} weight={patient.weight}/></div><div><b>{clock(course.stop)}</b><span>Simulated input stops</span><strong>Redistribution & elimination</strong></div><div><b>60:00</b><span>End of experiment</span><strong>End of calculated course</strong></div></div></div>)}

        </section>
        <aside className="right-panel"><div className="card readouts"><div className="eyebrow">MODEL PREDICTIONS</div>{mode !== 'prescribed' && <div className="target-reading"><span>Target {mode.toUpperCase()}</span><b>{current.target?.toFixed(2)} <small>µg/mL</small></b></div>}<div className="reading teal"><label>Predicted plasma <b>Cp</b></label><div>{current.cp.toFixed(2)}<small>µg/mL</small></div></div><div className="reading violet"><label>Predicted effect site <b>Ce</b></label><div>{current.ce.toFixed(2)}<small>µg/mL</small></div></div><div className="reading small"><label>Simulated administration</label><div>{current.rate.toFixed(1)}<small>mg/min</small></div><RateEquivalent rate={current.rate} weight={patient.weight}/><p className="rate-conversion-note">mg/min × 1,000 ÷ {patient.weight} kg<br/>Uses applied total body weight.</p></div><div className="total"><span>Total simulated mass</span><b>{current.administered.toFixed(1)} <small>mg</small></b></div></div>
          <div className="card parameters"><div className="section-title"><h2>Model inspector</h2></div><div className="segmented"><button aria-pressed={!micro} className={!micro ? 'active' : ''} onClick={() => setMicro(false)}>V / clearances</button><button aria-pressed={micro} className={micro ? 'active' : ''} onClick={() => setMicro(true)}>Microconstants</button></div><dl>{params.map(([key, value]) => <div key={key}><dt>{key === 'cl' ? 'CL' : key.replace('v', 'V').replace('q', 'Q')}</dt><dd>{value.toFixed(3)} <small>{micro ? 'min⁻¹' : key.startsWith('v') ? 'L' : 'L/min'}</small></dd></div>)}{!micro && <div><dt>ke0</dt><dd>{p.ke0.toFixed(3)} <small>min⁻¹</small></dd></div>}</dl><p className="explain">{micro ? 'Derived: k10 = CL/V1; k12 = Q2/V1; k21 = Q2/V2; k13 = Q3/V1; k31 = Q3/V3.' : detail.classification}</p></div>
        </aside>
      </div>
      <BISPanel key={JSON.stringify(patient)} mode={bisMode} onMode={setBISMode} observations={observations} onChange={setObservations} time={time} rows={scenario.rows} preview={preview} model={modelKey} weight={patient.weight} onSeek={t=>{setTime(t);setPlaying(false);}}/>
      {compare&&<ModelComparison results={comparison} patient={patient} time={time} preview={preview} mode={mode} onSeek={t=>{setTime(t);setPlaying(false);}}/>}
      <div className="model-toggle"><label><input type="checkbox" checked={showModel} onChange={e=>setShowModel(e.target.checked)}/> Show PK/PD model</label><span>Explore redistribution, elimination and effect-site lag</span></div>
      {showModel && <><CompartmentAnimation weight={patient.weight} sample={current} parameters={p} ceiling={concentrationCeiling} highlight={showMath?highlight:null}/>
        <div className="model-toggle"><label><input type="checkbox" checked={showMath} onChange={e=>setShowMath(e.target.checked)}/> Show mathematics</label><span>Live substitutions · instantaneous rates · conservation of mass</span></div>
        {showMath&&<MathView weight={patient.weight} sample={current} parameters={p} selected={highlight} onSelect={setHighlight}/>}</>}
      <details className="card covariates"><summary><span><SlidersHorizontal size={19}/> How this patient changes the model</span><ChevronDown size={18}/></summary><div className="factor-grid">{Object.entries(factors).map(([key, value]) => <div key={key}><span>{({ size: 'Weight / 70 kg', central: 'V1 saturation factor', ageingV2: 'V2 age factor', drugsCl: 'CL concomitant-drug factor', drugsV3: 'V3 concomitant-drug factor', matCl: 'CL maturation ratio', matQ3: 'Q3 maturation', refMatQ3: 'Reference Q3 maturation', ffmRatio: 'FFM / reference FFM' } as Record<string, string>)[key]??key}</span><b>{value.toFixed(5)}</b></div>)}</div><p className="explain">{detail.formula}</p>{modelKey==='eleveld'&&<p className="explain">Applied PMA: {derived.pmaWeeks?.toFixed(2)} weeks. {patient.postMenstrualAge === undefined ? 'Derived as age + 40 weeks; 365.25 days per year.' : 'Explicitly supplied.'}</p>}{scenario.evaluation.notes.map(note=><p className="explain" key={note}>{note}</p>)}</details>
      <footer><span><FlaskConical size={15}/> Population predictions · hypothetical courses · no clinical recommendations</span><button className="text-button" onClick={() => setReferenceOpen(true)}>Source transparency <BookOpen size={14}/></button></footer>
    </main>
    <dialog aria-labelledby="about-title" ref={dialog} onCancel={() => setReferenceOpen(false)} onClick={e => { if (e.target === e.currentTarget) setReferenceOpen(false); }}><div className="dialog-head"><div><div className="eyebrow">SOURCE TRANSPARENCY</div><h2 id="about-title">About this model</h2></div><button className="icon-button" aria-label="Close references" onClick={() => setReferenceOpen(false)}><X/></button></div><p>{EDUCATIONAL_NOTICE}</p><h3>Selected: {model.name}</h3><p>{detail.covariates}</p>{modelKey!=='eleveld'&&<><p>{detail.classification}</p><p>{detail.formula}</p>{scenario.evaluation.notes.map(note=><p key={note}>{note}</p>)}</>}<h3>Schnider · 1998 / 1999</h3><p>Three compartments with James lean body mass. The PK study involved 24 healthy adult volunteers (26–81 years in its abstract). James LBM can decline at high weight; this limitation is reported without replacing the equation.</p><p><a href="https://doi.org/10.1097/00000542-199805000-00006" target="_blank" rel="noreferrer">Schnider et al. Anesthesiology 1998;88:1170–1182 (PK).</a> <a href="https://doi.org/10.1097/00000542-199906000-00003" target="_blank" rel="noreferrer">Schnider et al. 1999;90:1502–1516 (fixed ke0 0.456).</a></p><p><a href="https://doi.org/10.4097/kjae.2012.62.4.309" target="_blank" rel="noreferrer">Kim et al. 2012, Table 1: reproduced equations.</a> <a href="https://doi.org/10.4097/kjae.2017.70.6.606" target="_blank" rel="noreferrer">Park et al. 2017, Table 1: volumes and clearances.</a></p><h3>Marsh + ke0 0.26</h3><p>Weight-scaled adult PK set. Marsh’s 1991 paper evaluated an adult model in 20 children and a revised pediatric fit in another 10; this application implements the adult parameter set, not the pediatric revision. Only weight is mathematically used. Weight scaling alone does not validate pediatric or obesity extrapolation.</p><p><a href="https://doi.org/10.1093/bja/67.1.41" target="_blank" rel="noreferrer">Marsh, White, Morton & Kenny. BJA 1991;67:41–48.</a> <a href="https://doi.org/10.1248/bpb.b12-01093" target="_blank" rel="noreferrer">Wu et al. 2013, Table 1: implemented microconstants.</a></p><p><a href="https://doi.org/10.1093/bja/aeq028" target="_blank" rel="noreferrer">Coppens et al. BJA 2010;104:452–458: studied Marsh + ke0 0.26 pairing.</a> This added effect-site constant is not an original Marsh PD estimate. Published variants use other ke0 values; predictions are variant-specific.</p><h3>Eleveld · 2018</h3><p>A three-compartment arterial population model with a virtual effect site. The source population comprised 1033 individuals, from 27 weeks PMA to 88 years and 0.68–160 kg. These ranges do not establish support for every combination of covariates.</p><a href="https://doi.org/10.1016/j.bja.2018.01.018" target="_blank" rel="noreferrer">Eleveld, Colin, Absalom & Struys. British Journal of Anaesthesia 120:942–959.</a><p><a href="https://doi.org/10.1016/j.bja.2018.05.045" target="_blank" rel="noreferrer">2018 corrigendum: reference Q2 corrected to 1.83 L/min.</a></p><p>Fat-free mass uses the Al-Sallami equation reproduced on p.946 of the Eleveld paper. <a href="https://doi.org/10.1007/s40262-015-0277-z" target="_blank" rel="noreferrer">Al-Sallami et al., Clinical Pharmacokinetics, 2015.</a></p><h3>Verification & limitations</h3><p>The engine passes reference-patient, mass-balance, nonnegativity, analytical equilibrium, timestep-convergence and independent matrix-exponential checks. Numerical verification is not clinical validation.</p><ul><li>Independent comparison against Eleveld supplementary NONMEM S2 remains outstanding.</li><li>Schnider PK coefficients were verified in primary research reproductions; the original Table 2 image and independent patient-output replay remain additional audit items. Marsh uses the complete adult microconstants reproduced by Wu et al. (2013).</li><li>The year-to-week convention is explicit but awaits supplementary-source verification.</li><li>Observed BIS supports manual entry, pasted pairs and local CSV import, without altering PK or administration. Printed Eleveld BIS equations have unresolved inconsistencies pending verification against original supplementary NONMEM S4. Model-predicted BIS is explicitly unavailable; no assumed curve is used.</li><li>Targeting uses a documented educational finite-pulse predictor with 10-second control intervals. It is not a commercial-device algorithm. Comparison runs the same patient and target sequence through each model independently; unsupported models are explicitly unavailable.</li><li>No pump connectivity, observed-data adaptation or clinical recommendations.</li></ul></dialog>
  </>;
}
