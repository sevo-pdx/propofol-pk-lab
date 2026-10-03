import { expect, test } from 'vitest';
import { quantity as u, rateMcgPerKg } from '../src/models/units';
test('mg/min to mcg/kg/min includes the exact 1000-fold SI conversion',()=>{
 expect(rateMcgPerKg(u(7,'mg/min'),u(70,'kg'))).toBe(100);
 expect(rateMcgPerKg(u(5,'mg/min'),u(100,'kg'))).toBe(50);
 expect(rateMcgPerKg(u(0,'mg/min'),u(70,'kg'))).toBe(0);
 expect(rateMcgPerKg(u(5,'mg/min'),u(70,'kg'))).toBeCloseTo(71.4285714286,9);
});
test('conversion scales with applied total weight and rejects invalid values',()=>{
 expect(rateMcgPerKg(u(7,'mg/min'),u(140,'kg'))).toBe(50);
 expect(()=>rateMcgPerKg(u(5,'mg/min'),u(0,'kg'))).toThrow();
 expect(()=>rateMcgPerKg(-1 as ReturnType<typeof u<'mg/min'>>,u(70,'kg'))).toThrow();
});
