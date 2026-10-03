import type { ModelEvaluation, PatientCovariates, PKModel } from './types';
import { positive, quantity as u } from './units';

/** James LBM, S1998 Methods / Influence of Subject Covariates.
 * Weight kg, height cm. Sex categories are those of the published equation. */
export function jamesLeanBodyMass(p: PatientCovariates): number {
  positive(p.weight,'Weight'); positive(p.height,'Height');
  if(!['male','female'].includes(p.sex))throw new RangeError('Unsupported model sex category');
  // S1998 Methods: male 1.1,128; female 1.07,148; squared weight/height.
  return p.sex==='male'?1.1*p.weight-128*(p.weight/p.height)**2:1.07*p.weight-148*(p.weight/p.height)**2;
}
export const schnider:PKModel={
  id:'schnider-1998-fixed-ke0',name:'Schnider · fixed ke0 0.456',referenceIds:['S1998','S1999','K2012','P2017'],
  evaluate(p):ModelEvaluation {
    u(p.age,'yr');
    // Application scope: adult experiments only (18 is a UI policy, not a fitted constant).
    if(p.age<18)throw new RangeError('Schnider is restricted to adult experiments (18+ years) in this simulator.');
    const lbm=jamesLeanBodyMass(p); positive(lbm,'James lean body mass');
    // S1998 Table 2, independently reproduced K2012 Table 1 and P2017 Table 1.
    const v1=4.27, v2=18.9-0.391*(p.age-53), v3=238;
    const cl=1.89+0.0456*(p.weight-77)-0.0681*(lbm-59)+0.0264*(p.height-177);
    const q2=1.29-0.024*(p.age-53), q3=0.836;
    const ke0=0.456; // S1999 Results: fixed plasma/effect equilibration /min, NOT fixed time-to-peak.
    for(const [key,value]of Object.entries({v1,v2,v3,cl,q2,q3}))positive(value,`Schnider ${key}`);
    const bmi=p.weight/(p.height/100)**2; // SI cm -> m, BMI definition.
    // Derivative of the published James quadratic; no empirical BMI cutoff added.
    const decliningLbm=p.sex==='male'?1.1-2*128*p.weight/p.height**2<=0:1.07-2*148*p.weight/p.height**2<=0;
    return {parameters:{v1:u(v1,'L'),v2:u(v2,'L'),v3:u(v3,'L'),cl:u(cl,'L/min'),q2:u(q2,'L/min'),q3:u(q3,'L/min'),ke0:u(ke0,'1/min')},
      derived:{bmi,leanBodyMassKg:lbm},
      factors:{'James LBM (kg)':lbm,'Age − 53 (yr)':p.age-53,'Weight − 77 (kg)':p.weight-77,'LBM − 59 (kg)':lbm-59,'Height − 177 (cm)':p.height-177},
      notes:['V1, V3, Q3 and ke0 are population constants; V2 and Q2 use age; CL uses weight, height and James LBM. Sex enters through LBM.',
        'Fixed ke0 0.456 min⁻¹ (Schnider 1999); no fixed-time-to-peak recalibration. Concomitant drugs and PMA are not covariates.',
        'Developed in 24 healthy adult volunteers; population parameters omit individual variability.',
        ...(p.age<26||p.age>81?['Age is outside the 26–81-year range reported in the 1998 PK abstract; this is extrapolation.']:[]), // S1998 abstract.
        ...(decliningLbm?['James LBM is on its declining branch at this height and weight. Clearance can increase paradoxically; no adjusted-weight substitution or clamping is applied.']:[])]};
  }
};
