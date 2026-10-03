import type { ModelEvaluation, PKModel } from './types';
import { positive, quantity as u } from './units';
export const marsh:PKModel={
  id:'marsh-adult-ke0-026',name:'Marsh + ke0 0.26',referenceIds:['M1991','W2013','C2010'],
  evaluate(p):ModelEvaluation {
    positive(p.weight,'Weight');
    // W2013 Table 1: adult Marsh parameterization (also K2012 Table 1).
    const v1=0.228*p.weight; // L/kg × kg.
    const k10=0.119,k12=0.112,k21=0.055,k13=0.0419,k31=0.0033; // /min, W2013 Table 1.
    const cl=v1*k10,q2=v1*k12,q3=v1*k13;
    const v2=q2/k21,v3=q3/k31; // Derived to preserve the exact published microconstants, not rounded V/kg approximations.
    const ke0=0.26; // C2010 Methods Group M: Marsh PK paired with this effect-site extension; not estimated in M1991.
    return {parameters:{v1:u(v1,'L'),v2:u(v2,'L'),v3:u(v3,'L'),cl:u(cl,'L/min'),q2:u(q2,'L/min'),q3:u(q3,'L/min'),ke0:u(ke0,'1/min')},
      derived:{}, factors:{'Total body weight (kg)':p.weight},
      notes:['Adult Marsh PK parameterization: only total body weight affects its parameters. All volumes and clearances scale linearly with weight; microconstants are fixed.',
        'Ce uses the explicitly added fixed ke0 0.26 min⁻¹ pairing studied by Coppens et al. (2010). Other Marsh effect-site variants exist; they are not interchangeable.',
        'This is the adult parameter set discussed in the 1991 pediatric study, not its revised pediatric fit. Weight scaling does not establish pediatric or obesity validity.']};
  }
};
