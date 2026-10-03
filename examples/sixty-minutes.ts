import { writeFileSync } from 'node:fs';
import { EDUCATIONAL_NOTICE, concentrations, eleveld, quantity as u, simulate } from '../src/index';
const patient = { age: u(35, 'yr'), sex: 'male' as const, height: u(170, 'cm'), weight: u(70, 'kg'), concomitantAnaesthetics: false };
const evaluation = eleveld.evaluate(patient);
// Arbitrary mathematical excitation, NOT literature-derived administration or recommendation.
const events = [{ time: u(0, 'min'), rate: u(5, 'mg/min') }, { time: u(30, 'min'), rate: u(0, 'mg/min') }];
const rows = simulate(evaluation.parameters, events, u(60, 'min'));
const records = rows.map(s => ({ time_min: s.time, cp_mcg_mL: concentrations(s, evaluation.parameters).cp,
  ce_mcg_mL: s.ce, a1_mg: s.a1, a2_mg: s.a2, a3_mg: s.a3,
  simulated_rate_mg_min: s.time < 30 ? 5 : 0,
  administered_mg: s.administered, eliminated_mg: s.eliminated,
  mass_balance_error_mg: s.a1 + s.a2 + s.a3 + s.eliminated - s.administered }));
console.log(EDUCATIONAL_NOTICE);
console.log('Hypothetical mathematical input: 5 mg/min for 30 simulated minutes, then zero for 30 minutes. No TCI controller yet.');
console.log('Patient covariates:', patient);
console.log('Model parameters:', evaluation.parameters);
console.table(records.filter(r => r.time_min % 10 === 0).map(r => ({
  min: r.time_min, Cp: r.cp_mcg_mL.toFixed(6), Ce: r.ce_mcg_mL.toFixed(6),
  'Simulated mg/min': r.simulated_rate_mg_min, 'Administered mg': r.administered_mg.toFixed(6),
  'Remaining mg': (r.a1_mg + r.a2_mg + r.a3_mg).toFixed(6),
})));
const header = Object.keys(records[0]!);
writeFileSync(new URL('./sixty-minutes.csv', import.meta.url), header.join(',') + '\n' + records.map(r => Object.values(r).join(',')).join('\n') + '\n');
writeFileSync(new URL('./sixty-minutes.json', import.meta.url), JSON.stringify({ notice: EDUCATIONAL_NOTICE, patient, evaluation, events, records }, null, 2) + '\n');
console.log('Maximum mass balance error (mg):', Math.max(...records.map(r => Math.abs(r.mass_balance_error_mg))));
