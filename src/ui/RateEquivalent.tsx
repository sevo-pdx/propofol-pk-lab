import { quantity, rateMcgPerKg, type Kg } from '../models/units';
export function RateEquivalent({rate,weight}:{rate:number;weight:Kg}) {
  if(!Number.isFinite(rate)||rate<0)return null;
  const value=rateMcgPerKg(quantity(rate,'mg/min'),weight);
  return <span className="rate-equivalent" title={`mg/min × 1,000 ÷ ${weight} kg (applied total body weight)`}>≈ {value>0&&value<0.1?value.toPrecision(2):value.toFixed(1)} mcg/kg/min</span>;
}
