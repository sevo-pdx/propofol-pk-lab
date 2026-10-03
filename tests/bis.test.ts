import {describe,it,expect} from 'vitest';
import {parseBIS,parseElapsed,validateBIS,lastObservedBIS} from '../src/observations/bis';
import {predictedBISAvailability} from '../src/models/bisAvailability';
describe('Observed BIS data (independent of PK)',()=>{
 it('parses BOM, header, quoted values, sorts and preserves provenance',()=>{
  expect(parseBIS('\uFEFFtime_min,bis\r\n"04:30","52"\r\n0,96','csv')).toEqual([{time:0,bis:96,source:'csv'},{time:4.5,bis:52,source:'csv'}]);
 });
 it('accepts tab/semicolon pairs and fractional seconds',()=>{
  expect(parseBIS('0;100\n01:30.5\t40','paste')[1]!.time).toBeCloseTo(1+30.5/60,12);
 });
 it.each(['','time_min,bis','0,','0,NaN','0,Infinity','0,101','61,50','-1,50','01:60,50','0,50,identifier','0,50\n0,51','0,50\n2,no'])('rejects invalid whole import %s',text=>expect(()=>parseBIS(text,'csv')).toThrow());
 it('rejects nonfinite and out-of-range numeric observations',()=>{
  for(const [time,bis] of [[NaN,50],[Infinity,50],[0,NaN],[0,-1],[0,101],[-1,50]])expect(()=>validateBIS([{time:time!,bis:bis!,source:'manual'}])).toThrow();
 });
 it('accepts index and time boundaries',()=>expect(parseBIS('0,0\n60,100','csv')).toHaveLength(2));
 it('validates append atomically and never mutates existing data',()=>{
  const original=parseBIS('0,95\n5,50','csv');const snapshot=structuredClone(original);
  expect(()=>validateBIS([...original,...parseBIS('7,45\n5,55','paste')])).toThrow(/Duplicate/);expect(original).toEqual(snapshot);
 });
 it('does not interpolate or disclose future observations at the playhead',()=>{
  const rows=parseBIS('2,90\n5,50','csv');expect(lastObservedBIS(rows,1)).toBeUndefined();expect(lastObservedBIS(rows,4)?.bis).toBe(90);expect(lastObservedBIS(rows,5)?.bis).toBe(50);
 });
 it('enforces browser resource limits',()=>{expect(()=>parseBIS(' '.repeat(1_000_001),'csv')).toThrow();expect(()=>validateBIS(Array.from({length:10001},(_,time)=>({time,bis:50,source:'manual' as const})))).toThrow();});
 it('uses exact time conversion',()=>expect(parseElapsed('04:30')).toBe(4.5));
 it('gates all unverified predicted BIS relationships',()=>{for(const model of ['eleveld','schnider','marsh'] as const){expect(predictedBISAvailability(model).available).toBe(false);expect(predictedBISAvailability(model).reason.length).toBeGreaterThan(30);}});
});
