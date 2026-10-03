export type BISMode='none'|'predicted'|'observed';
export interface BISObservation {time:number;bis:number;source:'manual'|'paste'|'csv'}
// Data-validation bounds, not clinical alarm thresholds. BIS uses a 0–100 index.
export function validateBIS(rows:readonly BISObservation[],end=60):BISObservation[]{
 if(rows.length>10000)throw new Error('Use at most 10,000 BIS observations.'); // Browser resource policy.
 const sorted=rows.map(row=>({...row})).sort((a,b)=>a.time-b.time);
 for(let i=0;i<sorted.length;i++){
  const row=sorted[i]!;
  if(!Number.isFinite(row.time)||row.time<0||row.time>end)throw new Error(`BIS time must be between 0 and ${end} elapsed minutes.`);
  if(!Number.isFinite(row.bis)||row.bis<0||row.bis>100)throw new Error('BIS must be a number from 0 to 100.');
  if(i&&Math.abs(row.time-sorted[i-1]!.time)<1e-8)throw new Error('Duplicate BIS timestamps: delete the existing point or change the imported time.');
 }
 return sorted;
}
export function parseElapsed(value:string):number{
 const text=value.trim();
 if(/^\d+(?:\.\d+)?$/.test(text))return Number(text);
 const match=/^(\d+):([0-5]\d(?:\.\d+)?)$/.exec(text);
 if(match)return Number(match[1])+Number(match[2])/60; // Exact seconds-to-minutes conversion.
 throw new Error('Time must be elapsed minutes or mm:ss (for example 4.5 or 04:30).');
}
export function parseBIS(text:string,source:'paste'|'csv',end=60):BISObservation[]{
 if(text.length>1_000_000)throw new Error('BIS input exceeds the 1 MB text limit.'); // Resource policy.
 const lines=text.replace(/^\uFEFF/,'').split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
 if(!lines.length)throw new Error('Enter timestamp/BIS pairs first.');
 const rows:BISObservation[]=[];
 lines.forEach((line,i)=>{
  // Narrow, documented two-column CSV/TSV format. Quoted numeric cells allowed;
  // no embedded delimiters/newlines or extra patient-identity columns accepted.
  const cells=line.split(/[,;\t]/).map(s=>s.trim().replace(/^"([^"\r\n]*)"$/,'$1'));
  if(cells.length!==2)throw new Error(`Line ${i+1}: expected exactly two columns: time_min,bis.`);
  if(i===0&&/^(time|time_min|timestamp)$/i.test(cells[0]!)&&/^bis$/i.test(cells[1]!))return;
  if(!/^\d+(?:\.\d+)?$/.test(cells[1]!))throw new Error(`Line ${i+1}: BIS must be numeric.`);
  try{rows.push({time:parseElapsed(cells[0]!),bis:Number(cells[1]),source});}
  catch(e){throw new Error(`Line ${i+1}: ${e instanceof Error?e.message:'Invalid time'}`);}
 });
 if(!rows.length)throw new Error('No BIS observations were found.');
 return validateBIS(rows,end);
}
/** Last known observation, not interpolation or an assertion of BIS at time. */
export function lastObservedBIS(rows:readonly BISObservation[],time:number){
 return rows.filter(r=>r.time<=time).reduce<BISObservation|undefined>((last,row)=>!last||row.time>last.time?row:last,undefined);
}
