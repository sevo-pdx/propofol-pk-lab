import {eleveld} from './eleveld';
import {schnider} from './schnider';
import {marsh} from './marsh';
export const models={eleveld,schnider,marsh};
export type ModelKey=keyof typeof models;
/** Published model explanations; source IDs resolve in references/REFERENCES.md. */
export const modelDetails={
 eleveld:{label:'Eleveld',year:'2018',covariates:'Age, weight, height and sex change the model parameters. Concomitant drugs modify clearance and slow-compartment volume.',
 formula:'V1 = 6.28 × central factor. V2 = 25.5 × weight ratio × age factor. V3 = 273 × FFM ratio × drug factor. CL = sex coefficient × weight ratio^0.75 × maturation ratio × drug factor. Q2 = 1.75 × (V2/25.5)^0.75 × [1 + 1.30 × (1 − Q3 maturation)]. Q3 = 1.11 × (V3/273)^0.75 × Q3 maturation / reference maturation. ke0 = 0.146 × weight ratio^−0.25. E2018 pp.948–952.',
 classification:'Covariate-adjusted population estimates; arterial parameters. Random effects fixed to zero.'},
 schnider:{label:'Schnider',year:'1998 / 1999',covariates:'Age changes V2 and Q2. Weight, height and sex (through James lean body mass) change clearance. V1, V3, Q3 and ke0 are fixed.',
 formula:'James LBM (kg): male 1.1 × weight − 128 × (weight/height)²; female 1.07 × weight − 148 × (weight/height)² (kg, cm). V1 = 4.27 L; V2 = 18.9 − 0.391 × (age − 53) L; V3 = 238 L. CL = 1.89 + 0.0456 × (weight − 77) − 0.0681 × (LBM − 59) + 0.0264 × (height − 177) L/min. Q2 = 1.29 − 0.024 × (age − 53) L/min; Q3 = 0.836 L/min. ke0 = 0.456 min⁻¹. S1998 Methods/Table 2; K2012 Table 1; P2017 Table 1; S1999 Results.',
 classification:'Constants: V1, V3, Q3, ke0. Covariate-adjusted: V2, Q2, CL. Derived: all five microconstants. Population random effects are zero.'},
 marsh:{label:'Marsh',year:'+ ke0 0.26',covariates:'Only total body weight changes the adult Marsh PK parameters. Age, sex, height, PMA and concomitant drugs are not used. Ce uses an explicitly added ke0 of 0.26 min⁻¹.',
 formula:'V1 = 0.228 × weight L. Fixed microconstants (/min): k10 = 0.119, k12 = 0.112, k21 = 0.055, k13 = 0.0419, k31 = 0.0033. CL = V1 × k10; Q2 = V1 × k12; Q3 = V1 × k13; V2 = Q2/k21; V3 = Q3/k31. Derivation preserves published microconstants rather than rounding peripheral volumes. W2013 Table 1. Added ke0 = 0.26 min⁻¹: C2010 Methods.',
 classification:'Weight-scaled V1. Fixed five microconstants. Derived V2, V3, CL, Q2, Q3. Added fixed ke0 0.26; not an original Marsh PD estimate.'}
};
