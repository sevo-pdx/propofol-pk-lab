/** Canonical numerical units. mg/L and mcg/mL are numerically identical. */
declare const dimension: unique symbol;
export type Quantity<U extends string> = number & { readonly [dimension]: U };
export type Mg = Quantity<'mg'>;
export type Mcg = Quantity<'mcg'>;
export type Litres = Quantity<'L'>;
export type Millilitres = Quantity<'mL'>;
export type Minutes = Quantity<'min'>;
export type Kg = Quantity<'kg'>;
export type Cm = Quantity<'cm'>;
export type Years = Quantity<'yr'>;
export type Weeks = Quantity<'wk'>;
export type MgPerL = Quantity<'mg/L'>;
export type McgPerMl = Quantity<'mcg/mL'>;
export type MgPerMin = Quantity<'mg/min'>;
export type MgPerKgMin = Quantity<'mg/kg/min'>;
export type LPerMin = Quantity<'L/min'>;
export type PerMin = Quantity<'1/min'>;
export function quantity<U extends string>(value: number, unit: U): Quantity<U> {
  if (!Number.isFinite(value) || value < 0) throw new RangeError(`${unit} must be finite and nonnegative`);
  return value as Quantity<U>;
}
export function positive(value: number, label: string): void {
  if (!Number.isFinite(value) || value <= 0) throw new RangeError(`${label} must be finite and positive`);
}
// Exact SI prefix definitions, not pharmacological constants.
export const mgToMcg = (x: Mg): Mcg => quantity(x * 1000, 'mcg');
export const mcgToMg = (x: Mcg): Mg => quantity(x / 1000, 'mg');
export const litresToMl = (x: Litres): Millilitres => quantity(x * 1000, 'mL');
export const mgPerLToMcgPerMl = (x: MgPerL): McgPerMl => quantity(x, 'mcg/mL');
export const mcgPerMlToMgPerL = (x: McgPerMl): MgPerL => quantity(x, 'mg/L');
export function ratePerKg(rate: MgPerMin, weight: Kg): MgPerKgMin {
  positive(weight, 'Weight');
  return quantity(rate / weight, 'mg/kg/min');
}
export type McgPerKgMin = Quantity<'mcg/kg/min'>;
/** Exact SI prefix conversion, using the applied patient's total body weight. */
export function rateMcgPerKg(rate: MgPerMin, weight: Kg): McgPerKgMin {
  quantity(rate, 'mg/min');
  return quantity(ratePerKg(rate, weight) * 1000, 'mcg/kg/min');
}
